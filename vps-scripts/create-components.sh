#!/bin/bash

# Parte 3: Criar componentes principais
# Execute após create-project-files.sh

set -e

echo "🎨 Criando componentes do sistema..."

cd /opt/foto-formatura

# src/lib/supabase.ts
cat > src/lib/supabase.ts << 'SUPABASE'
import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
SUPABASE

# src/App.tsx (versão simplificada para teste)
cat > src/App.tsx << 'APPTSX'
import React from 'react';
import { Camera, Users, Calendar, Settings } from 'lucide-react';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="mx-auto h-16 w-16 bg-blue-600 rounded-xl flex items-center justify-center mb-4">
            <Camera className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Sistema de Gestão de Sessões Fotográficas
          </h1>
          <p className="text-xl text-gray-600">
            Gerencie formandos, turmas e sessões fotográficas
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Formandos</h3>
            <p className="text-gray-600">Gerencie todos os formandos das sessões fotográficas</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="h-12 w-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
              <Calendar className="h-6 w-6 text-emerald-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Sessões</h3>
            <p className="text-gray-600">Agende e controle sessões fotográficas</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <Settings className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Configurações</h3>
            <p className="text-gray-600">Configure WhatsApp e Mercado Pago</p>
          </div>
        </div>

        <div className="text-center mt-8">
          <div className="bg-green-100 border border-green-300 rounded-lg p-4 max-w-md mx-auto">
            <div className="flex items-center justify-center space-x-2 text-green-800">
              <Camera className="h-5 w-5" />
              <span className="font-medium">Sistema instalado com sucesso!</span>
            </div>
            <p className="text-sm text-green-700 mt-1">
              Versão de teste funcionando. Próximo passo: instalar componentes completos.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
APPTSX

# Fazer build de teste
echo "🏗️ Fazendo build de teste..."
npm run build

# Verificar se build funcionou
if [ -f "dist/index.html" ]; then
    echo "✅ Build de teste criado com sucesso!"
    
    # Iniciar aplicação de teste
    echo "▶️ Iniciando aplicação de teste..."
    pm2 stop foto-formatura 2>/dev/null || echo "OK"
    pm2 delete foto-formatura 2>/dev/null || echo "OK"
    pm2 start serve --name foto-formatura -- -s dist -l 8080
    pm2 save
    
    sleep 3
    
    # Testar
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080)
    if [ "$HTTP_CODE" = "200" ]; then
        echo "✅ SISTEMA DE TESTE FUNCIONANDO!"
        echo "🌐 Acesse: http://147.93.182.205:8080"
        echo ""
        echo "📋 PRÓXIMO PASSO:"
        echo "Execute: ./install-full-system.sh"
    else
        echo "❌ Problema no sistema de teste! HTTP: $HTTP_CODE"
        pm2 logs foto-formatura --lines 5
    fi
else
    echo "❌ Erro no build de teste!"
    npm run build
fi
EOF

chmod +x create-components.sh
./create-components.sh