import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Database } from '../../types/database';
import { X, Save, DollarSign, User, Calendar, CreditCard, Package, FileText, CheckCircle, AlertCircle, Clock, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type PaymentTransaction = Database['public']['Tables']['payment_transactions']['Row'] & {
  students?: {
    full_name: string;
    email: string;
    phone: string;
  };
};

interface PaymentDetailsProps {
  payment: PaymentTransaction;
  onClose: () => void;
  onUpdate: () => void;
}

export const PaymentDetails: React.FC<PaymentDetailsProps> = ({ payment, onClose, onUpdate }) => {
  const [status, setStatus] = useState(payment.status || 'pending');
  const [paymentDate, setPaymentDate] = useState(
    payment.payment_date ? new Date(payment.payment_date).toISOString().slice(0, 16) : ''
  );
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setLoading(true);
    setError('');

    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
        metadata: {
          ...payment.metadata,
          manual_update: true,
          updated_by: 'manual',
          updated_at: new Date().toISOString(),
          notes: notes || undefined
        }
      };

      if (paymentDate) {
        updateData.payment_date = new Date(paymentDate).toISOString();
      }

      const { error } = await supabase
        .from('payment_transactions')
        .update(updateData)
        .eq('id', payment.id);

      if (error) throw error;
      
      onUpdate();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar pagamento');
    } finally {
      setLoading(false);
    }
  };

  const syncWithMercadoPago = async () => {
    if (!payment.mercadopago_payment_id) {
      setError('ID do pagamento no Mercado Pago não encontrado');
      return;
    }

    setSyncing(true);
    setError('');

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
        throw new Error('Configuração do Mercado Pago não encontrada');
      }

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
          payment_id: payment.mercadopago_payment_id
        }),
      });

      const responseData = await response.json();

      if (!response.ok || !responseData.success) {
        throw new Error(responseData.error || 'Erro ao sincronizar com Mercado Pago');
      }

      const mpPayment = responseData.payment;
      
      // Update local payment with MP data
      const { error: updateError } = await supabase
        .from('payment_transactions')
        .update({
          status: mpPayment.status,
          payment_method: mpPayment.payment_method_id || mpPayment.payment_method,
          payment_date: mpPayment.date_approved ? new Date(mpPayment.date_approved).toISOString() : null,
          amount: mpPayment.transaction_amount || payment.amount,
          webhook_data: mpPayment,
          metadata: {
            ...payment.metadata,
            last_sync: new Date().toISOString(),
            sync_source: 'manual',
            mp_status: mpPayment.status,
            mp_status_detail: mpPayment.status_detail
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.id);

      if (updateError) throw updateError;

      // Update local state
      setStatus(mpPayment.status);
      if (mpPayment.date_approved) {
        setPaymentDate(new Date(mpPayment.date_approved).toISOString().slice(0, 16));
      }

      alert(`Sincronização concluída! Status atual: ${mpPayment.status}`);
      onUpdate();
    } catch (err: any) {
      setError(err.message || 'Erro ao sincronizar pagamento');
    } finally {
      setSyncing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-300';
      case 'pending': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'rejected': return 'text-red-600 bg-red-100 dark:bg-red-900/20 dark:text-red-300';
      case 'cancelled': return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20 dark:text-gray-300';
      case 'in_process': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20 dark:text-gray-300';
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
            <DollarSign className="h-6 w-6 mr-2 text-green-600" />
            Gestão de Pagamento
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Payment Overview */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Resumo do Pagamento</h3>
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(status)}`}>
                {getStatusIcon(status)}
                <span className="ml-2">{status === 'approved' ? 'Aprovado' : status === 'pending' ? 'Pendente' : status === 'rejected' ? 'Rejeitado' : status}</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-white dark:bg-gray-700 rounded-lg">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  R$ {Number(payment.amount).toLocaleString('pt-BR')}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Valor Total</div>
              </div>
              
              <div className="text-center p-4 bg-white dark:bg-gray-700 rounded-lg">
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  {payment.payment_method === 'pix' ? 'PIX' : 
                   payment.payment_method === 'credit_card' ? 'Cartão de Crédito' :
                   payment.payment_method === 'debit_card' ? 'Cartão de Débito' :
                   payment.payment_method || 'N/A'}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Método de Pagamento</div>
              </div>
              
              <div className="text-center p-4 bg-white dark:bg-gray-700 rounded-lg">
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  {format(new Date(payment.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Data de Criação</div>
              </div>
            </div>
          </div>

          {/* Customer Information */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <User className="h-5 w-5 mr-2" />
              Informações do Cliente
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome</label>
                <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded border text-gray-900 dark:text-white">
                  {payment.students?.full_name || 'N/A'}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded border text-gray-900 dark:text-white">
                  {payment.payer_email || payment.students?.email || 'N/A'}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Telefone</label>
                <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded border text-gray-900 dark:text-white">
                  {payment.students?.phone || 'N/A'}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Referência Externa</label>
                <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded border text-gray-900 dark:text-white text-xs">
                  {payment.external_reference || 'N/A'}
                </div>
              </div>
            </div>
          </div>

          {/* Payment Management */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <CreditCard className="h-5 w-5 mr-2" />
              Gestão do Pagamento
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status do Pagamento
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="pending">Pendente</option>
                  <option value="approved">Aprovado</option>
                  <option value="rejected">Rejeitado</option>
                  <option value="cancelled">Cancelado</option>
                  <option value="in_process">Em Processamento</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Data do Pagamento
                </label>
                <input
                  type="datetime-local"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Observações da Gestão
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                placeholder="Adicione observações sobre este pagamento..."
              />
            </div>
          </div>

          {/* Technical Details */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Detalhes Técnicos
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">ID da Transação</label>
                <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded border font-mono text-xs text-gray-900 dark:text-white">
                  {payment.id}
                </div>
              </div>
              
              {payment.mercadopago_payment_id && (
                <div>
                  <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">ID Mercado Pago</label>
                  <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded border font-mono text-xs text-gray-900 dark:text-white">
                    {payment.mercadopago_payment_id}
                  </div>
                </div>
              )}
              
              {payment.preference_id && (
                <div>
                  <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Preference ID</label>
                  <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded border font-mono text-xs text-gray-900 dark:text-white">
                    {payment.preference_id}
                  </div>
                </div>
              )}
              
              <div>
                <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Criado em</label>
                <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded border text-gray-900 dark:text-white">
                  {format(new Date(payment.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
                </div>
              </div>
              
              {payment.updated_at && (
                <div>
                  <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Última Atualização</label>
                  <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded border text-gray-900 dark:text-white">
                    {format(new Date(payment.updated_at), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Package Information */}
          {payment.metadata && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <Package className="h-5 w-5 mr-2" />
                Informações do Pacote
              </h3>
              
              <div className="space-y-3 text-sm">
                {payment.metadata.package_name && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Pacote:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{payment.metadata.package_name}</span>
                  </div>
                )}
                
                {payment.metadata.graduation_class && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Turma:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{payment.metadata.graduation_class}</span>
                  </div>
                )}
                
                {payment.metadata.installments && payment.metadata.installments > 1 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Parcelas:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{payment.metadata.installments}x</span>
                  </div>
                )}
                
                {payment.metadata.discount && payment.metadata.discount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Desconto:</span>
                    <span className="font-medium text-green-600 dark:text-green-400">{payment.metadata.discount}%</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Webhook Data */}
          {payment.webhook_data && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Dados do Webhook</h3>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 max-h-40 overflow-y-auto">
                <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {JSON.stringify(payment.webhook_data, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row justify-between space-y-3 sm:space-y-0 sm:space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex space-x-3">
              {payment.mercadopago_payment_id && (
                <button
                  onClick={syncWithMercadoPago}
                  disabled={syncing}
                  className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors"
                >
                  {syncing ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  {syncing ? 'Sincronizando...' : 'Sincronizar com MP'}
                </button>
              )}
            </div>
            
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {loading ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};