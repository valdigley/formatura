import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Database } from '../../types/database';
import { X, Save, Package, DollarSign, CreditCard, Plus, Trash2, CheckCircle, Minus } from 'lucide-react';

type PhotoPackageInsert = Database['public']['Tables']['photo_packages']['Insert'];
type PhotoPackage = Database['public']['Tables']['photo_packages']['Row'];

interface PackageFormProps {
  onClose: () => void;
  onSuccess: () => void;
  photoPackage?: PhotoPackage;
}

interface PaymentCondition {
  method: string;
  installments: number;
  discount?: number;
}
export const PackageForm: React.FC<PackageFormProps> = ({ onClose, onSuccess, photoPackage }) => {
  const [formData, setFormData] = useState<PhotoPackageInsert>({
    user_id: '',
    name: photoPackage?.name || '',
    description: photoPackage?.description || '',
    price: photoPackage?.price || 0,
    features: photoPackage?.features || [],
    is_active: photoPackage?.is_active ?? true,
  });
  const [paymentConditions, setPaymentConditions] = useState<PaymentCondition[]>(
    photoPackage?.features && Array.isArray(photoPackage.features) && photoPackage.features.some((f: any) => f.method)
      ? photoPackage.features.filter((f: any) => f.method)
      : [{ method: 'dinheiro', installments: 1 }]
  );
  const [newFeature, setNewFeature] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Combine features and payment conditions
      const textFeatures = Array.isArray(formData.features) 
        ? formData.features.filter((f: any) => typeof f === 'string')
        : [];
      
      const allFeatures = [...textFeatures, ...paymentConditions];
      
      const dataToSave = { 
        ...formData, 
        user_id: user.id,
        features: allFeatures
      };

      if (photoPackage) {
        const { error } = await supabase
          .from('photo_packages')
          .update({ ...dataToSave, updated_at: new Date().toISOString() })
          .eq('id', photoPackage.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('photo_packages').insert([dataToSave]);
        if (error) throw error;
      }
      
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar pacote fotográfico');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof PhotoPackageInsert, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addFeature = () => {
    if (newFeature.trim()) {
      const currentFeatures = Array.isArray(formData.features) 
        ? formData.features.filter((f: any) => typeof f === 'string')
        : [];
      setFormData(prev => ({ 
        ...prev, 
        features: [...currentFeatures, newFeature.trim()] 
      }));
      setNewFeature('');
    }
  };

  const removeFeature = (index: number) => {
    const currentFeatures = Array.isArray(formData.features) 
      ? formData.features.filter((f: any) => typeof f === 'string')
      : [];
    setFormData(prev => ({ 
      ...prev, 
      features: currentFeatures.filter((_, i) => i !== index) 
    }));
  };

  const addPaymentCondition = () => {
    setPaymentConditions(prev => [...prev, { method: 'dinheiro', installments: 1 }]);
  };

  const removePaymentCondition = (index: number) => {
    if (paymentConditions.length > 1) {
      setPaymentConditions(prev => prev.filter((_, i) => i !== index));
    }
  };

  const updatePaymentCondition = (index: number, field: keyof PaymentCondition, value: any) => {
    setPaymentConditions(prev => prev.map((condition, i) => 
      i === index ? { ...condition, [field]: value } : condition
    ));
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'dinheiro': return 'Dinheiro';
      case 'pix': return 'PIX';
      case 'cartao': return 'Cartão';
      case 'transferencia': return 'Transferência';
      case 'parcelado': return 'Parcelado';
      default: return method;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {photoPackage ? 'Editar Pacote Fotográfico' : 'Novo Pacote Fotográfico'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                <Package className="h-5 w-5 mr-2" />
                Informações do Pacote
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nome do Pacote *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  placeholder="Ex: Pacote Básico de Formatura"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Descrição
                </label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => handleChange('description', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  placeholder="Descrição do pacote fotográfico..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <select
                  value={formData.is_active ? 'true' : 'false'}
                  onChange={(e) => handleChange('is_active', e.target.value === 'true')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="true">Ativo</option>
                  <option value="false">Inativo</option>
                </select>
              </div>
            </div>

            {/* Pricing and Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                <CreditCard className="h-5 w-5 mr-2" />
                Preço e Pagamento
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Preço (R$) *
                </label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => handleChange('price', parseFloat(e.target.value) || 0)}
                  required
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* Payment Conditions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Condições de Pagamento *
              </label>
              <button
                type="button"
                onClick={addPaymentCondition}
                className="inline-flex items-center px-2 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-3 w-3 mr-1" />
                Adicionar
              </button>
            </div>
            <div className="space-y-3">
              {paymentConditions.map((condition, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex-1">
                    <select
                      value={condition.method}
                      onChange={(e) => updatePaymentCondition(index, 'method', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-600 text-gray-900 dark:text-white"
                    >
                      <option value="dinheiro">Dinheiro</option>
                      <option value="pix">PIX</option>
                      <option value="cartao">Cartão</option>
                      <option value="transferencia">Transferência</option>
                      <option value="parcelado">Parcelado</option>
                    </select>
                  </div>
                  
                  {(condition.method === 'parcelado' || condition.method === 'cartao') && (
                    <div className="w-24">
                      <input
                        type="number"
                        value={condition.installments}
                        onChange={(e) => updatePaymentCondition(index, 'installments', parseInt(e.target.value) || 1)}
                        min="1"
                        max="12"
                        className="w-full px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                        placeholder="Parcelas"
                      />
                    </div>
                  )}
                  
                  <div className="w-20">
                    <input
                      type="number"
                      value={condition.discount || ''}
                      onChange={(e) => updatePaymentCondition(index, 'discount', parseFloat(e.target.value) || 0)}
                      min="0"
                      max="100"
                      step="0.1"
                      className="w-full px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                      placeholder="% Desc"
                    />
                  </div>
                  
                  {paymentConditions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePaymentCondition(index)}
                      className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Configure as diferentes formas de pagamento aceitas para este pacote
            </p>
          </div>

          {/* Features */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Recursos Inclusos
            </label>
            <div className="space-y-2">
              {Array.isArray(formData.features) && 
                formData.features
                  .filter((feature: any) => typeof feature === 'string')
                  .map((feature, index) => (
                    <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <CheckCircle className="h-4 w-4 text-green-500 dark:text-green-400" />
                      <span className="flex-1 text-sm text-gray-900 dark:text-white">{feature}</span>
                      <button
                        type="button"
                        onClick={() => removeFeature(index)}
                        className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newFeature}
                  onChange={(e) => setNewFeature(e.target.value)}
                  placeholder="Adicionar novo recurso..."
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                />
                <button
                  type="button"
                  onClick={addFeature}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {photoPackage ? 'Atualizar' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};