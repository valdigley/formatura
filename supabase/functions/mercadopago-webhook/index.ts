const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-signature, x-request-id",
};

import { createClient } from 'npm:@supabase/supabase-js@2';

// Função para buscar detalhes do pagamento no Mercado Pago
async function fetchPaymentDetails(paymentId: string, accessToken: string) {
  try {
    console.log(`🔍 Buscando detalhes do pagamento ${paymentId}`);
    
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Detalhes do pagamento encontrados:`, {
        id: data.id,
        status: data.status,
        external_reference: data.external_reference,
        preference_id: data.additional_info?.external_reference || data.external_reference
      });
      return data;
    } else {
      console.error(`❌ Erro ao buscar pagamento ${paymentId}:`, response.status);
      return null;
    }
  } catch (error) {
    console.error(`❌ Erro ao buscar pagamento ${paymentId}:`, error);
    return null;
  }
}

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

    // Validate webhook structure
    if (!webhookData.data?.id) {
      console.error('❌ Webhook inválido: ID do pagamento não encontrado');
      return new Response(JSON.stringify({ error: 'Invalid webhook data' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const paymentId = webhookData.data.id.toString();
    console.log('💳 Processando payment ID:', paymentId);

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Log webhook for debugging
    await supabase.from('webhook_logs').insert({
      event_type: 'mercadopago_payment',
      payload: webhookData,
      status: 'success',
    });

    // Get all MercadoPago configurations
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('user_id, settings')
      .not('settings->mercadopago->access_token', 'is', null);

    if (!userSettings || userSettings.length === 0) {
      console.error('❌ Nenhuma configuração do MercadoPago encontrada');
      return new Response(JSON.stringify({ error: 'No configurations found' }), {
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

      console.log(`🔍 Tentando access token do usuário: ${userSetting.user_id}`);
      
      paymentDetails = await fetchPaymentDetails(paymentId, mpConfig.access_token);
      if (paymentDetails) {
        matchedUserId = userSetting.user_id;
        console.log('✅ Pagamento encontrado com este access token');
        break;
      }
    }

    if (!paymentDetails) {
      console.error('❌ Pagamento não encontrado em nenhuma conta');
      return new Response(JSON.stringify({ error: 'Payment not found in any account' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('💰 Detalhes do pagamento:', {
      id: paymentDetails.id,
      status: paymentDetails.status,
      amount: paymentDetails.transaction_amount,
      external_reference: paymentDetails.external_reference,
      payer_email: paymentDetails.payer?.email
    });

    // Find transaction by multiple methods
    let transaction = null;
    
    // Method 1: Try by external_reference
    if (paymentDetails.external_reference) {
      console.log('🔍 Buscando por external_reference:', paymentDetails.external_reference);
      
      const { data: transactionByRef } = await supabase
        .from('payment_transactions')
        .select('*, students(full_name, email, phone)')
        .eq('external_reference', paymentDetails.external_reference)
        .single();
      
      if (transactionByRef) {
        transaction = transactionByRef;
        console.log('✅ Transação encontrada por external_reference');
      }
    }

    // Method 2: Try by preference_id (if external_reference didn't work)
    if (!transaction) {
      // Extract preference ID from external_reference or other fields
      const preferenceId = paymentDetails.external_reference;
      
      if (preferenceId) {
        console.log('🔍 Buscando por preference_id:', preferenceId);
        
        const { data: transactionByPref } = await supabase
          .from('payment_transactions')
          .select('*, students(full_name, email, phone)')
          .eq('preference_id', preferenceId)
          .single();
        
        if (transactionByPref) {
          transaction = transactionByPref;
          console.log('✅ Transação encontrada por preference_id');
        }
      }
    }

    // Method 3: Try by amount and payer email (last resort)
    if (!transaction && paymentDetails.payer?.email) {
      console.log('🔍 Buscando por email e valor:', paymentDetails.payer.email, paymentDetails.transaction_amount);
      
      const { data: transactionByEmail } = await supabase
        .from('payment_transactions')
        .select('*, students(full_name, email, phone)')
        .eq('payer_email', paymentDetails.payer.email)
        .eq('amount', paymentDetails.transaction_amount)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (transactionByEmail) {
        transaction = transactionByEmail;
        console.log('✅ Transação encontrada por email e valor');
      }
    }

    if (!transaction) {
      console.error('❌ Transação não encontrada no banco de dados');
      console.log('🔍 Dados para busca:', {
        external_reference: paymentDetails.external_reference,
        payer_email: paymentDetails.payer?.email,
        amount: paymentDetails.transaction_amount
      });
      
      return new Response(JSON.stringify({ 
        error: 'Transaction not found',
        payment_id: paymentId,
        external_reference: paymentDetails.external_reference,
        payer_email: paymentDetails.payer?.email
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('📋 Transação encontrada:', transaction.id);

    // Update transaction with payment details
    const updateData = {
      mercadopago_payment_id: paymentId,
      status: paymentDetails.status,
      payment_method: paymentDetails.payment_method_id || paymentDetails.payment_type_id,
      payer_email: paymentDetails.payer?.email || transaction.payer_email,
      webhook_data: paymentDetails,
    };

    // Add payment date if approved
    if (paymentDetails.status === 'approved' && paymentDetails.date_approved) {
      updateData.payment_date = paymentDetails.date_approved;
    }

    console.log('📝 Atualizando transação com:', updateData);

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
      console.log('📱 Enviando confirmação via WhatsApp...');
      
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
            }
            
            return variations;
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
          for (const phoneNumber of phoneVariations) {
            try {
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
                break;
              }
            } catch (error) {
              console.error(`❌ Erro ao enviar WhatsApp para ${phoneNumber}:`, error);
            }
          }
        } else {
          console.log('⚠️ WhatsApp não configurado, pulando notificação');
        }
      } catch (whatsappError) {
        console.error('❌ Erro no envio do WhatsApp:', whatsappError);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      payment_id: paymentId,
      transaction_id: transaction.id,
      status: paymentDetails.status
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
        event_type: 'mercadopago_payment',
        payload: { error: 'Failed to parse', raw: requestBody },
        response: { error: error.message },
        status: 'failed',
      });
    } catch (logError) {
      console.error('❌ Falha ao registrar erro:', logError);
    }

    return new Response(JSON.stringify({ error: 'Internal server error', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});