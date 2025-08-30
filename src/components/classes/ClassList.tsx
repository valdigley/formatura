import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Database } from '../../types/database';
import { Plus, Search, Filter, Edit, Trash2, Calendar, Users, BookOpen } from 'lucide-react';
import { ClassForm } from './ClassForm';

type GraduationClass = Database['public']['Tables']['graduation_classes']['Row'];

export const ClassList: React.FC = () => {
  const [classes, setClasses] = useState<GraduationClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingClass, setEditingClass] = useState<GraduationClass | null>(null);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from('graduation_classes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setClasses(data || []);
    } catch (error) {
      console.error('Error fetching classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredClasses = classes.filter(cls =>
    cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cls.school_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (cls.course && cls.course.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const deleteClass = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta turma de formatura?')) return;
    
    try {
      const { error } = await supabase.from('graduation_classes').delete().eq('id', id);
      if (error) throw error;
      fetchClasses();
    } catch (error) {
      console.error('Error deleting class:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'em_andamento': return 'bg-orange-100 text-orange-800';
      case 'concluido': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'em_andamento': return 'Em Andamento';
      case 'concluido': return 'Concluído';
      default: return status;
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
          <h1 className="text-2xl font-bold text-gray-900">Turmas de Formatura</h1>
          <p className="text-gray-600 mt-1">Gerencie turmas de formatura para sessões fotográficas</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nova Turma de Formatura
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
                placeholder="Buscar turmas por nome, escola ou curso..."
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
              <option value="em_andamento">Em Andamento</option>
              <option value="concluido">Concluído</option>
            </select>
          </div>
        </div>
      </div>

      {/* Classes Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredClasses.map((cls) => (
          <div
            key={cls.id}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-emerald-100 dark:bg-emerald-900 rounded-full flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{cls.name}</h3>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(cls.status)}`}>
                    {getStatusLabel(cls.status)}
                  </span>
                </div>
              </div>
              <div className="flex space-x-1">
                <button 
                  onClick={() => setEditingClass(cls)}
                  className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => deleteClass(cls.id)}
                  className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {cls.responsible_name && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300">Responsável:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{cls.responsible_name}</span>
                </div>
              )}
              
              {cls.responsible_whatsapp && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300">WhatsApp:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{cls.responsible_whatsapp}</span>
                </div>
              )}
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-300">Escola:</span>
                <span className="font-medium text-gray-900 dark:text-white">{cls.school_name}</span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-300">Ano:</span>
                <span className="font-medium text-gray-900 dark:text-white">{cls.graduation_year}</span>
              </div>

              {cls.course && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300">Curso:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{cls.course}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-300">Formandos:</span>
                <span className="font-medium text-gray-900 dark:text-white">{cls.student_count}</span>
              </div>

              {cls.session_date && (
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                  <Calendar className="h-4 w-4" />
                  <span>Sessão: {new Date(cls.session_date).toLocaleDateString('pt-BR')}</span>
                </div>
              )}

              {cls.location && (
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  Local: {cls.location}
                </div>
              )}
            </div>

            {cls.notes && (
              <div className="mt-3 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-xs text-gray-600 dark:text-gray-300">{cls.notes}</p>
              </div>
            )}

            <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
              Criada em {new Date(cls.created_at).toLocaleDateString('pt-BR')}
            </div>
          </div>
        ))}
      </div>

      {filteredClasses.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Nenhuma turma de formatura encontrada</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            {searchTerm ? 'Tente ajustar os filtros de busca' : 'Comece criando sua primeira turma de formatura'}
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Criar Primeira Turma
          </button>
        </div>
      )}

      {/* Forms */}
      {showAddForm && (
        <ClassForm
          onClose={() => setShowAddForm(false)}
          onSuccess={fetchClasses}
        />
      )}

      {editingClass && (
        <ClassForm
          graduationClass={editingClass}
          onClose={() => setEditingClass(null)}
          onSuccess={fetchClasses}
        />
      )}
    </div>
  );
};