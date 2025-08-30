import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { CreditCard, CheckCircle, AlertCircle, DollarSign, Settings, Loader2, TestTube, Eye, EyeOff } from 'lucide-react';

interface MercadoPagoConfig {
  public_key: string;
  access_token: string;
  webhook_url: string;
  environment: 'sandbox' | 'production';
  is_configured: boolean;
}

export const MercadoPagoSettings: React.FC = () => {
  const [config, setConfig] = useState<MercadoPagoConfig>({
    public_key: '',
    access_token: '',
    webhook_url: '',
    environment: 'sandbox',
    is_configured: false,
  });
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [connectionMessage, setConnectionMessage] = useState('');
  const [showAccessToken, setShowAccessToken] = useState(false);

  useEffect(() => {
    loadMercadoPagoConfig();
  }, []);

  const loadMercadoPagoConfig = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_settings')
        .select('settings')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading MercadoPago config:', error);
        return;
      }

      if (data?.settings?.mercadopago) {
        setConfig(data.settings.mercadopago);
      }
    } catch (error) {
      console.error('Error loading MercadoPago config:', error);
    }
  };

  const saveMercadoPagoConfig = async () => {
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
      settings.mercadopago = {
        ...config,
        is_configured: true
      };

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

      // Update local state
      setConfig(prev => ({ ...prev, is_configured: true }));
      
      setConnectionStatus('success');
      setConnectionMessage('Configurações do Mercado Pago salvas com sucesso!');
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
    if (!config.access_token) {
      setConnectionStatus('error');
      setConnectionMessage('Access Token é obrigatório para testar a conexão');
      setTimeout(() => setConnectionStatus('idle'), 3000);
      return;
    }

    setTesting(true);
    setConnectionStatus('idle');

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mercadopago?action=test-connection`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_token: config.access_token,
          environment: config.environment
        }),
      });

      const responseData = await response.json();

      if (response.ok) {
        if (responseData.success) {
          setConfig(prev => ({ ...prev, is_configured: true }));
          setConnectionStatus('success');
          setConnectionMessage(`${responseData.message} Ambiente: ${config.environment}. Métodos de pagamento disponíveis: ${responseData.payment_methods_count || 0}`);
        } else {
          throw new Error(responseData.error || 'Erro desconhecido');
        }
      } else {
        throw new Error(responseData.error || `Erro HTTP: ${response.status}`);
      }
    } catch (error: any) {
      setConfig(prev => ({ ...prev, is_configured: false }));
      setConnectionStatus('error');
      setConnectionMessage(`Erro ao conectar: ${error.message}. Verifique se o Access Token está correto para o ambiente ${config.environment}.`);
    } finally {
      setTesting(false);
      setTimeout(() => setConnectionStatus('idle'), 5000);
    }
  };


  const generateWebhookUrl = () => {
    return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mercadopago-webhook`;
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-center space-x-2 mb-2">
          <CreditCard className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <span className="font-medium text-blue-800 dark:text-blue-300">Mercado Pago</span>
        </div>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Configure a integração com Mercado Pago para processar pagamentos dos pacotes fotográficos
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
          Configuração das Credenciais
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Ambiente *
            </label>
            <select
              value={config.environment}
              onChange={(e) => setConfig(prev => ({ ...prev, environment: e.target.value as 'sandbox' | 'production' }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="sandbox">Sandbox (Testes)</option>
              <option value="production">Produção</option>
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Use Sandbox para testes e Produção para pagamentos reais
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Public Key *
            </label>
            <input
              type="text"
              value={config.public_key}
              onChange={(e) => setConfig(prev => ({ ...prev, public_key: e.target.value }))}
              placeholder={config.environment === 'sandbox' ? 'TEST-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' : 'APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Access Token *
            </label>
            <div className="relative">
              <input
                type={showAccessToken ? 'text' : 'password'}
                value={config.access_token}
                onChange={(e) => setConfig(prev => ({ ...prev, access_token: e.target.value }))}
                placeholder={config.environment === 'sandbox' ? 'TEST-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' : 'APP_USR-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'}
                className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
              />
              <button
                type="button"
                onClick={() => setShowAccessToken(!showAccessToken)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showAccessToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Webhook URL
            </label>
            <div className="flex space-x-2">
              <input
                type="url"
                value={config.webhook_url || generateWebhookUrl()}
                onChange={(e) => setConfig(prev => ({ ...prev, webhook_url: e.target.value }))}
                placeholder={generateWebhookUrl()}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
              />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(generateWebhookUrl());
                  alert('URL copiada para a área de transferência!');
                }}
                className="px-3 py-2 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
              >
                Copiar
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Configure esta URL no painel do Mercado Pago para receber notificações de pagamento
            </p>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={saveMercadoPagoConfig}
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
              disabled={testing || !config.access_token}
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
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Status da Integração</h3>
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <div className={`h-3 w-3 rounded-full ${
              config.is_configured ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
            <span className={`font-medium ${
              config.is_configured 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-red-600 dark:text-red-400'
            }`}>
              {config.is_configured ? 'Mercado Pago Configurado' : 'Mercado Pago Não Configurado'}
            </span>
          </div>
          
          <div className="text-sm text-gray-600 dark:text-gray-300">
            <div>Ambiente: <span className="font-medium">{config.environment === 'sandbox' ? 'Sandbox (Testes)' : 'Produção'}</span></div>
            {config.is_configured && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <span className="font-medium text-green-800 dark:text-green-300">Integração Configurada com Sucesso!</span>
                </div>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Suas credenciais do Mercado Pago estão funcionando corretamente. 
                  Agora você pode processar pagamentos nos pacotes fotográficos.
                </p>
              </div>
            )}
              
            {config.is_configured && (
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">Próximos Passos:</h4>
                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
                  <li>Configure a URL do webhook no painel do Mercado Pago</li>
                  <li>Teste pagamentos reais através dos pacotes fotográficos</li>
                  <li>Para ambiente de produção, troque para credenciais reais (APP_USR-xxx)</li>
                </ul>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Instructions */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <h4 className="font-medium text-yellow-800 dark:text-yellow-300 mb-2">Como Configurar</h4>
        <ol className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1 list-decimal list-inside">
          <li>Acesse o <a href="https://www.mercadopago.com.br/developers/panel" target="_blank" className="underline">painel de desenvolvedores</a> do Mercado Pago</li>
          <li>Crie uma aplicação ou use uma existente</li>
          <li>Para <strong>Sandbox</strong>: Use as credenciais de teste (TEST-xxx)</li>
          <li>Para <strong>Produção</strong>: Use as credenciais reais (APP_USR-xxx)</li>
          <li>Cole as credenciais nos campos acima</li>
          <li>Certifique-se de que o ambiente selecionado corresponde às credenciais</li>
          <li>Clique em "Salvar Configuração" primeiro</li>
          <li>Depois clique em "Testar Conexão" para verificar</li>
          <li>Configure a URL do webhook no painel do Mercado Pago</li>
          <li>Teste um pagamento para confirmar a integração</li>
        </ol>
        
        <div className="mt-3 p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
          <p className="text-xs text-yellow-800 dark:text-yellow-300">
            <strong>Importante:</strong> Credenciais de teste (TEST-xxx) só funcionam no ambiente Sandbox. 
            Credenciais de produção (APP_USR-xxx) só funcionam no ambiente Produção.
          </p>
        </div>
      </div>

      {/* Features Available */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recursos Disponíveis</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Pagamentos via PIX</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Cartão de crédito e débito</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Parcelamento automático</span>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Webhooks de notificação</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Links de pagamento</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Controle de status</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};