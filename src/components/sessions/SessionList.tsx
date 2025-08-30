import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Database } from '../../types/database';
import { Plus, Search, Filter, Edit, Trash2, Calendar, Clock, MapPin, Users, Camera } from 'lucide-react';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { SessionForm } from './SessionForm';

type PhotoSession = Database['public']['Tables']['photo_sessions']['Row'];
type GraduationClass = Database['public']['Tables']['graduation_classes']['Row'];

export const SessionList: React.FC = () => {
  const [sessions, setSessions] = useState<PhotoSession[]>([]);
  const [graduationClasses, setGraduationClasses] = useState<GraduationClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSession, setEditingSession] = useState<PhotoSession | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [sessionsResult, classesResult, packagesResult] = await Promise.all([
        supabase
          .from('photo_sessions')
          .select(`
            *,
            graduation_classes(name, school_name)
          `)
          .eq('user_id', user.id)
          .order('session_date', { ascending: true }),
        supabase
          .from('graduation_classes')
          .select('*')
          .eq('user_id', user.id)
          .in('status', ['em_andamento', 'concluido'])
      ]);

      if (sessionsResult.error) throw sessionsResult.error;
      if (classesResult.error) throw classesResult.error;

      setSessions(sessionsResult.data || []);
      setGraduationClasses(classesResult.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSessions = sessions.filter(session => {
    const matchesSearch = session.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (session.description && session.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || session.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const deleteSession = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta sessão fotográfica?')) return;
    
    try {
      const { error } = await supabase.from('photo_sessions').delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-orange-100 text-orange-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'scheduled': return 'Agendada';
      case 'in_progress': return 'Em Progresso';
      case 'completed': return 'Concluída';
      case 'cancelled': return 'Cancelada';
      default: return status;
    }
  };

  const getDateLabel = (date: string) => {
    if (!date) return 'Sem data';
    const sessionDate = new Date(date);
    if (isToday(sessionDate)) return 'Hoje';
    if (isTomorrow(sessionDate)) return 'Amanhã';
    if (isPast(sessionDate)) return 'Passada';
    return format(sessionDate, 'dd/MM/yyyy', { locale: ptBR });
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
          <h1 className="text-2xl font-bold text-gray-900">Sessões Fotográficas</h1>
          <p className="text-gray-600 mt-1">Gerencie agendamentos de sessões fotográficas de formatura</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nova Sessão Fotográfica
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
                placeholder="Buscar sessões fotográficas..."
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
              <option value="scheduled">Agendada</option>
              <option value="in_progress">Em Progresso</option>
              <option value="completed">Concluída</option>
              <option value="cancelled">Cancelada</option>
            </select>
          </div>
        </div>
      </div>

      {/* Sessions List */}
      <div className="space-y-4">
        {filteredSessions.map((session) => {
          const sessionDate = session.session_date ? new Date(session.session_date) : null;
          const isUpcoming = sessionDate && !isPast(sessionDate) && session.status === 'scheduled';
          
          return (
            <div
              key={session.id}
              className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border-2 p-6 hover:shadow-md transition-all ${
                isUpcoming ? 'border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="h-10 w-10 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                      <Camera className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{session.title}</h3>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
                          {getStatusLabel(session.status)}
                        </span>
                        {isUpcoming && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-300">
                            Próxima
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {session.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{session.description}</p>
                  )}
                </div>
                
                <div className="flex space-x-1">
                  <button 
                    onClick={() => setEditingSession(session)}
                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => deleteSession(session.id)}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                  <Calendar className="h-4 w-4" />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {session.session_date ? getDateLabel(session.session_date) : 'Sem data'}
                    </div>
                    {session.session_date && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {format(new Date(session.session_date), 'HH:mm', { locale: ptBR })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                  <MapPin className="h-4 w-4" />
                  <span>{session.location || 'Local não definido'}</span>
                </div>

                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                  <Clock className="h-4 w-4" />
                  <span>{session.duration_minutes} min</span>
                </div>

                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                  <Camera className="h-4 w-4" />
                  <span>{session.photos_taken} fotos</span>
                </div>
              </div>

              {session.graduation_class_id && (
                <div className="mt-3 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    <strong>Turma:</strong> {graduationClasses.find(c => c.id === session.graduation_class_id)?.name || 'N/A'}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredSessions.length === 0 && (
        <div className="text-center py-12">
          <Camera className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Nenhuma sessão fotográfica encontrada</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            {searchTerm ? 'Tente ajustar os filtros de busca' : 'Comece agendando sua primeira sessão fotográfica'}
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Agendar Primeira Sessão
          </button>
        </div>
      )}

      {/* Forms */}
      {showAddForm && (
        <SessionForm
          onClose={() => setShowAddForm(false)}
          onSuccess={fetchData}
          graduationClasses={graduationClasses}
        />
      )}

      {editingSession && (
        <SessionForm
          photoSession={editingSession}
          onClose={() => setEditingSession(null)}
          onSuccess={fetchData}
          graduationClasses={graduationClasses}
        />
      )}
    </div>
  );
};