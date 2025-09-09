import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { TrendingUp, Users, DollarSign, Calendar } from 'lucide-react';

interface DashboardStats {
  totalRevenue: number;
  totalStudents: number;
  totalClasses: number;
  pendingPayments: number;
  pendingAmount: number;
  overdueAmount: number;
  approvedCount: number;
}

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    totalStudents: 0,
    totalClasses: 0,
    pendingPayments: 0,
    pendingAmount: 0,
    overdueAmount: 0,
    approvedCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Buscar todos os pagamentos dos formandos
      const { data: allPayments } = await supabase
        .from('payment_transactions')
        .select('amount, status')
        .eq('user_id', user.id)
        .not('student_id', 'is', null);

      // Calcular receita total (apenas pagamentos aprovados)
      const approvedPayments = allPayments?.filter(p => p.status === 'approved') || [];
      const totalRevenue = approvedPayments.reduce((sum, payment) => sum + Number(payment.amount), 0);

      // Calcular pagamentos pendentes (valor total)
      const pendingPayments = allPayments?.filter(p => p.status === 'pending') || [];
      const pendingAmount = pendingPayments.reduce((sum, payment) => sum + Number(payment.amount), 0);

      // Calcular pagamentos em atraso (mais de 7 dias)
      const overduePayments = allPayments?.filter(p => {
        if (p.status !== 'pending') return false;
        const createdDate = new Date(p.created_at);
        const daysDiff = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
        return daysDiff > 7;
      }) || [];
      const overdueAmount = overduePayments.reduce((sum, payment) => sum + Number(payment.amount), 0);

      // Buscar total de estudantes
      const { count: totalStudents } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Buscar total de turmas
      const { count: totalClasses } = await supabase
        .from('graduation_classes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      setStats({
        totalRevenue,
        totalStudents: totalStudents || 0,
        totalClasses: totalClasses || 0,
        pendingPayments: pendingPayments.length,
        pendingAmount,
        overdueAmount,
        approvedCount: approvedPayments.length,
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
    } finally {
      setLoading(false);
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400">Visão geral do seu negócio</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Receita Total</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                R$ {stats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total de Formandos</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalStudents}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Calendar className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total de Turmas</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalClasses}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
              <TrendingUp className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pagamentos Pendentes</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pendingPayments}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Resumo Financeiro</h2>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-400">Receita Confirmada ({stats.approvedCount} pagamentos)</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              R$ {stats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-400">Pagamentos Pendentes ({stats.pendingPayments} transações)</span>
            <span className="font-semibold text-yellow-600 dark:text-yellow-400">
              R$ {stats.pendingAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-400">Pagamentos em Atraso (+ de 7 dias)</span>
            <span className="font-semibold text-red-600 dark:text-red-400">
              R$ {stats.overdueAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <span className="text-gray-700 dark:text-gray-300 font-medium">Total em Aberto</span>
              <span className="font-bold text-gray-900 dark:text-white">
                R$ {(stats.pendingAmount + stats.overdueAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}