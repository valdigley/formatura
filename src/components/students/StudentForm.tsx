import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Database } from '../../types/database';
import { X, Save, User, Mail, Phone, MapPin, Calendar, FileText, Package, CreditCard } from 'lucide-react';

type StudentInsert = Database['public']['Tables']['students']['Insert'];
type Student = Database['public']['Tables']['students']['Row'];
type GraduationClass = Database['public']['Tables']['graduation_classes']['Row'];
type PhotoPackage = Database['public']['Tables']['photo_packages']['Row'];

interface PaymentSelection {
  package_id: string;
  payment_method: string;
  installments?: number;
  discount?: number;
  final_price?: number;
}

interface StudentFormProps {
  onClose: () => void;
  onSuccess: () => void;
  student?: Student;
  graduationClasses: GraduationClass[];
  photoPackages?: PhotoPackage[];
}

export const StudentForm: React.FC<StudentFormProps> = ({ 
  onClose, 
  onSuccess, 
  student, 
  graduationClasses,
  photoPackages = []
}) => {
  const [formData, setFormData] = useState<StudentInsert>({
    user_id: '',
    full_name: student?.full_name || '',
    email: student?.email || '',
    phone: student?.phone || '',
    cpf: student?.cpf || '',
    birth_date: student?.birth_date || '',
    address: student?.address || '',
    emergency_contact: student?.emergency_contact || '',
    graduation_class_id: student?.graduation_class_id || null,
    notes: student?.notes || '',
    status: student?.status || 'active',
  });
  const [selectedPackage, setSelectedPackage] = useState<string>('');
  const [paymentSelection, setPaymentSelection] = useState<PaymentSelection | null>(null);
  const [availablePaymentMethods, setAvailablePaymentMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Update available payment methods when package changes
  React.useEffect(() => {
    if (selectedPackage) {
      const pkg = photoPackages.find(p => p.id === selectedPackage);
      if (pkg && pkg.features && Array.isArray(pkg.features)) {
        const methods = pkg.features.filter((f: any) => f.method);
        setAvailablePaymentMethods(methods);
        
        // Reset payment selection when package changes
        setPaymentSelection(null);
      }
    } else {
      setAvailablePaymentMethods([]);
      setPaymentSelection(null);
    }
  }, [selectedPackage, photoPackages]);

  const calculateFinalPrice = (basePrice: number, discount: number = 0) => {
    return basePrice * (1 - discount / 100);
  };

  const handlePaymentMethodChange = (methodData: any) => {
    const pkg = photoPackages.find(p => p.id === selectedPackage);
    if (!pkg) return;

    const finalPrice = calculateFinalPrice(pkg.price, methodData.discount || 0);
    
    setPaymentSelection({
      package_id: selectedPackage,
      payment_method: methodData.method,
      installments: methodData.installments || 1,
      discount: methodData.discount || 0,
      final_price: finalPrice,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const dataToSave = { ...formData, user_id: user.id };

      if (student) {
        const { error } = await supabase
          .from('students')
          .update({ ...dataToSave, updated_at: new Date().toISOString() })
          .eq('id', student.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('students').insert([dataToSave]);
        if (error) throw error;
        
        // If payment selection exists, we could store it in a separate table
        // For now, we'll add it to the student notes
        if (paymentSelection) {
          const pkg = photoPackages.find(p => p.id === selectedPackage);
          const paymentInfo = `\n\nPacote Selecionado: ${pkg?.name}\nForma de Pagamento: ${paymentSelection.payment_method}\nPreço Final: R$ ${paymentSelection.final_price?.toLocaleString('pt-BR')}`;
          
          // Update the student with payment info in notes
          const { data: insertedStudent } = await supabase
            .from('students')
            .select('id')
            .eq('user_id', user.id)
            .eq('email', formData.email)
            .single();
            
          if (insertedStudent) {
            await supabase
              .from('students')
              .update({ 
                notes: (formData.notes || '') + paymentInfo,
                updated_at: new Date().toISOString()
              })
              .eq('id', insertedStudent.id);
          }
        }
      }
      
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar formando');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof StudentInsert, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {student ? 'Editar Formando' : 'Adicionar Novo Formando'}
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
            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                <User className="h-5 w-5 mr-2" />
                Informações Pessoais
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => handleChange('full_name', e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  placeholder="Nome e sobrenome completos"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Digite nome e sobrenome separados (obrigatório para pagamentos)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  CPF
                </label>
                <input
                  type="text"
                  value={formData.cpf || ''}
                  onChange={(e) => handleChange('cpf', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  placeholder="000.000.000-00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Data de Nascimento
                </label>
                <input
                  type="date"
                  value={formData.birth_date || ''}
                  onChange={(e) => handleChange('birth_date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                  <option value="graduated">Formado</option>
                </select>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                <Phone className="h-5 w-5 mr-2" />
                Contato
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  placeholder="email@exemplo.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Telefone *
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  placeholder="(11) 99999-9999"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Turma de Formatura
                </label>
                <select
                  value={formData.graduation_class_id || ''}
                  onChange={(e) => handleChange('graduation_class_id', e.target.value || null)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Selecione uma turma</option>
                  {graduationClasses.map((cls) => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <Package className="h-4 w-4 inline mr-1" />
                  Pacote Fotográfico
                </label>
                <select
                  value={selectedPackage}
                  onChange={(e) => setSelectedPackage(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Selecione um pacote (opcional)</option>
                  {photoPackages.filter(pkg => pkg.is_active).map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name} - R$ {pkg.price.toLocaleString('pt-BR')}
                    </option>
                  ))}
                </select>
                {selectedPackage && (
                  <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    {(() => {
                      const pkg = photoPackages.find(p => p.id === selectedPackage);
                      return pkg ? (
                        <div>
                          <div className="font-medium text-blue-800 dark:text-blue-300 mb-1">{pkg.name}</div>
                          <div className="text-sm text-blue-600 dark:text-blue-400">R$ {pkg.price.toLocaleString('pt-BR')}</div>
                          {pkg.description && (
                            <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">{pkg.description}</div>
                          )}
                        </div>
                      ) : null;
                    })()}
                  </div>
                )}
              </div>

              {/* Payment Method Selection */}
              {selectedPackage && availablePaymentMethods.length > 0 && (
                <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <h4 className="font-medium text-green-800 dark:text-green-300 mb-3 flex items-center">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Escolha a Forma de Pagamento
                  </h4>
                  <div className="space-y-2">
                    {availablePaymentMethods.map((method, index) => {
                      const pkg = photoPackages.find(p => p.id === selectedPackage);
                      const finalPrice = pkg ? calculateFinalPrice(pkg.price, method.discount || 0) : 0;
                      
                      return (
                        <label key={index} className="flex items-center p-3 bg-white dark:bg-gray-700 border border-green-200 dark:border-green-700 rounded-lg cursor-pointer hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors">
                          <input
                            type="radio"
                            name="paymentMethod"
                            value={method.method}
                            onChange={() => handlePaymentMethodChange(method)}
                            className="h-4 w-4 text-green-600 focus:ring-green-500"
                          />
                          <div className="ml-3 flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-gray-900 dark:text-white">
                                {method.method === 'dinheiro' && '💵 Dinheiro'}
                                {method.method === 'pix' && '📱 PIX'}
                                {method.method === 'cartao' && '💳 Cartão'}
                                {method.method === 'transferencia' && '🏦 Transferência'}
                                {method.method === 'parcelado' && '📊 Parcelado'}
                              </span>
                              <div className="text-right">
                                {method.installments > 1 && (
                                  <div className="text-sm text-gray-600 dark:text-gray-300">{method.installments}x</div>
                                )}
                                {method.discount > 0 && (
                                  <div className="text-sm text-green-600 dark:text-green-400">-{method.discount}%</div>
                                )}
                                <div className="font-bold text-gray-900 dark:text-white">
                                  R$ {finalPrice.toLocaleString('pt-BR')}
                                </div>
                              </div>
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Contato de Emergência
                </label>
                <input
                  type="text"
                  value={formData.emergency_contact || ''}
                  onChange={(e) => handleChange('emergency_contact', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  placeholder="Nome e telefone do contato de emergência"
                />
              </div>
            </div>
          </div>

          {/* Address and Notes */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <MapPin className="h-4 w-4 inline mr-1" />
                Endereço
              </label>
              <textarea
                value={formData.address || ''}
                onChange={(e) => handleChange('address', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                placeholder="Endereço completo"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <FileText className="h-4 w-4 inline mr-1" />
                Observações
              </label>
              <textarea
                value={formData.notes || ''}
                onChange={(e) => handleChange('notes', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                placeholder="Observações adicionais sobre o formando"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {student ? 'Atualizar' : 'Salvar'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};