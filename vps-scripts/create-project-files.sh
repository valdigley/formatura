#!/bin/bash

# Parte 2: Criar todos os arquivos do projeto
# Execute após o complete-install.sh

set -e

echo "📝 Criando arquivos do projeto..."

cd /opt/foto-formatura

# Criar estrutura de diretórios
mkdir -p src/{components/{auth,layout,dashboard,students,classes,packages,sessions,payments,reports,settings},hooks,lib,types}
mkdir -p public

# Criar arquivos de configuração
echo "⚙️ Criando arquivos de configuração..."

# vite.config.ts
cat > vite.config.ts << 'VITECONFIG'
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
VITECONFIG

# tailwind.config.js
cat > tailwind.config.js << 'TAILWINDCONFIG'
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {},
  },
  plugins: [],
};
TAILWINDCONFIG

# postcss.config.js
cat > postcss.config.js << 'POSTCSSCONFIG'
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
POSTCSSCONFIG

# tsconfig.json
cat > tsconfig.json << 'TSCONFIG'
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
TSCONFIG

# tsconfig.app.json
cat > tsconfig.app.json << 'TSCONFIGAPP'
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
TSCONFIGAPP

# index.html
cat > index.html << 'INDEXHTML'
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Sistema de Gestão de Sessões Fotográficas</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
INDEXHTML

# src/index.css
cat > src/index.css << 'INDEXCSS'
@tailwind base;
@tailwind components;
@tailwind utilities;
INDEXCSS

# src/main.tsx
cat > src/main.tsx << 'MAINTSX'
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
MAINTSX

echo "✅ Arquivos de configuração criados!"
echo "📋 Próximo: Vou criar os componentes principais..."
EOF

chmod +x create-project-files.sh
./create-project-files.sh