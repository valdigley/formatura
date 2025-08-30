import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Database } from '../../types/database';
import { X, Save, BookOpen, Calendar, MapPin, FileText, Users } from 'lucide-react';

type GraduationClassInsert = Database['public']['Tables']['graduation_classes']['Insert'];
type GraduationClass = Database['public']['Tables']['graduation_classes']['Row'];

interface ClassFormProps {
  onClose: () => void;
  onSuccess: () => void;
  graduationClass?: GraduationClass;
}

export const ClassForm: React.FC<ClassFormProps> = ({ onClose, onSuccess, graduationClass }) => {
  const [formData, setFormData] = useState<GraduationClassInsert>({
    user_id: '',
    name: graduationClass?.name || '',
    responsible_name: graduationClass?.responsible_name || '',
    responsible_whatsapp: graduationClass?.responsible_whatsapp || '',
    school_name: graduationClass?.school_name || '',
    graduation_year: graduationClass?.graduation_year || new Date().getFullYear(),
    course: graduationClass?.course || '',
    student_count: graduationClass?.student_count || 0,
    session_date: graduationClass?.session_date || '',
    location: graduationClass?.location || '',
    notes: graduationClass?.notes || '',
    status: graduationClass?.status || 'em_andamento',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const dataToSave = { 
        ...formData, 
        user_id: user.id,
        session_date: formData.session_date || null,
        responsible_whatsapp: formData.responsible_whatsapp ? (() => {
          let clean = formData.responsible_whatsapp.replace(/\D/g, '');
          if (clean.startsWith('55') && clean.length > 11) {
            clean = clean.substring(2);
          }
          return clean;
        })() : ''
      };

      if (graduationClass) {
        const { error } = await supabase
          .from('graduation_classes')
          .update({ ...dataToSave, updated_at: new Date().toISOString() })
          .eq('id', graduationClass.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('graduation_classes').insert([dataToSave]);
        if (error) throw error;
      }
      
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar turma de formatura');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof GraduationClassInsert, value: any) => {
    if (field === 'responsible_whatsapp') {
      // Remove all non-digit characters for database storage
      let cleanValue = value.replace(/\D/g, '');
      // Remove country code '55' if present at the beginning
      if (cleanValue.startsWith('55') && cleanValue.length > 11) {
        cleanValue = cleanValue.substring(2);
      }
      setFormData(prev => ({ ...prev, [field]: cleanValue }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {graduationClass ? 'Editar Turma de Formatura' : 'Nova Turma de Formatura'}
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
                <BookOpen className="h-5 w-5 mr-2" />
                Informações da Turma
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nome da Turma *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  placeholder="Ex: Turma de Medicina 2024"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Responsável pela Turma *
                </label>
                <input
                  type="text"
                  value={formData.responsible_name || ''}
                  onChange={(e) => handleChange('responsible_name', e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  placeholder="Nome do responsável pela turma"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  WhatsApp do Responsável *
                </label>
                <input
                  type="tel"
                  value={formData.responsible_whatsapp || ''}
                  onChange={(e) => handleChange('responsible_whatsapp', e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  placeholder="11999999999"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nome da Escola/Instituição *
                </label>
                <input
                  type="text"
                  value={formData.school_name}
                  onChange={(e) => handleChange('school_name', e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  placeholder="Nome da instituição de ensino"
                />
              </div>
            </div>

            {/* Additional Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Informações Adicionais
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Ano *
                </label>
                <input
                  type="number"
                  value={formData.graduation_year}
                  onChange={(e) => handleChange('graduation_year', parseInt(e.target.value))}
                  required
                  min="2020"
                  max="2030"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Curso *
                </label>
                <input
                  type="text"
                  value={formData.course || ''}
                  onChange={(e) => handleChange('course', e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  placeholder="Ex: Medicina, Direito, Engenharia"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Número de Formandos *
                </label>
                <input
                  type="number"
                  value={formData.student_count}
                  onChange={(e) => handleChange('student_count', parseInt(e.target.value) || 0)}
                  required
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  placeholder="Quantidade de formandos"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status *
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="em_andamento">Em Andamento</option>
                  <option value="concluido">Concluído</option>
                </select>
              </div>
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              Observações
            </label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
              placeholder="Observações sobre a turma de formatura..."
            />
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
              {graduationClass ? 'Atualizar' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};