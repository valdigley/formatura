import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { DollarSign, Search, Filter, Eye, CheckCircle, Clock, XCircle, CreditCard, Calendar, User, RefreshCw, Copy, ExternalLink, FileText, Shield, Bug } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PaymentDebug } from './PaymentDebug';

interface PaymentTransaction {
  id: string;
  student_id: string;
  mercadopago_payment_id: string;
  preference_id: string;
  external_reference: string;
  amount: number;
  status: string;
  payment_method: string;
  payment_date: string | null;
  payer_email: string;
  metadata: any;
  webhook_data: any;
  created_at: string;
  updated_at: string;
  students: {
    full_name: string;
    email: string;
    phone: string;
    graduation_classes: {
      name: string;
    } | null;
  } | null;
}

export const PaymentsList: React.FC = () => {
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedPayment, setSelectedPayment] = useState<PaymentTransaction | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [syncingPayment, setSyncingPayment] = useState<string | null>(null);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('payment_transactions')
        .select(`
          *,
          students(
            full_name,
            email,
            phone,
            graduation_classes(name)
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const refreshPayments = () => {
    setRefreshing(true);
    fetchPayments();
  };

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error('Erro ao copiar:', error);
    }
  };

  const syncPaymentStatus = async (payment: PaymentTransaction) => {
    setSyncingPayment(payment.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Get MercadoPago config
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

      // Use Supabase Edge Function to avoid CORS issues
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mercadopago?action=sync-payment`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_token: mercadoPagoConfig.access_token,
          environment: mercadoPagoConfig.environment,
          payment_id: payment.mercadopago_payment_id,
          action: 'sync-payment'
        }),
      });

      const responseData = await response.json();

      if (!response.ok || !responseData.success) {
        throw new Error(responseData.error || `Erro HTTP: ${response.status}`);
      }

      const mpPaymentData = responseData.payment;
      console.log('Status atual no MP:', mpPaymentData.status);
      console.log('Status no sistema:', payment.status);

      // Update local payment if status changed
      if (mpPaymentData.status !== payment.status) {
        const { error: updateError } = await supabase
          .from('payment_transactions')
          .update({
            status: mpPaymentData.status,
            payment_method: mpPaymentData.payment_method_id || payment.payment_method,
            payment_date: mpPaymentData.date_approved ? new Date(mpPaymentData.date_approved).toISOString() : payment.payment_date,
            webhook_data: mpPaymentData,
            metadata: {
              ...payment.metadata,
              last_sync: new Date().toISOString(),
              synced_from_api: true,
              previous_status: payment.status
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', payment.id);

        if (updateError) {
          throw updateError;
        }

        alert(`Status atualizado de "${payment.status}" para "${mpPaymentData.status}"!`);
        
        // Send WhatsApp confirmation if payment was approved
        if (mpPaymentData.status === 'approved' && payment.status !== 'approved' && payment.students) {
          await sendPaymentConfirmationWhatsApp(payment.students, mpPaymentData);
        }
        
        fetchPayments(); // Refresh the list
      } else {
        alert('Status já está atualizado no sistema');
      }
    } catch (error: any) {
      alert(`Erro ao sincronizar: ${error.message}`);
    } finally {
      setSyncingPayment(null);
    }
  };

  const sendPaymentConfirmationWhatsApp = async (student: any, paymentData: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: settings } = await supabase
        .from('user_settings')
        .select('settings')
        .eq('user_id', user.id)
        .single();

      const whatsappConfig = settings?.settings?.whatsapp;
      if (!whatsappConfig?.is_connected) {
        console.log('WhatsApp não configurado para confirmação');
        return;
      }

      const cleanPhone = student.phone.replace(/\D/g, '');
      const formattedPhone = cleanPhone.length === 11 ? `55${cleanPhone}` : cleanPhone;

      const confirmationMessage = `🎉 *PAGAMENTO CONFIRMADO!* 🎉

Olá ${student.full_name}!

✅ Confirmamos o recebimento do seu pagamento!

📋 *DETALHES:*
• Valor: R$ ${Number(paymentData.transaction_amount).toLocaleString('pt-BR')}
• Método: ${paymentData.payment_method_id === 'pix' ? 'PIX' : 
           paymentData.payment_method_id === 'credit_card' ? 'Cartão de Crédito' :
           paymentData.payment_method_id === 'debit_card' ? 'Cartão de Débito' :
           paymentData.payment_method_id}
• Data: ${new Date(paymentData.date_approved).toLocaleDateString('pt-BR')} às ${new Date(paymentData.date_approved).toLocaleTimeString('pt-BR')}
• ID da Transação: ${paymentData.id}

📸 *SUA SESSÃO FOTOGRÁFICA ESTÁ CONFIRMADA!*

🗓️ *PRÓXIMOS PASSOS:*
• Aguarde contato para confirmar data e horário
• Prepare-se para o grande dia da formatura
• Em caso de dúvidas, estamos à disposição

Obrigado pela confiança! 📷✨`;

      await fetch(`${whatsappConfig.api_url}/message/sendText/${whatsappConfig.instance_name}`, {
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
    } catch (error) {
      console.error('Error sending payment confirmation:', error);
    }
  };

  const syncAllPendingPayments = async () => {
    const pendingPayments = payments.filter(p => p.status === 'pending' || p.status === 'in_process');
    
    if (pendingPayments.length === 0) {
      alert('Não há pagamentos pendentes para sincronizar');
      return;
    }

    if (!confirm(`Sincronizar ${pendingPayments.length} pagamento(s) pendente(s) com o Mercado Pago?`)) {
      return;
    }

    setRefreshing(true);
    let successCount = 0;
    let errorCount = 0;

    for (const payment of pendingPayments) {
      try {
        await syncPaymentStatus(payment);
        successCount++;
      } catch (error) {
        console.error(`Erro ao sincronizar pagamento ${payment.id}:`, error);
        errorCount++;
      }
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    setRefreshing(false);
    
    if (successCount > 0) {
      alert(`${successCount} pagamento(s) sincronizado(s) com sucesso!${errorCount > 0 ? ` ${errorCount} erro(s).` : ''}`);
      fetchPayments(); // Refresh the list
    } else {
      alert('Nenhum pagamento foi sincronizado. Verifique os logs para mais detalhes.');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR });
  };

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = 
      payment.students?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.payer_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.external_reference.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'in_process': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      case 'cancelled': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved': return 'Aprovado';
      case 'pending': return 'Pendente';
      case 'in_process': return 'Processando';
      case 'rejected': return 'Rejeitado';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'in_process': return <RefreshCw className="h-4 w-4" />;
      case 'rejected': return <XCircle className="h-4 w-4" />;
      case 'cancelled': return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'pix': return 'PIX';
      case 'credit_card': return 'Cartão de Crédito';
      case 'debit_card': return 'Cartão de Débito';
      case 'bank_transfer': return 'Transferência';
      case 'ticket': return 'Boleto';
      default: return method || 'N/A';
    }
  };

  const totalApproved = payments
    .filter(p => p.status === 'approved')
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const totalPending = payments
    .filter(p => p.status === 'pending' || p.status === 'in_process')
    .reduce((sum, p) => sum + Number(p.amount), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pagamentos</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">Gerencie todos os pagamentos recebidos via Mercado Pago</p>
        </div>
        <button
          onClick={refreshPayments}
          disabled={refreshing}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors mr-3"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Atualizando...' : 'Atualizar'}
        </button>
        <button
          onClick={syncAllPendingPayments}
          className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors mr-3"
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Sincronizar Pendentes
        </button>
        <button
          onClick={() => setShowDebug(!showDebug)}
          className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
        >
          <Bug className="h-4 w-4 mr-2" />
          {showDebug ? 'Ocultar Debug' : 'Debug'}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Recebido</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(totalApproved)}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Pendente</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {formatCurrency(totalPending)}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-yellow-100 dark:bg-yellow-900">
              <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Pagamentos Aprovados</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {payments.filter(p => p.status === 'approved').length}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900">
              <DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total de Transações</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{payments.length}</p>
            </div>
            <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-700">
              <CreditCard className="h-6 w-6 text-gray-600 dark:text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por formando, email ou referência..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">Todos os Status</option>
              <option value="approved">Aprovado</option>
              <option value="pending">Pendente</option>
              <option value="in_process">Processando</option>
              <option value="rejected">Rejeitado</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </div>
        </div>
      </div>

      {/* Payments List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Formando
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Valor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Método
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Data
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredPayments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-8 w-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {payment.students?.full_name || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {payment.students?.graduation_classes?.name || 'Sem turma'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatCurrency(Number(payment.amount))}
                    </div>
                    {payment.metadata?.installments > 1 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {payment.metadata.installments}x parcelas
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(payment.status)}`}>
                      {getStatusIcon(payment.status)}
                      <span className="ml-1">{getStatusLabel(payment.status)}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {getPaymentMethodLabel(payment.payment_method)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {payment.payment_date 
                        ? formatDateTime(payment.payment_date)
                        : 'Não pago'
                      }
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Criado: {format(new Date(payment.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex space-x-2">
                      {(payment.status === 'pending' || payment.status === 'in_process') && (
                        <button
                          onClick={() => syncPaymentStatus(payment)}
                          disabled={syncingPayment === payment.id}
                          className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300"
                          title="Sincronizar status com Mercado Pago"
                        >
                          {syncingPayment === payment.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedPayment(payment)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredPayments.length === 0 && (
        <div className="text-center py-12">
          <DollarSign className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Nenhum pagamento encontrado</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            {searchTerm ? 'Tente ajustar os filtros de busca' : 'Os pagamentos aparecerão aqui quando os formandos efetuarem o pagamento'}
          </p>
        </div>
      )}

      {/* Payment Details Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Detalhes do Pagamento</h2>
              <button
                onClick={() => setSelectedPayment(null)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Payment Status */}
              <div className="flex items-center justify-center p-4 rounded-lg bg-gray-50 dark:bg-gray-700">
                <span className={`inline-flex items-center px-4 py-2 rounded-full text-lg font-medium ${getStatusColor(selectedPayment.status)}`}>
                  {getStatusIcon(selectedPayment.status)}
                  <span className="ml-2">{getStatusLabel(selectedPayment.status)}</span>
                </span>
              </div>

              {/* Mercado Pago Payment Details */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-lg font-medium text-blue-900 dark:text-blue-300">Comprovante Mercado Pago</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Transaction ID */}
                  <div className="bg-white dark:bg-gray-700 p-3 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">ID da Transação:</span>
                      <button
                        onClick={() => copyToClipboard(selectedPayment.mercadopago_payment_id, 'transaction_id')}
                        className="flex items-center space-x-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                      >
                        <span className="text-sm font-mono">{selectedPayment.mercadopago_payment_id}</span>
                        {copiedField === 'transaction_id' ? (
                          <CheckCircle className="h-3 w-3 text-green-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="bg-white dark:bg-gray-700 p-3 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Valor Pago:</span>
                      <span className="text-lg font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(Number(selectedPayment.amount))}
                      </span>
                    </div>
                  </div>

                  {/* Payment Method Details */}
                  <div className="bg-white dark:bg-gray-700 p-3 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Método de Pagamento:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {getPaymentMethodLabel(selectedPayment.payment_method)}
                      </span>
                    </div>
                    {selectedPayment.webhook_data?.payment_type_id && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Tipo: {selectedPayment.webhook_data.payment_type_id}
                      </div>
                    )}
                  </div>

                  {/* External Reference */}
                  <div className="bg-white dark:bg-gray-700 p-3 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Referência Externa:</span>
                      <button
                        onClick={() => copyToClipboard(selectedPayment.external_reference, 'external_ref')}
                        className="flex items-center space-x-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                      >
                        <span className="text-xs font-mono">{selectedPayment.external_reference}</span>
                        {copiedField === 'external_ref' ? (
                          <CheckCircle className="h-3 w-3 text-green-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed Payment Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                    <DollarSign className="h-5 w-5 mr-2" />
                    Detalhes Financeiros
                  </h3>
                  
                  <div className="space-y-3">
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-300">Valor Bruto:</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {formatCurrency(Number(selectedPayment.amount))}
                        </span>
                      </div>
                      
                      {selectedPayment.webhook_data?.transaction_details?.net_received_amount && (
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-sm text-gray-600 dark:text-gray-300">Valor Líquido:</span>
                          <span className="text-sm font-medium text-green-600 dark:text-green-400">
                            {formatCurrency(Number(selectedPayment.webhook_data.transaction_details.net_received_amount))}
                          </span>
                        </div>
                      )}
                      
                      {selectedPayment.webhook_data?.fee_details && selectedPayment.webhook_data.fee_details.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Taxas:</div>
                          {selectedPayment.webhook_data.fee_details.map((fee: any, index: number) => (
                            <div key={index} className="flex justify-between text-xs">
                              <span>{fee.type}:</span>
                              <span className="text-red-600 dark:text-red-400">
                                -{formatCurrency(Number(fee.amount))}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {selectedPayment.metadata?.installments > 1 && (
                      <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-300">Parcelas:</span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {selectedPayment.metadata.installments}x de {formatCurrency(Number(selectedPayment.amount) / selectedPayment.metadata.installments)}
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {selectedPayment.webhook_data?.currency_id && (
                      <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-300">Moeda:</span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {selectedPayment.webhook_data.currency_id}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                    <User className="h-5 w-5 mr-2" />
                    Informações do Pagador
                  </h3>
                  
                  <div className="space-y-3">
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-300">Nome:</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {selectedPayment.webhook_data?.payer?.first_name && selectedPayment.webhook_data?.payer?.last_name 
                            ? `${selectedPayment.webhook_data.payer.first_name} ${selectedPayment.webhook_data.payer.last_name}`
                            : selectedPayment.students?.full_name || 'N/A'}
                        </span>
                      </div>
                      
                      {selectedPayment.webhook_data?.payer?.identification && (
                        <div className="flex justify-between mt-2">
                          <span className="text-sm text-gray-600 dark:text-gray-300">
                            {selectedPayment.webhook_data.payer.identification.type}:
                          </span>
                          <span className="text-sm font-mono text-gray-900 dark:text-white">
                            {selectedPayment.webhook_data.payer.identification.number}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-300">Email:</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {selectedPayment.webhook_data?.payer?.email || selectedPayment.payer_email}
                        </span>
                      </div>
                      
                      {selectedPayment.webhook_data?.payer?.phone && (
                        <div className="flex justify-between mt-2">
                          <span className="text-sm text-gray-600 dark:text-gray-300">Telefone:</span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {selectedPayment.webhook_data.payer.phone.area_code} {selectedPayment.webhook_data.payer.phone.number}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-300">Turma:</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {selectedPayment.students?.graduation_classes?.name || selectedPayment.metadata?.graduation_class || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mercado Pago Technical Details */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Dados Técnicos do Mercado Pago
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Payment IDs */}
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">Identificadores</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600 dark:text-gray-300">Payment ID:</span>
                        <button
                          onClick={() => copyToClipboard(selectedPayment.mercadopago_payment_id, 'payment_id')}
                          className="flex items-center space-x-1 text-blue-600 dark:text-blue-400"
                        >
                          <span className="text-xs font-mono">{selectedPayment.mercadopago_payment_id}</span>
                          {copiedField === 'payment_id' ? <CheckCircle className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </div>
                      
                      {selectedPayment.preference_id && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600 dark:text-gray-300">Preference ID:</span>
                          <button
                            onClick={() => copyToClipboard(selectedPayment.preference_id, 'preference_id')}
                            className="flex items-center space-x-1 text-blue-600 dark:text-blue-400"
                          >
                            <span className="text-xs font-mono">{selectedPayment.preference_id}</span>
                            {copiedField === 'preference_id' ? <CheckCircle className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          </button>
                        </div>
                      )}
                      
                      {selectedPayment.webhook_data?.collector_id && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600 dark:text-gray-300">Collector ID:</span>
                          <span className="text-xs font-mono text-gray-900 dark:text-white">
                            {selectedPayment.webhook_data.collector_id}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Transaction Details */}
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">Detalhes da Transação</h4>
                    <div className="space-y-2">
                      {selectedPayment.webhook_data?.transaction_details?.financial_institution && (
                        <div className="flex justify-between">
                          <span className="text-xs text-gray-600 dark:text-gray-300">Banco:</span>
                          <span className="text-xs font-medium text-gray-900 dark:text-white">
                            {selectedPayment.webhook_data.transaction_details.financial_institution}
                          </span>
                        </div>
                      )}
                      
                      {selectedPayment.webhook_data?.transaction_details?.installment_amount && (
                        <div className="flex justify-between">
                          <span className="text-xs text-gray-600 dark:text-gray-300">Valor da Parcela:</span>
                          <span className="text-xs font-medium text-gray-900 dark:text-white">
                            {formatCurrency(Number(selectedPayment.webhook_data.transaction_details.installment_amount))}
                          </span>
                        </div>
                      )}
                      
                      {selectedPayment.webhook_data?.installments && selectedPayment.webhook_data.installments > 1 && (
                        <div className="flex justify-between">
                          <span className="text-xs text-gray-600 dark:text-gray-300">Parcelas:</span>
                          <span className="text-xs font-medium text-gray-900 dark:text-white">
                            {selectedPayment.webhook_data.installments}x
                          </span>
                        </div>
                      )}
                      
                      {selectedPayment.webhook_data?.transaction_details?.total_paid_amount && (
                        <div className="flex justify-between">
                          <span className="text-xs text-gray-600 dark:text-gray-300">Total Pago:</span>
                          <span className="text-xs font-medium text-green-600 dark:text-green-400">
                            {formatCurrency(Number(selectedPayment.webhook_data.transaction_details.total_paid_amount))}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Details (if available) */}
              {selectedPayment.webhook_data?.card && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                    <CreditCard className="h-5 w-5 mr-2" />
                    Detalhes do Cartão
                  </h3>
                  
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedPayment.webhook_data.card.first_six_digits && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-300">Primeiros 6 dígitos:</span>
                          <span className="text-sm font-mono text-gray-900 dark:text-white">
                            {selectedPayment.webhook_data.card.first_six_digits}****
                          </span>
                        </div>
                      )}
                      
                      {selectedPayment.webhook_data.card.last_four_digits && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-300">Últimos 4 dígitos:</span>
                          <span className="text-sm font-mono text-gray-900 dark:text-white">
                            ****{selectedPayment.webhook_data.card.last_four_digits}
                          </span>
                        </div>
                      )}
                      
                      {selectedPayment.webhook_data.card.cardholder && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-300">Portador:</span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {selectedPayment.webhook_data.card.cardholder.name}
                          </span>
                        </div>
                      )}
                      
                      {selectedPayment.webhook_data.issuer_id && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-300">Emissor:</span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {selectedPayment.webhook_data.issuer_id}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Timeline */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  Timeline do Pagamento
                </h3>
                
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-300">Criado em:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatDateTime(selectedPayment.created_at)}
                      </span>
                    </div>
                    
                    {selectedPayment.webhook_data?.date_created && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-300">Processado no MP:</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {formatDateTime(selectedPayment.webhook_data.date_created)}
                        </span>
                      </div>
                    )}
                    
                    {selectedPayment.webhook_data?.date_approved && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-300">Aprovado em:</span>
                        <span className="text-sm font-medium text-green-600 dark:text-green-400">
                          {formatDateTime(selectedPayment.webhook_data.date_approved)}
                        </span>
                      </div>
                    )}
                    
                    {selectedPayment.webhook_data?.date_last_updated && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-300">Última atualização:</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {formatDateTime(selectedPayment.webhook_data.date_last_updated)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Raw Webhook Data (Expandable) */}
              <details className="bg-gray-50 dark:bg-gray-700 rounded-lg">
                <summary className="p-4 cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                  Ver dados brutos do webhook (técnico)
                </summary>
                <div className="p-4 pt-0">
                  <pre className="text-xs bg-gray-900 text-green-400 p-3 rounded overflow-x-auto">
                    {JSON.stringify(selectedPayment.webhook_data, null, 2)}
                  </pre>
                </div>
              </details>
            </div>
          </div>
        </div>
      )}

      {/* Debug Panel */}
      {showDebug && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-6">
          <PaymentDebug />
        </div>
      )}
    </div>
  );
};