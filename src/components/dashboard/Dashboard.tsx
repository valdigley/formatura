import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, BookOpen, Calendar, TrendingUp, DollarSign, Clock, AlertCircle, CheckCircle, Camera } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format, subMonths, isAfter, isBefore, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DashboardStats {
  totalStudents: number;
  activeClasses: number;
  upcomingSessions: number;
  totalRevenue: number;
  pendingPayments: number;
  completedSessions: number;
  activePackages: number;
}

interface MonthlyData {
  name: string;
  sessions: number;
  revenue: number;
}

interface RecentActivity {
  type: string;
  description: string;
  date: string;
  status: string;
}

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    activeClasses: 0,
    upcomingSessions: 0,
    totalRevenue: 0,
    pendingPayments: 0,
    completedSessions: 0,
    activePackages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [paymentData, setPaymentData] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch all data in parallel
      const [
        studentsResult,
        classesResult,
        sessionsResult,
        packagesResult,
        paymentsResult
      ] = await Promise.all([
        supabase
          .from('students')
          .select('id, status, created_at, full_name')
          .eq('user_id', user.id),
        supabase
          .from('graduation_classes')
          .select('id, status, created_at, name')
          .eq('user_id', user.id),
        supabase
          .from('photo_sessions')
          .select('id, status, created_at, title, session_date')
          .eq('user_id', user.id),
        supabase
          .from('photo_packages')
          .select('id, is_active, price, created_at, name')
          .eq('user_id', user.id),
        supabase
          .from('session_payments')
          .select('id, amount, status, created_at, payment_date')
          .eq('user_id', user.id)
      ]);

      const students = studentsResult.data || [];
      const classes = classesResult.data || [];
      const sessions = sessionsResult.data || [];
      const packages = packagesResult.data || [];
      const payments = paymentsResult.data || [];

      // Calculate real statistics
      const now = new Date();
      const nextWeek = addDays(now, 7);

      const totalStudents = students.length;
      const activeClasses = classes.filter(c => c.status === 'em_andamento').length;
      const upcomingSessions = sessions.filter(s => {
        if (!s.session_date || s.status !== 'scheduled') return false;
        const sessionDate = new Date(s.session_date);
        return isAfter(sessionDate, now) && isBefore(sessionDate, nextWeek);
      }).length;
      const completedSessions = sessions.filter(s => s.status === 'completed').length;
      const activePackages = packages.filter(p => p.is_active).length;
      const totalRevenue = payments
        .filter(p => p.status === 'paid')
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const pendingPayments = payments.filter(p => p.status === 'pending').length;

      setStats({
        totalStudents,
        activeClasses,
        upcomingSessions,
        totalRevenue,
        pendingPayments,
        completedSessions,
        activePackages,
      });

      // Generate monthly chart data
      const monthlyStats: { [key: string]: { sessions: number; revenue: number } } = {};
      
      // Initialize last 6 months
      for (let i = 5; i >= 0; i--) {
        const date = subMonths(now, i);
        const monthKey = format(date, 'MMM', { locale: ptBR });
        monthlyStats[monthKey] = { sessions: 0, revenue: 0 };
      }

      // Count sessions by month
      sessions.forEach(session => {
        if (session.session_date) {
          const sessionDate = new Date(session.session_date);
          const monthKey = format(sessionDate, 'MMM', { locale: ptBR });
          if (monthlyStats[monthKey]) {
            monthlyStats[monthKey].sessions++;
          }
        }
      });

      // Count revenue by month
      payments.forEach(payment => {
        if (payment.payment_date && payment.status === 'paid') {
          const paymentDate = new Date(payment.payment_date);
          const monthKey = format(paymentDate, 'MMM', { locale: ptBR });
          if (monthlyStats[monthKey]) {
            monthlyStats[monthKey].revenue += Number(payment.amount) || 0;
          }
        }
      });

      const chartData = Object.entries(monthlyStats).map(([name, data]) => ({
        name,
        sessions: data.sessions,
        revenue: data.revenue,
      }));

      setMonthlyData(chartData);

      // Generate payment status data for pie chart
      const paymentStatusData = [
        {
          name: 'Pagos',
          value: payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
          color: '#10B981'
        },
        {
          name: 'Pendentes',
          value: payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
          color: '#F59E0B'
        },
        {
          name: 'Atrasados',
          value: payments.filter(p => p.status === 'overdue').reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
          color: '#EF4444'
        }
      ].filter(item => item.value > 0);

      setPaymentData(paymentStatusData);

      // Generate recent activity
      const recentSessions = sessions
        .slice(0, 3)
        .map(s => ({
          type: 'session',
          description: `Nova sessão: ${s.title}`,
          date: s.created_at,
          status: s.status,
        }));

      const recentStudents = students
        .slice(0, 3)
        .map(s => ({
          type: 'student',
          description: `Novo formando: ${s.full_name}`,
          date: s.created_at,
          status: s.status,
          contractStatus: s.notes?.includes('=== ENVIO DE CONTRATO ===') 
            ? (s.notes.includes('ENVIADO COM SUCESSO') ? 'sent_success' : 'sent_failed')
            : 'unknown'
        }));

      const recentClasses = classes
        .slice(0, 2)
        .map(c => ({
          type: 'class',
          description: `Nova turma: ${c.name}`,
          date: c.created_at,
          status: c.status,
        }));

      const allActivity = [...recentSessions, ...recentStudents, ...recentClasses]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);

      setRecentActivity(allActivity);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total de Formandos',
      value: stats.totalStudents,
      icon: Users,
      color: 'blue',
      change: stats.totalStudents > 0 ? '+' + Math.round((stats.totalStudents / 30) * 100) + '%' : '0%',
    },
    {
      title: 'Turmas Ativas',
      value: stats.activeClasses,
      icon: BookOpen,
      color: 'emerald',
      change: stats.activeClasses > 0 ? '+' + Math.round((stats.activeClasses / 10) * 100) + '%' : '0%',
    },
    {
      title: 'Sessões Esta Semana',
      value: stats.upcomingSessions,
      icon: Calendar,
      color: 'orange',
      change: stats.upcomingSessions > 0 ? '+' + Math.round((stats.upcomingSessions / 5) * 100) + '%' : '0%',
    },
    {
      title: 'Receita Total',
      value: `R$ ${stats.totalRevenue.toLocaleString('pt-BR')}`,
      icon: DollarSign,
      color: 'green',
      change: stats.totalRevenue > 0 ? '+' + Math.round((stats.totalRevenue / 10000) * 100) + '%' : '0%',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-1">Visão geral das sessões fotográficas de formatura</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stat.value}</p>
                  <p className={`text-sm mt-1 ${
                    stat.change.startsWith('+') ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {stat.change} vs período anterior
                  </p>
                </div>
                <div className={`p-3 rounded-lg bg-${stat.color}-100`}>
                  <Icon className={`h-6 w-6 text-${stat.color}-600`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Session Trends */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Sessões Fotográficas por Mês</h3>
          {monthlyData.length > 0 && monthlyData.some(d => d.sessions > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="sessions" fill="#2563EB" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
              <div className="text-center">
                <Camera className="h-8 w-8 mx-auto mb-2" />
                <p>Nenhuma sessão registrada ainda</p>
                <p className="text-xs">Crie sua primeira sessão para ver os dados</p>
              </div>
            </div>
          )}
        </div>

        {/* Payment Status */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Status de Pagamentos</h3>
          {paymentData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={paymentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {paymentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `R$ ${Number(value).toLocaleString('pt-BR')}`} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center space-x-4 mt-4">
                {paymentData.map((entry, index) => (
                  <div key={index} className="flex items-center">
                    <div
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: entry.color }}
                    ></div>
                    <span className="text-sm text-gray-600 dark:text-gray-300">{entry.name}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
              <div className="text-center">
                <DollarSign className="h-8 w-8 mx-auto mb-2" />
                <p>Nenhum pagamento registrado</p>
                <p className="text-xs">Registre pagamentos para ver os dados</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Ações Rápidas</h3>
          <div className="space-y-3">
            <button 
              onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'students' }))}
              className="w-full text-left p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <Users className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-gray-900 dark:text-white">Adicionar Formando</span>
              </div>
            </button>
            <button 
              onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'classes' }))}
              className="w-full text-left p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <BookOpen className="h-5 w-5 text-emerald-600" />
                <span className="font-medium text-gray-900 dark:text-white">Nova Turma de Formatura</span>
              </div>
            </button>
            <button 
              onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'sessions' }))}
              className="w-full text-left p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <Camera className="h-5 w-5 text-purple-600" />
                <span className="font-medium text-gray-900 dark:text-white">Agendar Sessão Fotográfica</span>
              </div>
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Atividade Recente</h3>
          <div className="space-y-4">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700 relative">
                  <div className="flex-shrink-0">
                    {activity.type === 'session' ? (
                      <Camera className="h-5 w-5 text-purple-600" />
                    ) : activity.type === 'student' ? (
                      <Users className="h-5 w-5 text-blue-600" />
                    ) : activity.type === 'class' ? (
                      <BookOpen className="h-5 w-5 text-emerald-600" />
                    ) : activity.status === 'paid' ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <Clock className="h-5 w-5 text-orange-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{activity.description}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(activity.date).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                    {activity.type === 'student' && (
                      <div className="flex flex-col space-y-1 mt-1">
                        {/* Contract Status */}
                        <div className="flex items-center space-x-1">
                          {activity.contractStatus === 'sent_success' ? (
                            <>
                              <CheckCircle className="h-3 w-3 text-green-500" />
                              <span className="text-xs text-green-600 dark:text-green-400">Contrato enviado</span>
                            </>
                          ) : activity.contractStatus === 'sent_failed' ? (
                            <>
                              <AlertCircle className="h-3 w-3 text-red-500" />
                              <span className="text-xs text-red-600 dark:text-red-400">Falha no contrato</span>
                            </>
                          ) : activity.contractStatus === 'not_sent' ? (
                            <>
                              <Clock className="h-3 w-3 text-yellow-500" />
                              <span className="text-xs text-yellow-600 dark:text-yellow-400">Contrato não enviado</span>
                            </>
                          ) : null}
                        </div>
                        
                        {/* Payment Status */}
                        <div className="flex items-center space-x-1">
                          {activity.paymentStatus === 'sent_success' ? (
                            <>
                              <CheckCircle className="h-3 w-3 text-green-500" />
                              <span className="text-xs text-green-600 dark:text-green-400">Pagamento enviado</span>
                            </>
                          ) : activity.paymentStatus === 'sent_failed' ? (
                            <>
                              <AlertCircle className="h-3 w-3 text-red-500" />
                              <span className="text-xs text-red-600 dark:text-red-400">Falha no pagamento</span>
                            </>
                          ) : activity.paymentStatus === 'not_sent' ? (
                            <>
                              <Clock className="h-3 w-3 text-yellow-500" />
                              <span className="text-xs text-yellow-600 dark:text-yellow-400">Pagamento não enviado</span>
                            </>
                          ) : null}
                        </div>
                      </div>
                    )}
                  </div>
                  {activity.type === 'student' && (activity.contractStatus === 'sent_failed' || activity.paymentStatus === 'sent_failed') && (
                    <div className="absolute top-2 right-2">
                      <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse"></div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="h-8 w-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                <p className="text-gray-500 dark:text-gray-400">Nenhuma atividade recente</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Comece criando formandos, turmas ou sessões
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Alerts Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Alertas e Notificações</h3>
        <div className="space-y-3">
          {stats.pendingPayments > 0 && (
            <div className="flex items-center space-x-3 p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <span className="text-sm text-orange-800 dark:text-orange-300">
                {stats.pendingPayments} pagamento{stats.pendingPayments > 1 ? 's' : ''} pendente{stats.pendingPayments > 1 ? 's' : ''} requer{stats.pendingPayments === 1 ? '' : 'em'} atenção
              </span>
            </div>
          )}
          {stats.upcomingSessions > 0 && (
            <div className="flex items-center space-x-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <Calendar className="h-5 w-5 text-blue-600" />
              <span className="text-sm text-blue-800 dark:text-blue-300">
                {stats.upcomingSessions} sessão{stats.upcomingSessions > 1 ? 'ões' : ''} fotográfica{stats.upcomingSessions > 1 ? 's' : ''} agendada{stats.upcomingSessions > 1 ? 's' : ''} para os próximos 7 dias
              </span>
            </div>
          )}
          {stats.totalStudents === 0 && (
            <div className="flex items-center space-x-3 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <span className="text-sm text-yellow-800 dark:text-yellow-300">
                Comece cadastrando formandos e criando turmas de formatura
              </span>
            </div>
          )}
          {stats.pendingPayments === 0 && stats.upcomingSessions === 0 && stats.totalStudents > 0 && (
            <div className="flex items-center space-x-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-sm text-green-800 dark:text-green-300">
                Tudo em ordem! Nenhum alerta no momento.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">{stats.completedSessions}</div>
          <div className="text-sm text-gray-600 dark:text-gray-300">Sessões Concluídas</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 text-center">
          <div className="text-2xl font-bold text-indigo-600">{stats.activePackages}</div>
          <div className="text-sm text-gray-600 dark:text-gray-300">Pacotes Ativos</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 text-center">
          <div className="text-2xl font-bold text-cyan-600">
            {stats.totalStudents > 0 ? Math.round((stats.completedSessions / stats.totalStudents) * 100) : 0}%
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-300">Taxa de Conclusão</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 text-center">
          <div className="text-2xl font-bold text-pink-600">
            {stats.totalRevenue > 0 ? Math.round(stats.totalRevenue / Math.max(stats.completedSessions, 1)) : 0}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-300">Receita Média/Sessão</div>
        </div>
      </div>
    </div>
  );
};