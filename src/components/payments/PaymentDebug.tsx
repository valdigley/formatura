import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Bug, RefreshCw, Database, Webhook, AlertTriangle, CheckCircle, XCircle, Search, Eye, Copy } from 'lucide-react';

interface WebhookLog {
  id: string;
  event_type: string;
  payload: any;
  response: any;
  status: string;
  created_at: string;
}

interface PaymentTransaction {
  id: string;
  mercadopago_payment_id: string;
  external_reference: string;
  amount: number;
  status: string;
  webhook_data: any;
  created_at: string;
  students: {
    full_name: string;
  } | null;
}

export const PaymentDebug: React.FC = () => {
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
  const [paymentTransactions, setPaymentTransactions] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<WebhookLog | null>(null);
  const [searchPaymentId, setSearchPaymentId] = useState('');

  useEffect(() => {
    fetchDebugData();
  }, []);

  const fetchDebugData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch recent webhook logs
      const { data: webhooks, error: webhookError } = await supabase
        .from('webhook_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (webhookError) {
        console.error('Error fetching webhooks:', webhookError);
      } else {
        setWebhookLogs(webhooks || []);
      }

      // Fetch payment transactions
      const { data: payments, error: paymentsError } = await supabase
        .from('payment_transactions')
        .select(`
          *,
          students(full_name)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (paymentsError) {
        console.error('Error fetching payments:', paymentsError);
      } else {
        setPaymentTransactions(payments || []);
      }
    } catch (error) {
      console.error('Error fetching debug data:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchPaymentInMercadoPago = async () => {
    if (!searchPaymentId.trim()) {
      alert('Digite um ID de pagamento para buscar');
      return;
    }

    try {
      // Get MercadoPago config
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: settings } = await supabase
        .from('user_settings')
        .select('settings')
        .eq('user_id', user.id)
        .single();

      const mercadoPagoConfig = settings?.settings?.mercadopago;
      if (!mercadoPagoConfig?.access_token) {
        alert('Configure o Mercado Pago primeiro nas configurações');
        return;
      }

      // Search payment in MercadoPago API
      const response = await fetch(`https://api.mercadopago.com/v1/payments/${searchPaymentId}`, {
        headers: {
          'Authorization': `Bearer ${mercadoPagoConfig.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const paymentData = await response.json();
        
        // Show payment details
        alert(`Pagamento encontrado no MP:
Status: ${paymentData.status}
Valor: ${paymentData.transaction_amount}
Método: ${paymentData.payment_method_id}
Data: ${paymentData.date_created}
External Reference: ${paymentData.external_reference}`);

        // Try to create/update local transaction
        const existingTransaction = paymentTransactions.find(
          t => t.mercadopago_payment_id === searchPaymentId
        );

        if (!existingTransaction) {
          // Try to find student by external reference
          const studentIdMatch = paymentData.external_reference?.match(/student-([a-f0-9-]+)/);
          
          if (studentIdMatch) {
            const studentId = studentIdMatch[1];
            
            const { data: student } = await supabase
              .from('students')
              .select('id, user_id, full_name, email')
              .eq('id', studentId)
              .single();

            if (student) {
              // Create payment transaction
              const { error: insertError } = await supabase
                .from('payment_transactions')
                .insert([{
                  user_id: user.id,
                  student_id: studentId,
                  mercadopago_payment_id: searchPaymentId,
                  external_reference: paymentData.external_reference,
                  amount: paymentData.transaction_amount,
                  status: paymentData.status,
                  payment_method: paymentData.payment_method_id,
                  payment_date: paymentData.date_approved ? new Date(paymentData.date_approved).toISOString() : null,
                  payer_email: paymentData.payer?.email || student.email,
                  webhook_data: paymentData,
                  metadata: {
                    currency: paymentData.currency_id,
                    installments: paymentData.installments,
                    payment_type: paymentData.payment_type_id,
                    created_manually: true
                  }
                }]);

              if (insertError) {
                console.error('Error creating payment:', insertError);
                alert('Erro ao criar transação local: ' + insertError.message);
              } else {
                alert('Transação criada com sucesso!');
                fetchDebugData();
              }
            } else {
              alert('Estudante não encontrado para este pagamento');
            }
          } else {
            alert('Não foi possível extrair ID do estudante da referência externa');
          }
        } else {
          alert('Esta transação já existe no sistema local');
        }
      } else {
        const errorData = await response.json();
        alert(`Pagamento não encontrado no MP: ${errorData.message || response.status}`);
      }
    } catch (error: any) {
      alert(`Erro ao buscar pagamento: ${error.message}`);
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copiado para área de transferência!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
            <Bug className="h-6 w-6 mr-2 text-red-600" />
            Debug de Pagamentos
          </h2>
          <p className="text-gray-600 dark:text-gray-300">Diagnóstico de problemas com pagamentos do Mercado Pago</p>
        </div>
        <button
          onClick={fetchDebugData}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* Manual Payment Search */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
        <h3 className="text-lg font-medium text-yellow-800 dark:text-yellow-300 mb-4 flex items-center">
          <Search className="h-5 w-5 mr-2" />
          Buscar Pagamento Manual
        </h3>
        <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-4">
          Se um pagamento foi feito mas não aparece no sistema, use esta ferramenta para buscar e importar manualmente.
        </p>
        <div className="flex space-x-3">
          <input
            type="text"
            value={searchPaymentId}
            onChange={(e) => setSearchPaymentId(e.target.value)}
            placeholder="ID do pagamento do Mercado Pago (ex: 1234567890)"
            className="flex-1 px-3 py-2 border border-yellow-300 dark:border-yellow-600 rounded-lg focus:ring-2 focus:ring-yellow-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <button
            onClick={searchPaymentInMercadoPago}
            className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
          >
            Buscar no MP
          </button>
        </div>
      </div>

      {/* Webhook Logs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <Webhook className="h-5 w-5 mr-2" />
            Logs de Webhooks Recebidos ({webhookLogs.length})
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            Últimos 50 webhooks recebidos do Mercado Pago
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Data/Hora
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Payment ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {webhookLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {formatDateTime(log.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {log.event_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      log.status === 'success' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                    }`}>
                      {log.status === 'success' ? (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      ) : (
                        <XCircle className="h-3 w-3 mr-1" />
                      )}
                      {log.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-mono text-gray-900 dark:text-white">
                      {log.payload?.data?.id || log.payload?.id || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {webhookLogs.length === 0 && (
          <div className="p-8 text-center">
            <Webhook className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500 dark:text-gray-400">Nenhum webhook recebido ainda</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Webhooks aparecerão aqui quando o Mercado Pago enviar notificações
            </p>
          </div>
        )}
      </div>

      {/* Payment Transactions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <Database className="h-5 w-5 mr-2" />
            Transações no Banco ({paymentTransactions.length})
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            Últimas 20 transações salvas no banco de dados
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Data
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Formando
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  MP Payment ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Valor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Referência
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {paymentTransactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {formatDateTime(transaction.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {transaction.students?.full_name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => copyToClipboard(transaction.mercadopago_payment_id)}
                      className="text-sm font-mono text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center space-x-1"
                    >
                      <span>{transaction.mercadopago_payment_id}</span>
                      <Copy className="h-3 w-3" />
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    R$ {Number(transaction.amount).toLocaleString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      transaction.status === 'approved' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                        : transaction.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                    }`}>
                      {transaction.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-gray-500 dark:text-gray-400">
                    {transaction.external_reference}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {paymentTransactions.length === 0 && (
          <div className="p-8 text-center">
            <Database className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500 dark:text-gray-400">Nenhuma transação encontrada</p>
          </div>
        )}
      </div>

      {/* Diagnostic Information */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2 text-orange-600" />
          Diagnóstico
        </h3>
        
        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">Possíveis Causas do Problema:</h4>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
              <li><strong>Webhook não configurado:</strong> URL do webhook não está configurada no painel do MP</li>
              <li><strong>Webhook não chegou:</strong> MP não conseguiu enviar o webhook para o sistema</li>
              <li><strong>Erro no processamento:</strong> Webhook chegou mas houve erro ao processar</li>
              <li><strong>External reference incorreta:</strong> Referência não permite identificar o estudante</li>
              <li><strong>Ambiente incorreto:</strong> Pagamento feito em ambiente diferente das credenciais</li>
            </ul>
          </div>

          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <h4 className="font-medium text-green-800 dark:text-green-300 mb-2">Como Resolver:</h4>
            <ol className="text-sm text-green-700 dark:text-green-300 space-y-1 list-decimal list-inside">
              <li>Verifique se há webhooks recebidos na tabela acima</li>
              <li>Se não há webhooks, configure a URL no painel do MP</li>
              <li>Se há webhooks mas sem transação, verifique os logs de erro</li>
              <li>Use a busca manual para importar pagamentos perdidos</li>
              <li>Verifique se o ambiente (sandbox/produção) está correto</li>
            </ol>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">URLs Importantes:</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-300">Webhook URL:</span>
                <button
                  onClick={() => copyToClipboard(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mercadopago-webhook`)}
                  className="flex items-center space-x-1 text-blue-600 dark:text-blue-400"
                >
                  <span className="font-mono text-xs">{import.meta.env.VITE_SUPABASE_URL}/functions/v1/mercadopago-webhook</span>
                  <Copy className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Webhook Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Detalhes do Webhook - {selectedLog.event_type}
              </h2>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">Informações Básicas</h3>
                  <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-300">Data:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatDateTime(selectedLog.created_at)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-300">Tipo:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {selectedLog.event_type}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-300">Status:</span>
                      <span className={`text-sm font-medium ${
                        selectedLog.status === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                        {selectedLog.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">Dados do Pagamento</h3>
                  <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg space-y-2">
                    {selectedLog.payload?.data?.id && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-300">Payment ID:</span>
                        <span className="text-sm font-mono text-gray-900 dark:text-white">
                          {selectedLog.payload.data.id}
                        </span>
                      </div>
                    )}
                    {selectedLog.payload?.data?.external_reference && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-300">Referência:</span>
                        <span className="text-sm font-mono text-gray-900 dark:text-white">
                          {selectedLog.payload.data.external_reference}
                        </span>
                      </div>
                    )}
                    {selectedLog.payload?.data?.transaction_amount && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-300">Valor:</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          R$ {Number(selectedLog.payload.data.transaction_amount).toLocaleString('pt-BR')}
                        </span>
                      </div>
                    )}
                    {selectedLog.payload?.data?.status && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-300">Status MP:</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {selectedLog.payload.data.status}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">Payload Completo do Webhook</h3>
                <pre className="text-xs bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto">
                  {JSON.stringify(selectedLog.payload, null, 2)}
                </pre>
              </div>

              {selectedLog.response && (
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">Resposta do Sistema</h3>
                  <pre className="text-xs bg-gray-900 text-blue-400 p-4 rounded-lg overflow-x-auto">
                    {JSON.stringify(selectedLog.response, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};