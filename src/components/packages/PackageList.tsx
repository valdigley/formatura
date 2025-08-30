import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Database } from '../../types/database';
import { Plus, Search, Edit, Trash2, Package, DollarSign, Clock, CheckCircle, Calendar } from 'lucide-react';
import { PackageForm } from './PackageForm';

type PhotoPackage = Database['public']['Tables']['photo_packages']['Row'];

export const PackageList: React.FC = () => {
  const [packages, setPackages] = useState<PhotoPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPackage, setEditingPackage] = useState<PhotoPackage | null>(null);

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('photo_packages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setPackages(data || []);
    } catch (error) {
      console.error('Error fetching packages:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPackages = packages.filter(pkg =>
    pkg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (pkg.description && pkg.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const deletePackage = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este pacote fotográfico?')) return;
    
    try {
      const { error } = await supabase.from('photo_packages').delete().eq('id', id);
      if (error) throw error;
      fetchPackages();
    } catch (error) {
      console.error('Error deleting package:', error);
    }
  };

  const togglePackageStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('photo_packages')
        .update({ is_active: !currentStatus, updated_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
      fetchPackages();
    } catch (error) {
      console.error('Error updating package status:', error);
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
          <h1 className="text-2xl font-bold text-gray-900">Pacotes Fotográficos</h1>
          <p className="text-gray-600 mt-1">Gerencie pacotes fotográficos para formaturas</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Pacote Fotográfico
        </button>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar pacotes fotográficos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
          />
        </div>
      </div>

      {/* Packages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPackages.map((pkg) => (
          <div
            key={pkg.id}
            className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border-2 p-6 hover:shadow-md transition-all ${
              pkg.is_active ? 'border-green-200 dark:border-green-700' : 'border-gray-200 dark:border-gray-600 opacity-75'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                  pkg.is_active ? 'bg-green-100 dark:bg-green-900' : 'bg-gray-100 dark:bg-gray-700'
                }`}>
                  <Package className={`h-5 w-5 ${pkg.is_active ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{pkg.name}</h3>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                    pkg.is_active ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                  }`}>
                    {pkg.is_active ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              </div>
              <div className="flex space-x-1">
                <button
                  onClick={() => togglePackageStatus(pkg.id, pkg.is_active)}
                  className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                >
                  <CheckCircle className="h-4 w-4" />
                </button>
                <button 
                  onClick={() => setEditingPackage(pkg)}
                  className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => deletePackage(pkg.id)}
                  className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {pkg.description && (
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{pkg.description}</p>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                  <DollarSign className="h-4 w-4" />
                  <span>Preço:</span>
                </div>
                <span className="text-lg font-bold text-gray-900 dark:text-white">
                  R$ {pkg.price.toLocaleString('pt-BR')}
                </span>
              </div>

              {/* Payment Conditions */}
              {pkg.features && Array.isArray(pkg.features) && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Formas de Pagamento:</h4>
                  {pkg.features
                    .filter((feature: any) => feature.method)
                    .map((condition: any, index: number) => (
                      <div key={index} className="flex items-center justify-between text-xs bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {condition.method === 'dinheiro' && 'Dinheiro'}
                          {condition.method === 'pix' && 'PIX'}
                          {condition.method === 'cartao' && 'Cartão'}
                          {condition.method === 'transferencia' && 'Transferência'}
                          {condition.method === 'parcelado' && 'Parcelado'}
                        </span>
                        <div className="text-right">
                          {condition.installments > 1 && (
                            <div className="text-gray-700 dark:text-gray-300">{condition.installments}x</div>
                          )}
                          {condition.discount > 0 && (
                            <div className="text-green-600 dark:text-green-400">-{condition.discount}%</div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {pkg.features && Array.isArray(pkg.features) && pkg.features.filter((f: any) => typeof f === 'string').length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Recursos Inclusos:</h4>
                <div className="space-y-1">
                  {pkg.features
                    .filter((feature: any) => typeof feature === 'string')
                    .map((feature, index) => (
                      <div key={index} className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                        <CheckCircle className="h-3 w-3 text-green-500 dark:text-green-400" />
                        <span>{feature}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
              Criado em {new Date(pkg.created_at).toLocaleDateString('pt-BR')}
            </div>
          </div>
        ))}
      </div>

      {filteredPackages.length === 0 && (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Nenhum pacote fotográfico encontrado</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            {searchTerm ? 'Tente ajustar os filtros de busca' : 'Comece criando seu primeiro pacote fotográfico'}
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Criar Primeiro Pacote Fotográfico
          </button>
        </div>
      )}

      {/* Forms */}
      {showAddForm && (
        <PackageForm
          onClose={() => setShowAddForm(false)}
          onSuccess={fetchPackages}
        />
      )}

      {editingPackage && (
        <PackageForm
          photoPackage={editingPackage}
          onClose={() => setEditingPackage(null)}
          onSuccess={fetchPackages}
        />
      )}
    </div>
  );
};