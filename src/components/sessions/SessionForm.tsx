import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Database } from '../../types/database';
import { X, Save, Camera, Calendar, MapPin, Clock, FileText, Package, CalendarPlus, Users, User } from 'lucide-react';

type PhotoSessionInsert = Database['public']['Tables']['photo_sessions']['Insert'];
type PhotoSession = Database['public']['Tables']['photo_sessions']['Row'];
type GraduationClass = Database['public']['Tables']['graduation_classes']['Row'];

interface SessionFormProps {
  onClose: () => void;
  onSuccess: () => void;
  photoSession?: PhotoSession;
  graduationClasses: GraduationClass[];
}

export const SessionForm: React.FC<SessionFormProps> = ({ 
  onClose, 
  onSuccess, 
  photoSession, 
  graduationClasses
}) => {
  const [formData, setFormData] = useState<PhotoSessionInsert>({
    user_id: '',
    graduation_class_id: photoSession?.graduation_class_id || null,
    title: photoSession?.title || '',
    description: photoSession?.description || '',
    session_date: photoSession?.session_date || '',
    location: photoSession?.location || 'Estúdio',
    duration_minutes: photoSession?.duration_minutes || 480,
    photographer_name: photoSession?.photographer_name || '',
    status: photoSession?.status || 'scheduled',
    notes: photoSession?.notes || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<GraduationClass | null>(null);

  // Fetch students when graduation class changes
  useEffect(() => {
    if (formData.graduation_class_id) {
      fetchStudents(formData.graduation_class_id);
      const cls = graduationClasses.find(c => c.id === formData.graduation_class_id);
      setSelectedClass(cls || null);
      
      // Auto-generate title if not editing
      if (!photoSession && cls) {
        const title = `Sessão de Formatura - ${cls.course || 'Turma'} ${cls.graduation_year}`;
        setFormData(prev => ({ ...prev, title }));
      }
    } else {
      setStudents([]);
      setSelectedClass(null);
    }
  }, [formData.graduation_class_id, graduationClasses, photoSession]);

  const fetchStudents = async (classId: string) => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('full_name, email, phone')
        .eq('graduation_class_id', classId)
        .eq('status', 'active')
        .order('full_name');
      
      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const dataToSave = { ...formData, user_id: user.id };

      if (photoSession) {
        const { error } = await supabase
          .from('photo_sessions')
          .update({ ...dataToSave, updated_at: new Date().toISOString() })
          .eq('id', photoSession.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('photo_sessions').insert([dataToSave]);
        if (error) throw error;
      }
      
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar sessão fotográfica');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof PhotoSessionInsert, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const generateICalLink = () => {
    if (!formData.session_date || !formData.title || !formData.graduation_class_id) {
      alert('Por favor, preencha a turma, título e data da sessão primeiro.');
      return;
    }

    const startDate = new Date(formData.session_date);
    const endDate = new Date(startDate.getTime() + (formData.duration_minutes || 480) * 60000);
    
    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    // Build description with proper line breaks
    let description = '';
    
    if (formData.photographer_name) {
      description += `📸 FOTÓGRAFO: ${formData.photographer_name}\n\n`;
    }
    
    if (selectedClass) {
      description += '🎓 TURMA DE FORMATURA:\n';
      description += `Turma: ${selectedClass.name}\n`;
      description += `Escola: ${selectedClass.school_name}\n`;
      description += `Ano: ${selectedClass.graduation_year}\n`;
      if (selectedClass.course) {
        description += `Curso: ${selectedClass.course}\n`;
      }
      description += '\n';
      
      description += '👤 CONTATO DO RESPONSÁVEL:\n';
      if (selectedClass.responsible_name) {
        description += `Nome: ${selectedClass.responsible_name}\n`;
      }
      if (selectedClass.responsible_whatsapp) {
        description += `WhatsApp: ${selectedClass.responsible_whatsapp}\n`;
      }
      description += '\n';
    }
    
    if (students.length > 0) {
      description += '👥 LISTA DE FORMANDOS:\n';
      students.forEach((student, index) => {
        description += `${index + 1}. ${student.full_name} - ${student.phone} - ${student.email}\n`;
      });
      description += '\n';
    }
    
    if (formData.description) {
      description += `📋 DESCRIÇÃO:\n${formData.description}\n\n`;
    }
    
    if (formData.notes) {
      description += '📝 OBSERVAÇÕES:\n';
      description += formData.notes;
    }

    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(formData.title)}&dates=${formatDate(startDate)}/${formatDate(endDate)}&details=${encodeURIComponent(description)}&location=${encodeURIComponent(formData.location || '')}`;
    
    window.open(googleCalendarUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-xs sm:max-w-md md:max-w-3xl lg:max-w-5xl xl:max-w-6xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
            {photoSession ? 'Editar Sessão Fotográfica' : 'Nova Sessão Fotográfica'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Step 1: Turma Selection */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center mb-4">
              <Users className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
              1. Selecionar Turma de Formatura *
            </h3>
            
            <div>
              <select
                value={formData.graduation_class_id || ''}
                onChange={(e) => handleChange('graduation_class_id', e.target.value || null)}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Selecione uma turma de formatura</option>
                {graduationClasses.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    <span className="hidden sm:inline">{cls.name} - {cls.school_name} ({cls.graduation_year})</span>
                    <span className="sm:hidden">{cls.name}</span>
                  </option>
                ))}
              </select>
            </div>

            {/* Class Info Preview */}
            {selectedClass && (
              <div className="mt-4 p-4 bg-white dark:bg-gray-700 rounded-lg border border-blue-200 dark:border-blue-700">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Escola:</span>
                    <div className="text-gray-900 dark:text-white">{selectedClass.school_name}</div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Curso:</span>
                    <div className="text-gray-900 dark:text-white">{selectedClass.course || 'N/A'}</div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Responsável:</span>
                    <div className="text-gray-900 dark:text-white">{selectedClass.responsible_name || 'N/A'}</div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">WhatsApp:</span>
                    <div className="text-gray-900 dark:text-white">{selectedClass.responsible_whatsapp || 'N/A'}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Students Preview */}
            {students.length > 0 && (
              <div className="mt-4 p-4 bg-white dark:bg-gray-700 rounded-lg border border-blue-200 dark:border-blue-700">
                <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                  <User className="h-4 w-4 mr-2" />
                  Formandos da Turma ({students.length})
                </h4>
                <div className="max-h-32 overflow-y-auto">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {students.map((student, index) => (
                      <div key={index} className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 p-2 bg-gray-50 dark:bg-gray-600 rounded truncate">
                        {student.full_name}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Step 2: Session Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                <Camera className="h-5 w-5 mr-2 text-purple-600 dark:text-purple-400" />
                2. Detalhes da Sessão
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Título da Sessão *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  placeholder="Ex: Sessão de Formatura - Medicina 2024"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <Calendar className="h-4 w-4 inline mr-1" />
                    Data e Hora *
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.session_date ? new Date(formData.session_date).toISOString().slice(0, 16) : ''}
                    onChange={(e) => handleChange('session_date', e.target.value ? new Date(e.target.value).toISOString() : null)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <Clock className="h-4 w-4 inline mr-1" />
                    Duração (horas) *
                  </label>
                  <select
                    value={formData.duration_minutes ? formData.duration_minutes / 60 : 8}
                    onChange={(e) => handleChange('duration_minutes', parseFloat(e.target.value) * 60)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value={2}>2 horas</option>
                    <option value={3}>3 horas</option>
                    <option value={4}>4 horas</option>
                    <option value={6}>6 horas</option>
                    <option value={8}>8 horas</option>
                    <option value={10}>10 horas</option>
                    <option value={12}>12 horas</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <MapPin className="h-4 w-4 inline mr-1" />
                    Local da Sessão *
                  </label>
                  <input
                    type="text"
                    value={formData.location || ''}
                    onChange={(e) => handleChange('location', e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                    placeholder="Ex: Estúdio, Escola, Parque"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <Camera className="h-4 w-4 inline mr-1" />
                    Fotógrafo Responsável
                  </label>
                  <input
                    type="text"
                    value={formData.photographer_name || ''}
                    onChange={(e) => handleChange('photographer_name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                    placeholder="Nome do fotógrafo"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status da Sessão
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="scheduled">📅 Agendada</option>
                  <option value="in_progress">🔄 Em Progresso</option>
                  <option value="completed">✅ Concluída</option>
                  <option value="cancelled">❌ Cancelada</option>
                </select>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                <FileText className="h-5 w-5 mr-2 text-green-600 dark:text-green-400" />
                3. Informações Adicionais
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Descrição da Sessão
                </label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => handleChange('description', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  placeholder="Descreva os detalhes da sessão fotográfica, estilo desejado, locais específicos, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Observações Especiais
                </label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  placeholder="Observações importantes, requisitos especiais, cores específicas, etc."
                />
              </div>

              {/* Production Details (for editing) */}
              {photoSession && (
                <div className="space-y-4 pt-4 border-t border-gray-200">
                  <h4 className="font-medium text-gray-900">Controle de Produção</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fotos Capturadas
                      </label>
                      <input
                        type="number"
                        value={formData.photos_taken || 0}
                        onChange={(e) => handleChange('photos_taken', parseInt(e.target.value) || 0)}
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fotos Entregues
                      </label>
                      <input
                        type="number"
                        value={formData.photos_delivered || 0}
                        onChange={(e) => handleChange('photos_delivered', parseInt(e.target.value) || 0)}
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Data de Entrega
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.delivery_date ? new Date(formData.delivery_date).toISOString().slice(0, 16) : ''}
                      onChange={(e) => handleChange('delivery_date', e.target.value ? new Date(e.target.value).toISOString() : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
            >
              Cancelar
            </button>
            
            <button
              type="button"
              onClick={generateICalLink}
              disabled={!formData.session_date || !formData.title || !formData.graduation_class_id}
              className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              <CalendarPlus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Agendar no Google</span>
              <span className="sm:hidden">Google Agenda</span>
            </button>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {photoSession ? 'Atualizar Sessão' : 'Criar Sessão'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};