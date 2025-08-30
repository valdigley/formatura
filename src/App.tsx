import React, { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { AuthForm } from './components/auth/AuthForm';
import { Header } from './components/layout/Header';
import { Dashboard } from './components/dashboard/Dashboard';

function App() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'students':
        return <div className="p-8 text-center">Módulo de Formandos em desenvolvimento</div>;
      case 'classes':
        return <div className="p-8 text-center">Módulo de Turmas em desenvolvimento</div>;
      case 'packages':
        return <div className="p-8 text-center">Módulo de Pacotes em desenvolvimento</div>;
      case 'sessions':
        return <div className="p-8 text-center">Módulo de Sessões em desenvolvimento</div>;
      case 'settings':
        return <div className="p-8 text-center">Configurações em desenvolvimento</div>;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header currentPage={currentPage} onPageChange={setCurrentPage} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderCurrentPage()}
      </main>
    </div>
  );
}

export default App;