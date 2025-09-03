// supabase/functions/mercadopago-webhook/index.ts

// === CORS ===
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-signature, x-request-id",
};

import { createClient } from 'npm:@supabase/supabase-js@2';

// ---------------------------------------------
// Util: buscar detalhes do pagamento no MP
// ---------------------------------------------
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

// ---------------------------------------------
// Util: envio de confirmação por WhatsApp
// ---------------------------------------------
async function sendPaymentConfirmation(studentData: any, paymentData: any, whatsappConfig: any) {
  try {
    const digits = String(studentData.phone || "").replace(/\D/g, "");
    const withDDI = digits.startsWith("55") ? digits : `55${digits}`;
    const numberJid = `${withDDI}@s.whatsapp.net`;

    const confirmationMessage = `🎉 *PAGAMENTO CONFIRMADO!* 🎉

Olá ${studentData.full_name}!

✅ Confirmamos o recebimento do seu pagamento!

📋 *DETALHES:*
• Valor: R$ ${Number(paymentData.amount).toLocaleString('pt-BR')}
• Método: ${paymentData.payment_method === 'pix' ? 'PIX' :
           paymentData.payment_method === 'credit_card' ? 'Cartão de Crédito' :
           paymentData.payment_method === 'debit_card' ? 'Cartão de Débito' :
           paymentData.payment_method || '—'}
• Data: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}
• ID da Transação: ${paymentData.mercadopago_payment_id}

📸 *SUA SESSÃO FOTOGRÁFICA ESTÁ CONFIRMADA!*

🗓️ *PRÓXIMOS PASSOS:*
• Aguarde contato para confirmar data e horário
• Prepare-se para o grande dia da formatura
• Em caso de dúvidas, estamos à disposição

Obrigado pela confiança! Mal podemos esperar para capturar seus melhores momentos! 📷✨`;

    const whatsappPayload = {
      messaging_product: "whatsapp",
      to: numberJid,
      type: "text",
      text: {
        body: confirmationMessage
      }
    };

    const whatsappResponse = await fetch(`https://graph.facebook.com/v17.0/${whatsappConfig.phone_number_id}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${whatsappConfig.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(whatsappPayload),
    });

    if (whatsappResponse.ok) {
      console.log('✅ WhatsApp confirmation sent successfully');
      return true;
    } else {
      const errorText = await whatsappResponse.text();
      console.error('❌ WhatsApp send failed:', errorText);
      return false;
    }
  } catch (error) {
    console.error('❌ WhatsApp send error:', error);
    return false;
  }
}

// ---------------------------------------------
// MAIN HANDLER
// ---------------------------------------------
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
    console.log('🔔 Webhook received:', JSON.stringify(webhookData, null, 2));

    // Validate webhook structure
    if (!webhookData.data?.id) {
      console.error('❌ Invalid webhook: missing payment ID');
      return new Response(JSON.stringify({ error: 'Invalid webhook data' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const paymentId = webhookData.data.id.toString();
    console.log('💳 Processing payment ID:', paymentId);

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get all MercadoPago configurations
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('user_id, settings')
      .not('settings->mercadopago->access_token', 'is', null);

    if (!userSettings || userSettings.length === 0) {
      console.error('❌ No MercadoPago configurations found');
      return new Response(JSON.stringify({ error: 'No configurations found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let paymentDetails = null;
    let matchedConfig = null;

    // Try each access token until we find the payment
    for (const userSetting of userSettings) {
      const mpConfig = userSetting.settings?.mercadopago;
      if (!mpConfig?.access_token) continue;

      console.log(`🔍 Trying access token for user: ${userSetting.user_id}`);
      
      paymentDetails = await fetchPaymentDetails(paymentId, mpConfig.access_token);
      if (paymentDetails) {
        matchedConfig = { ...mpConfig, user_id: userSetting.user_id };
        console.log('✅ Payment found with this access token');
        break;
      }
    }

    if (!paymentDetails) {
      console.error('❌ Payment not found in any account');
      return new Response(JSON.stringify({ error: 'Payment not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('💰 Payment details:', JSON.stringify(paymentDetails, null, 2));

    // Find transaction by preference_id or external_reference
    const preferenceId = paymentDetails.additional_info?.items?.[0]?.id || 
                        paymentDetails.external_reference;

    console.log('🔍 Looking for transaction with preference_id:', preferenceId);

    let { data: transaction } = await supabase
      .from('payment_transactions')
      .select('*, students(full_name, email, phone)')
      .eq('preference_id', preferenceId)
      .single();

    // If not found by preference_id, try external_reference
    if (!transaction && paymentDetails.external_reference) {
      console.log('🔍 Trying external_reference:', paymentDetails.external_reference);
      
      const { data: transactionByRef } = await supabase
        .from('payment_transactions')
        .select('*, students(full_name, email, phone)')
        .eq('external_reference', paymentDetails.external_reference)
        .single();
      
      transaction = transactionByRef;
    }

    if (!transaction) {
      console.error('❌ Transaction not found for preference_id:', preferenceId);
      return new Response(JSON.stringify({ error: 'Transaction not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('📋 Transaction found:', transaction.id);

    // Update transaction with payment details
    const { error: updateError } = await supabase
      .from('payment_transactions')
      .update({
        mercadopago_payment_id: paymentId,
        status: paymentDetails.status,
        payer_email: paymentDetails.payer?.email,
        webhook_data: paymentDetails,
      })
      .eq('id', transaction.id);

    if (updateError) {
      console.error('❌ Error updating transaction:', updateError);
      return new Response(JSON.stringify({ error: 'Update failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('✅ Transaction updated successfully');

    // Send WhatsApp confirmation if payment is approved
    if (paymentDetails.status === 'approved' && transaction.students) {
      console.log('📱 Sending WhatsApp confirmation...');
      
      const whatsappConfig = matchedConfig?.whatsapp;
      if (whatsappConfig?.access_token && whatsappConfig?.phone_number_id) {
        await sendPaymentConfirmation(transaction.students, {
          amount: paymentDetails.transaction_amount,
          payment_method: paymentDetails.payment_method_id,
          mercadopago_payment_id: paymentId,
        }, whatsappConfig);
      } else {
        console.log('⚠️ WhatsApp not configured, skipping notification');
      }
    }

    // Log webhook for debugging
    await supabase.from('webhook_logs').insert({
      event_type: 'mercadopago_payment',
      payload: webhookData,
      response: { success: true, payment_id: paymentId },
      status: 'success',
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Webhook error:', error);
    
    // Log error
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );
      
      await supabase.from('webhook_logs').insert({
        event_type: 'mercadopago_payment',
        payload: await req.json().catch(() => ({})),
        response: { error: error.message },
        status: 'failed',
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});