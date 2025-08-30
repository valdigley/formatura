import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Smartphone, CheckCircle, AlertCircle, Send, Settings, Loader2, MessageSquare, Users } from 'lucide-react';

interface WhatsAppConfig {
  api_url: string;
  api_key: string;
  instance_name: string;
  is_connected: boolean;
}

interface MessageTemplate {
  id: string;
  name: string;
  content: string;
  variables: string[];
}

export const WhatsAppSettings: React.FC = () => {
  const [config, setConfig] = useState<WhatsAppConfig>({
    api_url: '',
    api_key: '',
    instance_name: '',
    is_connected: false,
  });
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [connectionMessage, setConnectionMessage] = useState('');
  const [messageTemplates, setMessageTemplates] = useState<MessageTemplate[]>([
    {
      id: '1',
      name: 'Boas-vindas',
      content: 'Olá {{nome}}! 📸 Bem-vindo(a) ao nosso estúdio fotográfico! Sua sessão de formatura está agendada para {{data}}. Em breve entraremos em contato com mais detalhes.',
      variables: ['nome', 'data']
    },
    {
      id: '2',
      name: 'Lembrete de Sessão',
      content: 'Oi {{nome}}! 📅 Lembrando que sua sessão fotográfica de formatura é amanhã ({{data}}) às {{hora}} no {{local}}. Não esqueça de chegar 15 minutos antes!',
      variables: ['nome', 'data', 'hora', 'local']
    },
    {
      id: '3',
      name: 'Confirmação de Pagamento',
      content: 'Olá {{nome}}! ✅ Confirmamos o recebimento do seu pagamento de R$ {{valor}}. Sua sessão fotográfica está confirmada para {{data}}. Obrigado!',
      variables: ['nome', 'valor', 'data']
    }
  ]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [testPhone, setTestPhone] = useState('');
  const [sendingTest, setSendingTest] = useState(false);

  useEffect(() => {
    loadWhatsAppConfig();
  }, []);

  const loadWhatsAppConfig = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_settings')
        .select('settings')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading WhatsApp config:', error);
        return;
      }

      if (data?.settings?.whatsapp) {
        setConfig(data.settings.whatsapp);
      }
    } catch (error) {
      console.error('Error loading WhatsApp config:', error);
    }
  };

  const saveWhatsAppConfig = async () => {
    setLoading(true);
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
      settings.whatsapp = config;

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

      setConnectionStatus('success');
      setConnectionMessage('Configurações salvas com sucesso!');
      setTimeout(() => setConnectionStatus('idle'), 3000);
    } catch (error: any) {
      setConnectionStatus('error');
      setConnectionMessage(error.message || 'Erro ao salvar configurações');
      setTimeout(() => setConnectionStatus('idle'), 3000);
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    if (!config.api_url || !config.api_key || !config.instance_name) {
      setConnectionStatus('error');
      setConnectionMessage('Preencha todos os campos obrigatórios');
      setTimeout(() => setConnectionStatus('idle'), 3000);
      return;
    }

    setTesting(true);
    setConnectionStatus('idle');

    try {
      const response = await fetch(`${config.api_url}/instance/connectionState/${config.instance_name}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': config.api_key,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.instance?.state === 'open') {
          setConfig(prev => ({ ...prev, is_connected: true }));
          setConnectionStatus('success');
          setConnectionMessage('Conexão estabelecida com sucesso! WhatsApp conectado.');
        } else {
          setConfig(prev => ({ ...prev, is_connected: false }));
          setConnectionStatus('error');
          setConnectionMessage('WhatsApp não está conectado na instância. Verifique o QR Code.');
        }
      } else {
        throw new Error(`Erro HTTP: ${response.status}`);
      }
    } catch (error: any) {
      setConfig(prev => ({ ...prev, is_connected: false }));
      setConnectionStatus('error');
      setConnectionMessage(error.message || 'Erro ao conectar com a API');
    } finally {
      setTesting(false);
      setTimeout(() => setConnectionStatus('idle'), 5000);
    }
  };

  const sendTestMessage = async () => {
    if (!testPhone || !testMessage) {
      alert('Preencha o telefone e a mensagem de teste');
      return;
    }

    if (!config.is_connected) {
      alert('Teste a conexão primeiro');
      return;
    }

    setSendingTest(true);
    try {
      const cleanPhone = testPhone.replace(/\D/g, '');
      const formattedPhone = cleanPhone.length === 11 ? `55${cleanPhone}` : cleanPhone;

      const response = await fetch(`${config.api_url}/message/sendText/${config.instance_name}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': config.api_key,
        },
        body: JSON.stringify({
          number: `${formattedPhone}@s.whatsapp.net`,
          text: testMessage,
        }),
      });

      if (response.ok) {
        alert('Mensagem de teste enviada com sucesso!');
        setTestMessage('');
        setTestPhone('');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao enviar mensagem');
      }
    } catch (error: any) {
      alert(`Erro ao enviar mensagem: ${error.message}`);
    } finally {
      setSendingTest(false);
    }
  };

  const applyTemplate = (templateId: string) => {
    const template = messageTemplates.find(t => t.id === templateId);
    if (template) {
      setTestMessage(template.content);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-center space-x-2 mb-2">
          <Smartphone className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <span className="font-medium text-blue-800 dark:text-blue-300">Evolution API</span>
        </div>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Configure a integração com Evolution API para envio automático de mensagens WhatsApp para formandos
        </p>
      </div>

      {/* Connection Status */}
      {connectionStatus !== 'idle' && (
        <div className={`border rounded-lg p-4 ${
          connectionStatus === 'success' 
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
        }`}>
          <div className="flex items-center space-x-2">
            {connectionStatus === 'success' ? (
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            )}
            <span className={`text-sm font-medium ${
              connectionStatus === 'success' 
                ? 'text-green-800 dark:text-green-300' 
                : 'text-red-800 dark:text-red-300'
            }`}>
              {connectionMessage}
            </span>
          </div>
        </div>
      )}

      {/* Configuration Form */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <Settings className="h-5 w-5 mr-2" />
          Configuração da API
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              URL da API *
            </label>
            <input
              type="url"
              value={config.api_url}
              onChange={(e) => setConfig(prev => ({ ...prev, api_url: e.target.value }))}
              placeholder="https://api.evolution.com"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              API Key *
            </label>
            <input
              type="password"
              value={config.api_key}
              onChange={(e) => setConfig(prev => ({ ...prev, api_key: e.target.value }))}
              placeholder="Sua chave da Evolution API"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nome da Instância *
            </label>
            <input
              type="text"
              value={config.instance_name}
              onChange={(e) => setConfig(prev => ({ ...prev, instance_name: e.target.value }))}
              placeholder="nome-da-instancia"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>

          <div className="flex space-x-3">
            <button
              onClick={saveWhatsAppConfig}
              disabled={loading}
              className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Settings className="h-4 w-4 mr-2" />
              )}
              {loading ? 'Salvando...' : 'Salvar Configuração'}
            </button>
            
            <button
              onClick={testConnection}
              disabled={testing || !config.api_url || !config.api_key || !config.instance_name}
              className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {testing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              {testing ? 'Testando...' : 'Testar Conexão'}
            </button>
          </div>
        </div>
      </div>

      {/* Connection Status Display */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Status da Conexão</h3>
        <div className="flex items-center space-x-3">
          <div className={`h-3 w-3 rounded-full ${
            config.is_connected ? 'bg-green-500' : 'bg-red-500'
          }`}></div>
          <span className={`font-medium ${
            config.is_connected 
              ? 'text-green-600 dark:text-green-400' 
              : 'text-red-600 dark:text-red-400'
          }`}>
            {config.is_connected ? 'WhatsApp Conectado' : 'WhatsApp Desconectado'}
          </span>
        </div>
        {config.instance_name && (
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
            Instância: {config.instance_name}
          </p>
        )}
      </div>

      {/* Message Templates */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <MessageSquare className="h-5 w-5 mr-2" />
          Modelos de Mensagem
        </h3>
        
        <div className="space-y-4">
          {messageTemplates.map((template) => (
            <div key={template.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900 dark:text-white">{template.name}</h4>
                <button
                  onClick={() => applyTemplate(template.id)}
                  className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                >
                  Usar Modelo
                </button>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{template.content}</p>
              <div className="flex flex-wrap gap-1">
                {template.variables.map((variable) => (
                  <span key={variable} className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                    {`{{${variable}}}`}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Test Message */}
      {config.is_connected && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Send className="h-5 w-5 mr-2" />
            Enviar Mensagem de Teste
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Modelo de Mensagem
              </label>
              <select
                value={selectedTemplate}
                onChange={(e) => {
                  setSelectedTemplate(e.target.value);
                  if (e.target.value) applyTemplate(e.target.value);
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Selecione um modelo ou digite sua mensagem</option>
                {messageTemplates.map((template) => (
                  <option key={template.id} value={template.id}>{template.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Telefone de Teste
              </label>
              <input
                type="tel"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="11999999999"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Mensagem
              </label>
              <textarea
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                rows={4}
                placeholder="Digite sua mensagem de teste aqui..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>

            <button
              onClick={sendTestMessage}
              disabled={sendingTest || !testPhone || !testMessage}
              className="w-full inline-flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {sendingTest ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              {sendingTest ? 'Enviando...' : 'Enviar Mensagem de Teste'}
            </button>
          </div>
        </div>
      )}

      {/* Usage Instructions */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <h4 className="font-medium text-yellow-800 dark:text-yellow-300 mb-2">Como Configurar</h4>
        <ol className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1 list-decimal list-inside">
          <li>Configure sua Evolution API em um servidor</li>
          <li>Crie uma instância do WhatsApp</li>
          <li>Preencha os dados acima com as informações da sua API</li>
          <li>Clique em "Testar Conexão" para verificar</li>
          <li>Use os modelos de mensagem ou crie mensagens personalizadas</li>
          <li>Teste o envio com seu próprio número</li>
        </ol>
      </div>

      {/* Quick Actions */}
      {config.is_connected && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Ações Rápidas
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left">
              <div className="font-medium text-gray-900 dark:text-white mb-1">Enviar Boas-vindas</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Enviar mensagem de boas-vindas para novos formandos</div>
            </button>
            
            <button className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left">
              <div className="font-medium text-gray-900 dark:text-white mb-1">Lembrete de Sessão</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Enviar lembretes para sessões agendadas</div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};