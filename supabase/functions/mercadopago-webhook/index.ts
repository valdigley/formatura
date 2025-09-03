const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

import { createClient } from 'npm:@supabase/supabase-js@2';

// Function to fetch payment details from MercadoPago API
async function fetchPaymentDetails(paymentId: string, accessToken: string) {
  try {
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      return await response.json();
    } else {
      console.error(`Error fetching payment ${paymentId}:`, response.status);
      return null;
    }
  } catch (error) {
    console.error(`Error fetching payment ${paymentId}:`, error);
    return null;
  }
}

// Function to send WhatsApp confirmation message
async function sendPaymentConfirmation(studentData: any, paymentData: any, whatsappConfig: any) {
  try {
    const cleanPhone = studentData.phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.length === 11 ? `55${cleanPhone}` : cleanPhone;

    const confirmationMessage = `🎉 *PAGAMENTO CONFIRMADO!* 🎉

Olá ${studentData.full_name}!

✅ Confirmamos o recebimento do seu pagamento!

📋 *DETALHES:*
• Valor: R$ ${Number(paymentData.amount).toLocaleString('pt-BR')}
• Método: ${paymentData.payment_method === 'pix' ? 'PIX' : 
           paymentData.payment_method === 'credit_card' ? 'Cartão de Crédito' :
           paymentData.payment_method === 'debit_card' ? 'Cartão de Débito' :
           paymentData.payment_method}
• Data: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}
• ID da Transação: ${paymentData.mercadopago_payment_id}

📸 *SUA SESSÃO FOTOGRÁFICA ESTÁ CONFIRMADA!*

🗓️ *PRÓXIMOS PASSOS:*
• Aguarde contato para confirmar data e horário
• Prepare-se para o grande dia da formatura
• Em caso de dúvidas, estamos à disposição

Obrigado pela confiança! Mal podemos esperar para capturar seus momentos especiais! 📷✨

Atenciosamente,
Equipe Fotográfica`;

    const response = await fetch(`${whatsappConfig.api_url}/message/sendText/${whatsappConfig.instance_name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': whatsappConfig.api_key,
      },
      body: JSON.stringify({
        number: `${formattedPhone}@s.whatsapp.net`,
        text: confirmationMessage,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Error sending payment confirmation:', error);
    return false;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log('=== WEBHOOK MERCADO PAGO RECEBIDO ===');
    console.log('Method:', req.method);
    console.log('URL:', req.url);

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Método não permitido' }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const body = await req.json();
    console.log('Webhook payload:', JSON.stringify(body, null, 2));

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Log all webhooks for debugging
    const { error: logError } = await supabase
      .from('webhook_logs')
      .insert([{
        event_type: body.action || body.type || 'unknown',
        payload: body,
        status: 'success'
      }]);
    
    if (logError) {
      console.error('Error logging webhook:', logError);
    }

    // Handle different webhook types
    if (body.type === 'payment' || body.action === 'payment.updated' || body.action === 'payment.created') {
      const paymentId = body.data?.id || body.id;
      const action = body.action || body.type;

      console.log('=== PROCESSING PAYMENT WEBHOOK ===');
      console.log('Payment ID:', paymentId);
      console.log('Action:', action);
      console.log('Full webhook data:', JSON.stringify(body, null, 2));

      if (!paymentId) {
        console.log('No payment ID found in webhook');
        return new Response(
          JSON.stringify({ success: true, message: 'No payment ID to process' }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      // Get MercadoPago access token from any user (we'll find the right one later)
      console.log('=== FETCHING PAYMENT DETAILS FROM MERCADOPAGO API ===');
      
      // First, try to find existing transaction to get the access token
      let accessToken = null;
      let paymentTransaction = null;
      
      // Try to find existing transaction by mercadopago_payment_id
      const { data: existingByMpId } = await supabase
        .from('payment_transactions')
        .select('*, students(user_id, full_name, phone, email)')
        .eq('mercadopago_payment_id', paymentId.toString())
        .single();

      if (existingByMpId) {
        paymentTransaction = existingByMpId;
        console.log('✅ Found transaction by mercadopago_payment_id:', paymentTransaction.id);
        
        // Get access token for this user
        const { data: settings } = await supabase
          .from('user_settings')
          .select('settings')
          .eq('user_id', paymentTransaction.students.user_id)
          .single();
        
        accessToken = settings?.settings?.mercadopago?.access_token;
      }
      
      // If no transaction found, try to get access token from any configured user
      if (!accessToken) {
        console.log('No existing transaction found, trying to get access token from any user');
        const { data: allSettings } = await supabase
          .from('user_settings')
          .select('user_id, settings')
          .not('settings->mercadopago->access_token', 'is', null)
          .limit(1)
          .single();
        
        if (allSettings?.settings?.mercadopago?.access_token) {
          accessToken = allSettings.settings.mercadopago.access_token;
          console.log('Found access token from user:', allSettings.user_id);
        }
      }
      
      if (!accessToken) {
        console.error('No MercadoPago access token found');
        return new Response(
          JSON.stringify({ error: 'No MercadoPago access token configured' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      // Fetch payment details from MercadoPago API
      const paymentDetails = await fetchPaymentDetails(paymentId.toString(), accessToken);
      
      if (!paymentDetails) {
        console.error('Failed to fetch payment details from MercadoPago API');
        return new Response(
          JSON.stringify({ error: 'Failed to fetch payment details' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      console.log('Payment details from MercadoPago API:', {
        id: paymentDetails.id,
        status: paymentDetails.status,
        external_reference: paymentDetails.external_reference,
        amount: paymentDetails.transaction_amount,
        preference_id: paymentDetails.preference_id,
        payment_method: paymentDetails.payment_method_id,
        payer_email: paymentDetails.payer?.email
      });

      // If we don't have a transaction yet, try to find it by preference_id or external_reference
      if (!paymentTransaction) {
        console.log('=== SEARCHING FOR TRANSACTION ===');
        
        // Try to find by preference_id first (most reliable)
        if (paymentDetails.preference_id) {
          console.log('Searching by preference_id:', paymentDetails.preference_id);
          const { data: existingByPref } = await supabase
            .from('payment_transactions')
            .select('*, students(user_id, full_name, phone, email)')
            .eq('preference_id', paymentDetails.preference_id)
            .single();

          if (existingByPref) {
            paymentTransaction = existingByPref;
            console.log('✅ Found transaction by preference_id:', paymentTransaction.id);
          }
        }
        
        // If not found, try by external_reference
        if (!paymentTransaction && paymentDetails.external_reference) {
          console.log('Searching by external_reference:', paymentDetails.external_reference);
          const { data: existingByRef } = await supabase
            .from('payment_transactions')
            .select('*, students(user_id, full_name, phone, email)')
            .eq('external_reference', paymentDetails.external_reference)
            .single();

          if (existingByRef) {
            paymentTransaction = existingByRef;
            console.log('✅ Found transaction by external_reference:', paymentTransaction.id);
          }
        }
      }
      
      if (!paymentTransaction) {
        console.log('❌ No transaction found for payment:', {
          payment_id: paymentId,
          preference_id: paymentDetails.preference_id,
          external_reference: paymentDetails.external_reference
        });
        
        // Log for manual investigation
        await supabase
          .from('webhook_logs')
          .insert([{
            event_type: `orphan_payment_${action}`,
            payload: { ...body, payment_details: paymentDetails },
            response: { 
              error: 'Payment transaction not found', 
              payment_id: paymentId,
              preference_id: paymentDetails.preference_id,
              external_reference: paymentDetails.external_reference,
              amount: paymentDetails.transaction_amount,
              status: paymentDetails.status,
              payer_email: paymentDetails.payer?.email
            },
            status: 'failed'
          }]);
          
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Payment transaction not found',
            payment_id: paymentId,
            preference_id: paymentDetails.preference_id,
            external_reference: paymentDetails.external_reference
          }),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      // Update the transaction
      console.log('=== UPDATING TRANSACTION ===');
      console.log('Transaction ID:', paymentTransaction.id);
      console.log('Current status:', paymentTransaction.status);
      console.log('New status:', paymentDetails.status);
      
      const wasNotApproved = paymentTransaction.status !== 'approved';
      const isNowApproved = paymentDetails.status === 'approved';
      
      const updateData = {
        mercadopago_payment_id: paymentId.toString(),
        status: paymentDetails.status || paymentTransaction.status,
        payment_method: paymentDetails.payment_method_id || paymentDetails.payment_method || paymentTransaction.payment_method,
        amount: paymentDetails.transaction_amount || paymentDetails.amount || paymentTransaction.amount,
        payment_date: paymentDetails.date_approved ? new Date(paymentDetails.date_approved).toISOString() : null,
        payer_email: paymentDetails.payer?.email || paymentTransaction.payer_email,
        webhook_data: paymentDetails,
        metadata: {
          ...paymentTransaction.metadata,
          currency: paymentDetails.currency_id,
          installments: paymentDetails.installments,
          payment_type: paymentDetails.payment_type_id,
          transaction_details: paymentDetails.transaction_details,
          date_approved: paymentDetails.date_approved,
          date_created: paymentDetails.date_created,
          last_webhook_update: new Date().toISOString(),
          webhook_action: action,
          fee_details: paymentDetails.fee_details
        },
        updated_at: new Date().toISOString()
      };

      console.log('Updating with data:', updateData);
      
      const { error: updateError } = await supabase
        .from('payment_transactions')
        .update(updateData)
        .eq('id', paymentTransaction.id);

      if (updateError) {
        console.error('Error updating payment transaction:', updateError);
        
        // Log the error for debugging
        await supabase
          .from('webhook_logs')
          .insert([{
            event_type: `update_error_${action}`,
            payload: { ...body, update_data: updateData },
            response: { error: updateError.message },
            status: 'failed'
          }]);
      } else {
        console.log('✅ Successfully updated payment transaction');
        console.log('Updated status to:', paymentDetails.status);
        console.log('Saved mercadopago_payment_id:', paymentId);

        // Send confirmation message if payment was just approved
        if (wasNotApproved && isNowApproved && paymentTransaction.students) {
          console.log('🎉 Payment was just approved, sending confirmation message');
          
          try {
            // Get WhatsApp configuration for the photographer
            const { data: settings, error: settingsError } = await supabase
              .from('user_settings')
              .select('settings')
              .eq('user_id', paymentTransaction.students.user_id)
              .single();

            if (settingsError) {
              console.error('Error fetching WhatsApp settings:', settingsError);
            } else {
              const whatsappConfig = settings?.settings?.whatsapp;
              
              if (whatsappConfig?.is_connected) {
                console.log('📱 WhatsApp is connected, sending confirmation');
                
                const confirmationSent = await sendPaymentConfirmation(
                  paymentTransaction.students,
                  {
                    amount: paymentDetails.transaction_amount || paymentDetails.amount || paymentTransaction.amount,
                    payment_method: paymentDetails.payment_method_id || paymentDetails.payment_method || paymentTransaction.payment_method,
                    mercadopago_payment_id: paymentId
                  },
                  whatsappConfig
                );
                
                if (confirmationSent) {
                  console.log('✅ Payment confirmation sent via WhatsApp successfully');
                } else {
                  console.error('❌ Failed to send payment confirmation via WhatsApp');
                }
              } else {
                console.log('⚠️ WhatsApp not configured or not connected');
              }
            }
          } catch (confirmationError) {
            console.error('Error in confirmation process:', confirmationError);
          }
        }
      }

      // If not found by external_reference, try by preference_id
      if (!paymentTransaction && (paymentDetails.preference_id || body.data?.preference_id)) {
        const preferenceId = paymentDetails.preference_id || body.data?.preference_id;
        console.log('Looking for payment by preference_id:', preferenceId);
        
        const { data: existingByPref } = await supabase
          .from('payment_transactions')
          .select('*, students(user_id, full_name, phone, email)')
          .eq('preference_id', preferenceId)
          .single();

        if (existingByPref) {
          paymentTransaction = existingByPref;
          console.log('Found existing payment by preference_id:', paymentTransaction.id);
          
          // Update with MP payment ID
          console.log('Updating transaction with MP payment ID:', paymentId);
          await supabase
            .from('payment_transactions')
            .update({ mercadopago_payment_id: paymentId.toString() })
            .eq('id', paymentTransaction.id);
          
          // Refresh the transaction data
          const { data: updatedTransaction } = await supabase
            .from('payment_transactions')
            .select('*, students(user_id, full_name, phone, email)')
            .eq('id', paymentTransaction.id)
            .single();
          
          if (updatedTransaction) {
            paymentTransaction = updatedTransaction;
          }
        }
      }
      // If still not found, try to create from external_reference
      if (!paymentTransaction && (paymentDetails.external_reference || body.data?.external_reference)) {
        const externalRef = paymentDetails.external_reference || body.data?.external_reference;
        console.log('Attempting to create payment transaction from external_reference:', externalRef);
        
        const studentIdMatch = externalRef.match(/student-([a-f0-9-]+)/);
        
        if (studentIdMatch) {
          const studentId = studentIdMatch[1];
          console.log('Extracted student ID:', studentId);
          
          // Get student data
          const { data: student, error: studentError } = await supabase
            .from('students')
            .select('id, full_name, email, phone, user_id')
            .eq('id', studentId)
            .single();

          if (studentError) {
            console.log('Student not found:', studentError);
          } else if (student) {
            console.log('Found student:', student.full_name);
            
            // Create new payment transaction
            const { data: newTransaction, error: insertError } = await supabase
              .from('payment_transactions')
              .insert([{
                user_id: student.user_id,
                student_id: studentId,
                mercadopago_payment_id: paymentId.toString(),
                external_reference: externalRef,
                amount: paymentDetails.transaction_amount || paymentDetails.amount || 0,
                status: paymentDetails.status || 'pending',
                payment_method: paymentDetails.payment_method_id || paymentDetails.payment_method || 'unknown',
                payment_date: paymentDetails.date_approved ? new Date(paymentDetails.date_approved).toISOString() : null,
                payer_email: paymentDetails.payer?.email || student.email,
                webhook_data: body,
                metadata: {
                  currency: paymentDetails.currency_id,
                  installments: paymentDetails.installments,
                  payment_type: paymentDetails.payment_type_id,
                  transaction_details: paymentDetails.transaction_details,
                  webhook_received_at: new Date().toISOString(),
                  webhook_action: action
                }
              }])
              .select('*, students(user_id, full_name, phone, email)')
              .single();

            if (insertError) {
              console.error('Error creating payment transaction:', insertError);
            } else {
              paymentTransaction = newTransaction;
              console.log('Created new payment transaction:', paymentTransaction?.id);
            }
          }
        }
      }

    } else {
      console.log('Non-payment webhook received:', body.type || body.action);
      
      // Log non-payment webhooks too
      await supabase
        .from('webhook_logs')
        .insert([{
          event_type: `other_${body.type || body.action}`,
          payload: body,
          response: { message: 'Non-payment webhook logged' },
          status: 'success'
        }]);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook processado com sucesso' }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Webhook error:', error);
    
    // Log failed webhook
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      const bodyText = await req.text();
      await supabase
        .from('webhook_logs')
        .insert([{
          event_type: 'webhook_error',
          payload: { error: error.message, original_body: bodyText },
          response: { error: error.message },
          status: 'failed'
        }]);
    } catch (logError) {
      console.error('Error logging webhook failure:', logError);
    }
    
    return new Response(
      JSON.stringify({
        error: 'Erro interno do servidor',
        details: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});