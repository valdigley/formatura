const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-signature, x-request-id",
};

import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req: Request) => {
  try {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    // Parse webhook payload
    const webhookData = await req.json();
    console.log('🔔 Webhook recebido:', JSON.stringify(webhookData, null, 2));

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Log webhook for debugging
    await supabase.from('webhook_logs').insert({
      event_type: 'mercadopago_webhook',
      payload: webhookData,
      status: 'received',
    });

    // Validate webhook structure according to MP docs
    if (!webhookData.data?.id) {
      console.error('❌ Webhook inválido: data.id não encontrado');
      return new Response(JSON.stringify({ error: 'Invalid webhook: missing data.id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract payment ID
    const paymentId = webhookData.data.id.toString();
    console.log('💳 Processando payment ID:', paymentId);

    // Only process payment events
    if (webhookData.type !== 'payment') {
      console.log('ℹ️ Evento ignorado, não é do tipo payment:', webhookData.type);
      return new Response(JSON.stringify({ message: 'Event ignored, not a payment' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get all MercadoPago configurations to find the right access token
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('user_id, settings')
      .not('settings->mercadopago->access_token', 'is', null);

    if (!userSettings || userSettings.length === 0) {
      console.error('❌ Nenhuma configuração do MercadoPago encontrada');
      return new Response(JSON.stringify({ error: 'No MercadoPago configurations found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let paymentDetails = null;
    let matchedUserId = null;

    // Try each access token until we find the payment
    for (const userSetting of userSettings) {
      const mpConfig = userSetting.settings?.mercadopago;
      if (!mpConfig?.access_token) continue;

      console.log(`🔍 Tentando buscar pagamento com access token do usuário: ${userSetting.user_id}`);
      
      try {
        const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${mpConfig.access_token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          paymentDetails = await response.json();
          matchedUserId = userSetting.user_id;
          console.log('✅ Pagamento encontrado:', {
            id: paymentDetails.id,
            status: paymentDetails.status,
            external_reference: paymentDetails.external_reference,
            amount: paymentDetails.transaction_amount,
            payer_email: paymentDetails.payer?.email
          });
          break;
        } else {
          console.log(`❌ Pagamento não encontrado com este access token (${response.status})`);
        }
      } catch (error) {
        console.error(`❌ Erro ao buscar pagamento:`, error);
      }
    }

    if (!paymentDetails) {
      console.error('❌ Pagamento não encontrado em nenhuma conta configurada');
      return new Response(JSON.stringify({ 
        error: 'Payment not found in any configured account',
        payment_id: paymentId 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find existing transaction in database
    let transaction = null;
    
    // Method 1: Search by external_reference
    if (paymentDetails.external_reference) {
      console.log('🔍 Buscando transação por external_reference:', paymentDetails.external_reference);
    }
    // Method 1: Search by mercadopago_payment_id (if already exists)
    console.log('🔍 Buscando transação por mercadopago_payment_id:', paymentId);
    const { data: transactionById } = await supabase
      .from('payment_transactions')
      .select('*, students(full_name, email, phone)')
      .eq('mercadopago_payment_id', paymentId)
      .single();
    
    if (transactionById) {
      transaction = transactionById;
      searchMethod = 'mercadopago_payment_id';
      console.log('✅ Transação encontrada por mercadopago_payment_id');
    } else {
      // Method 2: Search by external_reference
      if (paymentDetails.external_reference) {
        console.log('🔍 Buscando transação por external_reference:', paymentDetails.external_reference);
        
        const { data: transactionByRef } = await supabase
          .from('payment_transactions')
          .select('*, students(full_name, email, phone)')
          .eq('external_reference', paymentDetails.external_reference)
          .single();
        
        if (transactionByRef) {
          transaction = transactionByRef;
          searchMethod = 'external_reference';
          console.log('✅ Transação encontrada por external_reference');
        }
      }

      // Method 3: Search by payer email and amount (for older transactions)
      if (!transaction && paymentDetails.payer?.email) {
        console.log('🔍 Buscando transação por email e valor:', paymentDetails.payer.email, paymentDetails.transaction_amount);
        
        const { data: transactionByEmail } = await supabase
          .from('payment_transactions')
          .select('*, students(full_name, email, phone)')
          .eq('payer_email', paymentDetails.payer.email)
          .eq('amount', paymentDetails.transaction_amount.toString())
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        if (transactionByEmail) {
          transaction = transactionByEmail;
          searchMethod = 'email_amount';
          console.log('✅ Transação encontrada por email e valor');
        }
      }
    }

    if (!transaction) {
      console.error('❌ Transação não encontrada no banco de dados');
      console.log('🔍 Dados disponíveis para busca:', {
        external_reference: paymentDetails.external_reference,
        payer_email: paymentDetails.payer?.email,
        amount: paymentDetails.transaction_amount,
        preference_id: paymentDetails.additional_info?.external_reference
      });
      
      // Create new transaction if payment is approved and we have enough data
      if (paymentDetails.status === 'approved' && paymentDetails.payer?.email) {
        console.log('💡 Criando nova transação para pagamento aprovado');
        
        const { data: newTransaction, error: createError } = await supabase
          .from('payment_transactions')
          .insert([{
            user_id: matchedUserId,
            mercadopago_payment_id: paymentId,
            external_reference: paymentDetails.external_reference || `payment-${paymentId}`,
            amount: paymentDetails.transaction_amount,
            status: paymentDetails.status,
            payment_method: paymentDetails.payment_method_id || paymentDetails.payment_type_id,
            payment_date: paymentDetails.date_approved,
            payer_email: paymentDetails.payer.email,
            webhook_data: paymentDetails,
            metadata: {
              created_by_webhook: true,
              payment_id: paymentId
            }
          }])
          .select('*, students(full_name, email, phone)')
          .single();

        if (createError) {
          console.error('❌ Erro ao criar nova transação:', createError);
          return new Response(JSON.stringify({ error: 'Failed to create transaction', details: createError }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        transaction = newTransaction;
        console.log('✅ Nova transação criada:', transaction.id);
      } else {
        return new Response(JSON.stringify({ 
          error: 'Transaction not found and cannot create new one',
          payment_id: paymentId,
          status: paymentDetails.status,
          payer_email: paymentDetails.payer?.email
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Update transaction with payment details
    const updateData = {
      mercadopago_payment_id: paymentId,
      status: paymentDetails.status,
      payment_method: paymentDetails.payment_method_id || paymentDetails.payment_type_id,
      webhook_data: paymentDetails,
    };

    // Add payment date if approved
    if (paymentDetails.status === 'approved' && paymentDetails.date_approved) {
      updateData.payment_date = paymentDetails.date_approved;
    }

    console.log('📝 Atualizando transação:', transaction.id, 'com status:', paymentDetails.status);

    const { error: updateError } = await supabase
      .from('payment_transactions')
      .update(updateData)
      .eq('id', transaction.id);

    if (updateError) {
      console.error('❌ Erro ao atualizar transação:', updateError);
      return new Response(JSON.stringify({ error: 'Update failed', details: updateError }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('✅ Transação atualizada com sucesso');

    // Send WhatsApp confirmation if payment is approved
    if (paymentDetails.status === 'approved' && transaction.students) {
      console.log('📱 Enviando confirmação via WhatsApp para:', transaction.students.full_name);
      
      try {
        // Get WhatsApp config for the user
        const { data: userSetting } = await supabase
          .from('user_settings')
          .select('settings')
          .eq('user_id', matchedUserId)
          .single();

        const whatsappConfig = userSetting?.settings?.whatsapp;
        
        if (whatsappConfig?.is_connected && whatsappConfig?.api_url) {
          // Normalize phone number
          const normalizePhone = (phone: string) => {
            let clean = phone.replace(/\D/g, '');
            if (clean.startsWith('55')) {
              clean = clean.substring(2);
            }
            
            const variations = [];
            if (clean.length === 10) {
              const with9 = clean.substring(0, 2) + '9' + clean.substring(2);
              variations.push(`55${with9}`);
              variations.push(`55${clean}`);
            } else if (clean.length === 11) {
              variations.push(`55${clean}`);
              if (clean.charAt(2) === '9') {
                const without9 = clean.substring(0, 2) + clean.substring(3);
                variations.push(`55${without9}`);
              }
            }
            
            return [...new Set(variations)];
          };
          
          const phoneVariations = normalizePhone(transaction.students.phone);
          
          const confirmationMessage = `🎉 *PAGAMENTO CONFIRMADO!* 🎉

Olá ${transaction.students.full_name}!

✅ Confirmamos o recebimento do seu pagamento!

📋 *DETALHES:*
• Valor: R$ ${Number(paymentDetails.transaction_amount).toLocaleString('pt-BR')}
• Método: ${paymentDetails.payment_method_id === 'pix' ? 'PIX' :
           paymentDetails.payment_method_id === 'credit_card' ? 'Cartão de Crédito' :
           paymentDetails.payment_method_id === 'debit_card' ? 'Cartão de Débito' :
           paymentDetails.payment_method_id || 'Cartão'}
• Data: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}
• ID da Transação: ${paymentId}

📸 *SUA SESSÃO FOTOGRÁFICA ESTÁ CONFIRMADA!*

🗓️ *PRÓXIMOS PASSOS:*
• Aguarde contato para confirmar data e horário
• Prepare-se para o grande dia da formatura
• Em caso de dúvidas, estamos à disposição

Obrigado pela confiança! Mal podemos esperar para capturar seus melhores momentos! 📷✨`;

          // Try to send to each phone variation
          let messageSent = false;
          for (const phoneNumber of phoneVariations) {
            try {
              console.log(`📱 Tentando enviar confirmação para: ${phoneNumber}`);
              
              const response = await fetch(`${whatsappConfig.api_url}/message/sendText/${whatsappConfig.instance_name}`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'apikey': whatsappConfig.api_key,
                },
                body: JSON.stringify({
                  number: `${phoneNumber}@s.whatsapp.net`,
                  text: confirmationMessage,
                }),
              });

              if (response.ok) {
                console.log(`✅ Confirmação enviada via WhatsApp para: ${phoneNumber}`);
                messageSent = true;
                break;
              } else {
                console.log(`❌ Falha ao enviar para ${phoneNumber}`);
              }
            } catch (error) {
              console.error(`❌ Erro ao enviar WhatsApp para ${phoneNumber}:`, error);
            }
          }
          
          if (!messageSent) {
            console.log('⚠️ Não foi possível enviar confirmação via WhatsApp');
          }
        } else {
          console.log('⚠️ WhatsApp não configurado, pulando notificação');
        }
      } catch (whatsappError) {
        console.error('❌ Erro no envio do WhatsApp:', whatsappError);
      }
    }

    // Log successful processing
    await supabase.from('webhook_logs').insert({
      event_type: 'mercadopago_webhook',
      payload: webhookData,
      response: {
        transaction_id: transaction.id,
        payment_id: paymentId,
        status: paymentDetails.status,
        updated: true
      },
      status: 'success',
    });

    console.log('🎉 Webhook processado com sucesso!');

    return new Response(JSON.stringify({ 
      success: true, 
      payment_id: paymentId,
      transaction_id: transaction.id,
      status: paymentDetails.status,
      message: 'Payment processed successfully'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Erro no webhook:', error);
    
    // Log error
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );
      
      const requestBody = await req.text();
      
      await supabase.from('webhook_logs').insert({
        event_type: 'mercadopago_webhook',
        payload: { error: 'Failed to parse', raw: requestBody },
        response: { error: error.message },
        status: 'failed',
      });
    } catch (logError) {
      console.error('❌ Falha ao registrar erro:', logError);
    }

    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});