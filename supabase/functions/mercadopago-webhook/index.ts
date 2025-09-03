// supabase/functions/mp-webhook/index.ts

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

Obrigado pela confiança! Mal podemos esp
