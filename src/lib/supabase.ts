import React, { useState, useEffect } from 'react';
import { Users, BookOpen, Calendar, DollarSign, Camera, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from 'recharts';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalClasses: 0,
    upcomingSessions: 0,
    totalRevenue: 0,
    pendingPayments: 0,
    completedSessions: 0,
    activePackages: 0
  });

  const [monthlyData, setMonthlyData] = useState([]);
  const [paymentData, setPaymentData] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    // Load data from localStorage
    const students = JSON.parse(localStorage.getItem('students') || '[]');
    const classes = JSON.parse(localStorage.getItem('classes') || '[]');
    const sessions = JSON.parse(localStorage.getItem('sessions') || '[]');

    // Calculate stats
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const upcomingSessions = sessions.filter(session => {
      const sessionDate = new Date(session.date);
      return sessionDate >= now && sessionDate <= nextWeek;
    }).length;

    const completedSessions = sessions.filter(session => session.status === 'completed').length;
    const totalRevenue = sessions.reduce((sum, session) => sum + (session.price || 0), 0);
    const pendingPayments = sessions.filter(session => session.paymentStatus === 'pending').length;

    setStats({
      totalStudents: students.length,
      totalClasses: classes.length,
      upcomingSessions,
      totalRevenue,
      pendingPayments,
      completedSessions,
      activePackages: classes.filter(c => c.status === 'active').length
    });

    // Generate monthly data
    const monthlyStats = {};
    sessions.forEach(session => {
      const month = new Date(session.date).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
      monthlyStats[month] = (monthlyStats[month] || 0) + 1;
    });

    const monthlyArray = Object.entries(monthlyStats).map(([name, sessions]) => ({
      name,
      sessions
    }));

    setMonthlyData(monthlyArray);

    // Generate payment data
    const paidAmount = sessions.filter(s => s.paymentStatus === 'paid').reduce((sum, s) => sum + (s.price || 0), 0);
    const pendingAmount = sessions.filter(s => s.paymentStatus === 'pending').reduce((sum, s) => sum + (s.price || 0), 0);

    if (paidAmount > 0 || pendingAmount > 0) {
      setPaymentData([
        { name: 'Pago', value: paidAmount, color: '#10B981' },
        { name: 'Pendente', value: pendingAmount, color: '#F59E0B' }
      ]);
    }

    // Generate recent activity
    const activities = [];
    
    sessions.slice(-5).forEach(session => {
      activities.push({
        type: 'session',
        description: `Sessão agendada para ${session.studentName}`,
        date: session.createdAt || session.date,
        status: session.status
      });
    });

    students.slice(-3).forEach(student => {
      activities.push({
        type: 'student',
        description: `Novo formando cadastrado: ${student.name}`,
        date: student.createdAt || new Date().toISOString()
      });
    });

    activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setRecentActivity(activities.slice(0, 10));
  }, []);

  const statsData = [
    {
      title: 'Total de Formandos',
      value: stats.totalStudents.toString(),
      change: '+12%',
      color: 'blue',
      icon: Users
    },
    {
      title: 'Turmas de Formatura',
      value: stats.totalClasses.toString(),
      change: '+8%',
      color: 'emerald',
      icon: BookOpen
    },
    {
      title: 'Sessões Próximas',
      value: stats.upcomingSessions.toString(),
      change: '+15%',
      color: 'purple',
      icon: Calendar
    },
    {
      title: 'Receita Total',
      value: `R$ ${stats.totalRevenue.toLocaleString('pt-BR')}`,
      change: '+23%',
      color: 'orange',
      icon: DollarSign
    }
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Visão geral das sessões fotográficas</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsData.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.title}</p>
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
                <div key={index} className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
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
                  </div>
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