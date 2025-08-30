const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

import { createClient } from 'npm:@supabase/supabase-js@2';

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
    await supabase
      .from('webhook_logs')
      .insert([{
        event_type: body.action || body.type || 'unknown',
        payload: body,
        status: 'success'
      }]);

    // Handle different webhook types
    if (body.type === 'payment' || body.action === 'payment.updated' || body.action === 'payment.created') {
      const paymentId = body.data?.id || body.id;
      const action = body.action || body.type;

      console.log('Processing payment webhook:', { paymentId, action });

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

      // Try to get payment details from MercadoPago API if we have access token
      let paymentDetails = body.data || body;
      
      // If we don't have full payment details, try to fetch from MP API
      if (!paymentDetails.transaction_amount && !paymentDetails.amount) {
        console.log('Incomplete payment data, trying to fetch from MP API...');
        
        // Try to find existing transaction to get access token
        const { data: existingTransaction } = await supabase
          .from('payment_transactions')
          .select('*, students(user_id)')
          .or(`mercadopago_payment_id.eq.${paymentId},external_reference.eq.${body.data?.external_reference || ''}`)
          .single();

        if (existingTransaction?.students?.user_id) {
          const { data: settings } = await supabase
            .from('user_settings')
            .select('settings')
            .eq('user_id', existingTransaction.students.user_id)
            .single();

          const mercadoPagoConfig = settings?.settings?.mercadopago;
          if (mercadoPagoConfig?.access_token) {
            try {
              const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
                headers: {
                  'Authorization': `Bearer ${mercadoPagoConfig.access_token}`,
                  'Content-Type': 'application/json',
                },
              });

              if (mpResponse.ok) {
                paymentDetails = await mpResponse.json();
                console.log('Fetched payment details from MP API:', paymentDetails.status);
              }
            } catch (error) {
              console.error('Error fetching from MP API:', error);
            }
          }
        }
      }

      // Find or create payment transaction
      let paymentTransaction = null;
      
      // First try to find by mercadopago_payment_id
      const { data: existingByMpId } = await supabase
        .from('payment_transactions')
        .select('*, students(user_id, full_name, phone, email)')
        .eq('mercadopago_payment_id', paymentId.toString())
        .single();

      if (existingByMpId) {
        paymentTransaction = existingByMpId;
        console.log('Found existing payment by MP ID:', paymentTransaction.id);
      }

      // If not found by MP ID, try by external_reference
      if (!paymentTransaction && (paymentDetails.external_reference || body.data?.external_reference)) {
        const externalRef = paymentDetails.external_reference || body.data?.external_reference;
        console.log('Looking for payment by external_reference:', externalRef);
        
        const { data: existingByRef } = await supabase
          .from('payment_transactions')
          .select('*, students(user_id, full_name, phone, email)')
          .eq('external_reference', externalRef)
          .single();

        if (existingByRef) {
          paymentTransaction = existingByRef;
          console.log('Found existing payment by external_reference:', paymentTransaction.id);
          
          // Update with MP payment ID if missing
          if (!paymentTransaction.mercadopago_payment_id) {
            await supabase
              .from('payment_transactions')
              .update({ mercadopago_payment_id: paymentId.toString() })
              .eq('id', paymentTransaction.id);
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
                  transaction_details: paymentDetails.transaction_details
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

      // Update existing payment transaction
      if (paymentTransaction) {
        console.log('Updating payment transaction:', paymentTransaction.id);
        
        const wasNotApproved = paymentTransaction.status !== 'approved';
        const isNowApproved = paymentDetails.status === 'approved';
        
        const updateData = {
          status: paymentDetails.status || paymentTransaction.status,
          payment_method: paymentDetails.payment_method_id || paymentDetails.payment_method || paymentTransaction.payment_method,
          payment_date: paymentDetails.date_approved ? new Date(paymentDetails.date_approved).toISOString() : paymentTransaction.payment_date,
          amount: paymentDetails.transaction_amount || paymentDetails.amount || paymentTransaction.amount,
          payer_email: paymentDetails.payer?.email || paymentTransaction.payer_email,
          webhook_data: body,
          metadata: {
            ...paymentTransaction.metadata,
            currency: paymentDetails.currency_id,
            installments: paymentDetails.installments,
            payment_type: paymentDetails.payment_type_id,
            transaction_details: paymentDetails.transaction_details,
            last_webhook_update: new Date().toISOString()
          },
          updated_at: new Date().toISOString()
        };

        const { error: updateError } = await supabase
          .from('payment_transactions')
          .update(updateData)
          .eq('id', paymentTransaction.id);

        if (updateError) {
          console.error('Error updating payment transaction:', updateError);
        } else {
          console.log('Successfully updated payment transaction');

          // Send confirmation message if payment was just approved
          if (wasNotApproved && isNowApproved && paymentTransaction.students) {
            console.log('Payment was just approved, sending confirmation message');
            
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
                  console.log('WhatsApp is connected, sending confirmation');
                  
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
      } else {
        console.log('❌ Payment transaction not found, attempting to create from webhook data');
        
        // Last attempt: try to create transaction from webhook data alone
        if (paymentDetails.external_reference) {
          const studentIdMatch = paymentDetails.external_reference.match(/student-([a-f0-9-]+)/);
          
          if (studentIdMatch) {
            const studentId = studentIdMatch[1];
            
            const { data: student } = await supabase
              .from('students')
              .select('id, full_name, email, phone, user_id')
              .eq('id', studentId)
              .single();

            if (student) {
              console.log('Creating payment transaction from webhook data for student:', student.full_name);
              
              const { data: newTransaction, error: insertError } = await supabase
                .from('payment_transactions')
                .insert([{
                  user_id: student.user_id,
                  student_id: studentId,
                  mercadopago_payment_id: paymentId.toString(),
                  external_reference: paymentDetails.external_reference,
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
                    created_from_webhook: true
                  }
                }]);

              if (insertError) {
                console.error('Error creating payment transaction from webhook:', insertError);
              } else {
                console.log('✅ Successfully created payment transaction from webhook data');
                
                // Send confirmation if approved
                if (paymentDetails.status === 'approved') {
                  const { data: settings } = await supabase
                    .from('user_settings')
                    .select('settings')
                    .eq('user_id', student.user_id)
                    .single();

                  const whatsappConfig = settings?.settings?.whatsapp;
                  if (whatsappConfig?.is_connected) {
                    await sendPaymentConfirmation(
                      student,
                      {
                        amount: paymentDetails.transaction_amount || paymentDetails.amount,
                        payment_method: paymentDetails.payment_method_id || paymentDetails.payment_method,
                        mercadopago_payment_id: paymentId
                      },
                      whatsappConfig
                    );
                  }
                }
              }
            }
          }
        }
      }

    } else {
      console.log('Non-payment webhook received:', body.type || body.action);
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
      
      await supabase
        .from('webhook_logs')
        .insert([{
          event_type: 'webhook_error',
          payload: { error: error.message, original_body: await req.text() },
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