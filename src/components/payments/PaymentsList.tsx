import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Database } from '../../types/database';
import { DollarSign, Search, Filter, Eye, CheckCircle, Clock, AlertCircle, CreditCard, Calendar, User, Package, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type PaymentTransaction = Database['public']['Tables']['payment_transactions']['Row'];

export const PaymentsList: React.FC = () => {
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from('payment_transactions')
        .select(`
          *,
          students(full_name, email, phone)
        `)
        .or(`user_id.eq.${user.id},student_id.in.(select id from students where user_id.eq.${user.id})`)
        .order('created_at', { ascending: false });
      
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshPayments = async () => {
    setRefreshing(true);
    await fetchPayments();
    setRefreshing(false);
  };

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = 
      payment.payer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.external_reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.students?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.mercadopago_payment_id?.includes(searchTerm);
    
    return matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      case 'cancelled': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
      case 'in_process': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved': return 'Aprovado';
      case 'pending': return 'Pendente';
      case 'rejected': return 'Rejeitado';
      case 'cancelled': return 'Cancelado';
      case 'in_process': return 'Processando';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'rejected': return <AlertCircle className="h-4 w-4" />;
      case 'cancelled': return <AlertCircle className="h-4 w-4" />;
      case 'in_process': return <RefreshCw className="h-4 w-4 animate-spin" />;
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
          <p className="text-gray-600 dark:text-gray-300 mt-1">Acompanhe todas as transações de pagamento</p>
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

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por email, nome, ID do pagamento..."
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
              <option value="rejected">Rejeitado</option>
              <option value="cancelled">Cancelado</option>
              <option value="in_process">Processando</option>
            </select>
          </div>
        </div>
      </div>

      {/* Payments List */}
      <div className="space-y-4">
        {filteredPayments.map((payment) => (
          <div
            key={payment.id}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      R$ {Number(payment.amount).toLocaleString('pt-BR')}
                    </h3>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(payment.status)}`}>
                      {getStatusIcon(payment.status)}
                      <span className="ml-1">{getStatusLabel(payment.status)}</span>
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {payment.students?.full_name || payment.payer_email}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                <CreditCard className="h-4 w-4" />
                <span>{getPaymentMethodLabel(payment.payment_method || '')}</span>
              </div>

              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                <User className="h-4 w-4" />
                <span>{payment.payer_email}</span>
              </div>

              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                <Package className="h-4 w-4" />
                <span>{payment.external_reference || 'N/A'}</span>
              </div>

              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                <Calendar className="h-4 w-4" />
                <span>{format(new Date(payment.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</span>
              </div>
            </div>

            {payment.mercadopago_payment_id && (
              <div className="mt-3 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  <strong>ID Mercado Pago:</strong> {payment.mercadopago_payment_id}
                </p>
                {payment.preference_id && (
                  <p className="text-xs text-gray-600 dark:text-gray-300">
                    <strong>Preference ID:</strong> {payment.preference_id}
                  </p>
                )}
              </div>
            )}

            {payment.metadata && (
              <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  {payment.metadata.package_name && (
                    <span><strong>Pacote:</strong> {payment.metadata.package_name}<br /></span>
                  )}
                  {payment.metadata.graduation_class && (
                    <span><strong>Turma:</strong> {payment.metadata.graduation_class}<br /></span>
                  )}
                  {payment.metadata.installments && payment.metadata.installments > 1 && (
                    <span><strong>Parcelas:</strong> {payment.metadata.installments}x<br /></span>
                  )}
                  {payment.metadata.discount && payment.metadata.discount > 0 && (
                    <span><strong>Desconto:</strong> {payment.metadata.discount}%<br /></span>
                  )}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredPayments.length === 0 && (
        <div className="text-center py-12">
          <DollarSign className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Nenhum pagamento encontrado</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            {searchTerm ? 'Tente ajustar os filtros de busca' : 'Os pagamentos aparecerão aqui quando os formandos efetuarem pagamentos'}
          </p>
        </div>
      )}
    </div>
  );
};