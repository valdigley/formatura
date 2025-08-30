import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Settings as SettingsIcon, Bell, Database, Smartphone, FileText, Upload, Download } from 'lucide-react';
import { WhatsAppSettings } from './WhatsAppSettings';
import { MercadoPagoSettings } from './MercadoPagoSettings';

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [contractTemplate, setContractTemplate] = useState('');
  const [notificationSettings, setNotificationSettings] = useState({
    agendamento: true,
    pagamento: true,
    confirmacao: true,
  });
  const [generalSettings, setGeneralSettings] = useState({
    studio_name: '',
    timezone: 'America/Sao_Paulo',
  });
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [notificationSaveStatus, setNotificationSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [generalLoading, setGeneralLoading] = useState(false);
  const [generalSaveStatus, setGeneralSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_settings')
        .select('settings')
        .eq('user_id', user.id)
        .single();

      if (data?.settings?.contract_template) {
        setContractTemplate(data.settings.contract_template);
      } else {
        // Set default template
        setContractTemplate(`CONTRATO DE PRESTAÇÃO DE SERVIÇOS FOTOGRÁFICOS

CONTRATANTE: {{client_name}}
CPF: {{client_cpf}}
TELEFONE: {{client_phone}}
EMAIL: {{client_email}}

CONTRATADA: {{studio_name}}

OBJETO: Prestação de serviços fotográficos para formatura da turma {{class_name}}.

VALOR: R$ {{package_price}}
SESSÕES FOTOGRÁFICAS: {{session_count}} sessões
ENTREGA: {{delivery_days}} dias úteis

Data: {{contract_date}}

_________________________    _________________________
    Contratante                  Contratada`);
      }
      
      if (data?.settings?.notifications) {
        setNotificationSettings(data.settings.notifications);
      }
      
      if (data?.settings?.general) {
        setGeneralSettings(data.settings.general);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveContractTemplate = async () => {
    setLoading(true);
    setSaveStatus('idle');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Get current settings
      const { data: currentSettings } = await supabase
        .from('user_settings')
        .select('settings')
        .eq('user_id', user.id)
        .single();

      const settings = currentSettings?.settings || {};
      settings.contract_template = contractTemplate;

      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          settings,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error: any) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setLoading(false);
    }
  };

  const saveGeneralSettings = async () => {
    setGeneralLoading(true);
    setGeneralSaveStatus('idle');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Get current settings
      const { data: currentSettings } = await supabase
        .from('user_settings')
        .select('settings')
        .eq('user_id', user.id)
        .single();

      const settings = currentSettings?.settings || {};
      settings.general = generalSettings;

      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          settings,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      setGeneralSaveStatus('success');
      setTimeout(() => setGeneralSaveStatus('idle'), 3000);
    } catch (error: any) {
      setGeneralSaveStatus('error');
      setTimeout(() => setGeneralSaveStatus('idle'), 3000);
    } finally {
      setGeneralLoading(false);
    }
  };

  const saveNotificationSettings = async () => {
    setNotificationLoading(true);
    setNotificationSaveStatus('idle');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Get current settings
      const { data: currentSettings } = await supabase
        .from('user_settings')
        .select('settings')
        .eq('user_id', user.id)
        .single();

      const settings = currentSettings?.settings || {};
      settings.notifications = notificationSettings;

      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          settings,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      setNotificationSaveStatus('success');
      setTimeout(() => setNotificationSaveStatus('idle'), 3000);
    } catch (error: any) {
      setNotificationSaveStatus('error');
      setTimeout(() => setNotificationSaveStatus('idle'), 3000);
    } finally {
      setNotificationLoading(false);
    }
  };

  const tabs = [
    { id: 'general', label: 'Geral', icon: SettingsIcon },
    { id: 'notifications', label: 'Notificações', icon: Bell },
    { id: 'whatsapp', label: 'WhatsApp', icon: Smartphone },
    { id: 'mercadopago', label: 'Mercado Pago', icon: Database },
    { id: 'contracts', label: 'Contratos', icon: FileText },
    { id: 'import', label: 'Importação', icon: Upload },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Configurações</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-1">Gerencie as configurações do sistema</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'general' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Configurações Gerais</h3>
              
              {generalSaveStatus === 'success' && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                  <p className="text-sm text-green-600 dark:text-green-400">Configurações gerais salvas com sucesso!</p>
                </div>
              )}

              {generalSaveStatus === 'error' && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <p className="text-sm text-red-600 dark:text-red-400">Erro ao salvar configurações gerais</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nome do Estúdio Fotográfico
                  </label>
                  <input
                    type="text"
                    value={generalSettings.studio_name}
                    onChange={(e) => setGeneralSettings(prev => ({ ...prev, studio_name: e.target.value }))}
                    placeholder="Meu Estúdio Fotográfico"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Fuso Horário
                  </label>
                  <select 
                    value={generalSettings.timezone}
                    onChange={(e) => setGeneralSettings(prev => ({ ...prev, timezone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option>America/Sao_Paulo</option>
                    <option>America/New_York</option>
                    <option>Europe/London</option>
                  </select>
                </div>
              </div>
              
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={saveGeneralSettings}
                  disabled={generalLoading}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {generalLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <SettingsIcon className="h-4 w-4 mr-2" />
                  )}
                  {generalLoading ? 'Salvando...' : 'Salvar Configurações Gerais'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Configurações de Notificações</h3>
              
              {notificationSaveStatus === 'success' && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                  <p className="text-sm text-green-600 dark:text-green-400">Configurações de notificações salvas com sucesso!</p>
                </div>
              )}

              {notificationSaveStatus === 'error' && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <p className="text-sm text-red-600 dark:text-red-400">Erro ao salvar configurações de notificações</p>
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Notificações de Agendamento</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Receber notificações quando novas sessões fotográficas forem agendadas</p>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={notificationSettings.agendamento}
                    onChange={(e) => setNotificationSettings(prev => ({ ...prev, agendamento: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded" 
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Lembretes de Pagamento</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Enviar lembretes automáticos de pagamento dos pacotes fotográficos</p>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={notificationSettings.pagamento}
                    onChange={(e) => setNotificationSettings(prev => ({ ...prev, pagamento: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded" 
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Confirmação de Sessões Fotográficas</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Confirmar presença em sessões fotográficas agendadas</p>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={notificationSettings.confirmacao}
                    onChange={(e) => setNotificationSettings(prev => ({ ...prev, confirmacao: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded" 
                  />
                </div>
              </div>
              
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={saveNotificationSettings}
                  disabled={notificationLoading}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {notificationLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Bell className="h-4 w-4 mr-2" />
                  )}
                  {notificationLoading ? 'Salvando...' : 'Salvar Configurações de Notificações'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'whatsapp' && (
            <WhatsAppSettings />
          )}

          {activeTab === 'mercadopago' && (
            <MercadoPagoSettings />
          )}

          {activeTab === 'contracts' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Modelos de Contrato</h3>
              
              {saveStatus === 'success' && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                  <p className="text-sm text-green-600 dark:text-green-400">Modelo de contrato salvo com sucesso!</p>
                </div>
              )}

              {saveStatus === 'error' && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <p className="text-sm text-red-600 dark:text-red-400">Erro ao salvar modelo de contrato</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Modelo Padrão de Contrato Fotográfico
                </label>
                <textarea
                  rows={10}
                  value={contractTemplate}
                  onChange={(e) => setContractTemplate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Use variáveis como {'{{client_name}}'}, {'{{class_name}}'}, {'{{package_price}}'} para personalização automática
                </p>
                
                <button
                  onClick={saveContractTemplate}
                  disabled={loading}
                  className="mt-3 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <FileText className="h-4 w-4 mr-2" />
                  )}
                  {loading ? 'Salvando...' : 'Salvar Modelo de Contrato'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'import' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Importação de Dados</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
                  <Upload className="h-8 w-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                  <h4 className="font-medium text-gray-900 dark:text-white mb-1">Importar Formandos</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">Upload de arquivo CSV com dados dos formandos</p>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    Selecionar Arquivo
                  </button>
                </div>
                
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
                  <Download className="h-8 w-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                  <h4 className="font-medium text-gray-900 dark:text-white mb-1">Modelo CSV</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">Baixe o modelo para importação de formandos</p>
                  <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
                    Baixar Modelo
                  </button>
                </div>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <h4 className="font-medium text-yellow-800 dark:text-yellow-300 mb-2">Formato do CSV</h4>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  O arquivo deve conter as colunas: client_name, client_email, client_phone, event_date, event_type, notes
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Save Button */}
      </div>
    </div>
  );
};