import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { User, Mail, Phone, MapPin, Calendar, FileText, Camera, CheckCircle, AlertCircle } from 'lucide-react';

export const PublicStudentForm: React.FC = () => {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    cpf: '',
    birth_date: '',
    address: '',
    emergency_contact: '',
    notes: '',
  });
  const [studentInfo, setStudentInfo] = useState<any>(null);
  const [classInfo, setClassInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Get URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const studentId = urlParams.get('student_id');
    const name = urlParams.get('name');
    const email = urlParams.get('email');
    const phone = urlParams.get('phone');
    const classId = urlParams.get('class_id');

    if (name || email || phone) {
      setFormData(prev => ({
        ...prev,
        full_name: name || '',
        email: email || '',
        phone: phone || '',
      }));
    }

    if (studentId) {
      fetchStudentInfo(studentId);
    }

    if (classId) {
      fetchClassInfo(classId);
    }
  }, []);

  const fetchStudentInfo = async (studentId: string) => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('id', studentId)
        .single();
      
      if (error) throw error;
      setStudentInfo(data);
      
      if (data) {
        setFormData({
          full_name: data.full_name || '',
          email: data.email || '',
          phone: data.phone || '',
          cpf: data.cpf || '',
          birth_date: data.birth_date || '',
          address: data.address || '',
          emergency_contact: data.emergency_contact || '',
          notes: data.notes || '',
        });
      }
    } catch (error) {
      console.error('Error fetching student info:', error);
    }
  };

  const fetchClassInfo = async (classId: string) => {
    try {
      const { data, error } = await supabase
        .from('graduation_classes')
        .select('*')
        .eq('id', classId)
        .single();
      
      if (error) throw error;
      setClassInfo(data);
    } catch (error) {
      console.error('Error fetching class info:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!studentInfo) {
        throw new Error('Informações do formando não encontradas');
      }

      // Update student information
      const { error } = await supabase
        .from('students')
        .update({
          ...formData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', studentInfo.id);

      if (error) throw error;
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar informações');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Informações Enviadas!</h2>
          <p className="text-gray-600 mb-6">
            Suas informações foram atualizadas com sucesso. O fotógrafo entrará em contato em breve.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Próximos passos:</strong><br />
              • Aguarde o contato do fotógrafo<br />
              • Confirme a data da sessão fotográfica<br />
              • Prepare-se para o grande dia!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6 text-white">
            <div className="flex items-center space-x-3 mb-2">
              <Camera className="h-8 w-8" />
              <h1 className="text-2xl font-bold">Formulário do Formando</h1>
            </div>
            <p className="text-blue-100">Complete suas informações para a sessão fotográfica de formatura</p>
          </div>

          {/* Class Info */}
          {classInfo && (
            <div className="bg-blue-50 border-b border-blue-200 px-8 py-4">
              <h3 className="font-semibold text-blue-900 mb-2">Informações da Turma</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-blue-700">Turma:</span>
                  <div className="font-medium text-blue-900">{classInfo.name}</div>
                </div>
                <div>
                  <span className="text-blue-700">Escola:</span>
                  <div className="font-medium text-blue-900">{classInfo.school_name}</div>
                </div>
                <div>
                  <span className="text-blue-700">Curso:</span>
                  <div className="font-medium text-blue-900">{classInfo.course || 'N/A'}</div>
                </div>
                <div>
                  <span className="text-blue-700">Ano:</span>
                  <div className="font-medium text-blue-900">{classInfo.graduation_year}</div>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 flex items-center border-b border-gray-200 pb-2">
                  <User className="h-5 w-5 mr-2 text-blue-600" />
                  Informações Pessoais
                </h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => handleChange('full_name', e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Seu nome completo"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CPF
                  </label>
                  <input
                    type="text"
                    value={formData.cpf}
                    onChange={(e) => handleChange('cpf', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="000.000.000-00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data de Nascimento
                  </label>
                  <input
                    type="date"
                    value={formData.birth_date}
                    onChange={(e) => handleChange('birth_date', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 flex items-center border-b border-gray-200 pb-2">
                  <Phone className="h-5 w-5 mr-2 text-blue-600" />
                  Contato
                </h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="seu@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefone/WhatsApp *
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="(11) 99999-9999"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contato de Emergência
                  </label>
                  <input
                    type="text"
                    value={formData.emergency_contact}
                    onChange={(e) => handleChange('emergency_contact', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Nome e telefone"
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                <MapPin className="h-4 w-4 mr-2 text-blue-600" />
                Endereço Completo
              </label>
              <textarea
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Rua, número, bairro, cidade, CEP"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                <FileText className="h-4 w-4 mr-2 text-blue-600" />
                Observações Especiais
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Alguma informação especial que gostaria de compartilhar sobre a sessão fotográfica..."
              />
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all transform hover:scale-105"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                ) : (
                  <CheckCircle className="h-5 w-5 mr-2" />
                )}
                {loading ? 'Enviando...' : 'Confirmar Informações'}
              </button>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600">
                <strong>Importante:</strong> Preencha todas as informações com cuidado. 
                Estes dados serão utilizados para organizar sua sessão fotográfica de formatura.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};