import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { LogOut, Users, Calendar, FileText, Settings } from 'lucide-react';

interface HeaderProps {
  currentPage: string;
  onPageChange: (page: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentPage, onPageChange }) => {
  const { signOut } = useAuth();

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Users },
    { id: 'students', label: 'Formandos', icon: Users },
    { id: 'classes', label: 'Turmas', icon: Calendar },
    { id: 'packages', label: 'Pacotes', icon: FileText },
    { id: 'sessions', label: 'Sessões', icon: Calendar },
  ];

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-white" />
              </div>
              <h1 className="ml-3 text-xl font-bold text-gray-900">
                Foto Formatura
              </h1>
            </div>

            <nav className="hidden md:flex space-x-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => onPageChange(item.id)}
                    className={`px-3 py-2 rounded-md text-sm font-medium flex items-center space-x-2 ${
                      currentPage === item.id
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => onPageChange('settings')}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
            >
              <Settings className="h-5 w-5" />
            </button>
            <button
              onClick={signOut}
              className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};