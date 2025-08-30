import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { DollarSign, Search, Filter, Eye, CheckCircle, Clock, XCircle, CreditCard, Calendar, User, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Atualizando...' : 'Atualizar'}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Recebido</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                R$ {totalApproved.toLocaleString('pt-BR')}
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
                R$ {totalPending.toLocaleString('pt-BR')}
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
                      R$ {Number(payment.amount).toLocaleString('pt-BR')}
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
                        ? format(new Date(payment.payment_date), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                        : 'Não pago'
                      }
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Criado: {format(new Date(payment.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => setSelectedPayment(payment)}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
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

              {/* Payment Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">Informações do Pagamento</h3>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-300">Valor:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        R$ {Number(selectedPayment.amount).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-300">Método:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {getPaymentMethodLabel(selectedPayment.payment_method)}
                      </span>
                    </div>
                    
                    {selectedPayment.metadata?.installments > 1 && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-300">Parcelas:</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {selectedPayment.metadata.installments}x
                        </span>
                      </div>
                    )}
                    
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-300">ID Mercado Pago:</span>
                      <span className="text-sm font-mono text-gray-900 dark:text-white">
                        {selectedPayment.mercadopago_payment_id}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-300">Referência:</span>
                      <span className="text-sm font-mono text-gray-900 dark:text-white">
                        {selectedPayment.external_reference}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">Informações do Cliente</h3>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-300">Nome:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {selectedPayment.students?.full_name || 'N/A'}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-300">Email:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {selectedPayment.payer_email}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-300">Telefone:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {selectedPayment.students?.phone || 'N/A'}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-300">Turma:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {selectedPayment.students?.graduation_classes?.name || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Timeline</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      <span className="font-medium">Pagamento criado:</span> {format(new Date(selectedPayment.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </div>
                  </div>
                  
                  {selectedPayment.payment_date && (
                    <div className="flex items-center space-x-3">
                      <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">
                        <span className="font-medium">Pagamento aprovado:</span> {format(new Date(selectedPayment.payment_date), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-3">
                    <div className="h-2 w-2 bg-gray-400 rounded-full"></div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      <span className="font-medium">Última atualização:</span> {format(new Date(selectedPayment.updated_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Raw Data (for debugging) */}
              {selectedPayment.webhook_data && Object.keys(selectedPayment.webhook_data).length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Dados Técnicos</h3>
                  <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 max-h-40 overflow-y-auto">
                    <pre className="text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                      {JSON.stringify(selectedPayment.webhook_data, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};