import React, { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';
import { AuthForm } from './components/auth/AuthForm';
import { Header } from './components/layout/Header';
import { Dashboard } from './components/dashboard/Dashboard';
import { StudentList } from './components/students/StudentList';
import { ClassList } from './components/classes/ClassList';
import { PackageList } from './components/packages/PackageList';
import { SessionList } from './components/sessions/SessionList';
import { Settings } from './components/settings/Settings';
import { PublicRegistrationForm } from './components/students/PublicRegistrationForm';

function App() {
  const { user, loading } = useAuth();
  const { theme } = useTheme();
  const [currentPage, setCurrentPage] = useState('dashboard');

  // Check if this is the public registration form route
  const isPublicRegistration = window.location.pathname === '/cadastro-formando';

  if (isPublicRegistration) {
    return <PublicRegistrationForm />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
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
        return <StudentList />;
      case 'classes':
        return <ClassList />;
      case 'packages':
        return <PackageList />;
      case 'sessions':
        return <SessionList />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header currentPage={currentPage} onPageChange={setCurrentPage} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderCurrentPage()}
      </main>
    </div>
  );
}

export default App;