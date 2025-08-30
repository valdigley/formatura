import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { BarChart3, Download, FileText, TrendingUp, Users, DollarSign, Calendar, Filter, Eye } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ReportData {
  students: any[];
  classes: any[];
  sessions: any[];
  packages: any[];
  payments: any[];
}

export const ReportsList: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<ReportData>({
    students: [],
    classes: [],
    sessions: [],
    packages: [],
    payments: [],
  });
  const [selectedPeriod, setSelectedPeriod] = useState('last-3-months');
  const [selectedReport, setSelectedReport] = useState('students');
  const [selectedFormat, setSelectedFormat] = useState('pdf');

  useEffect(() => {
    generateReportData();
  }, [selectedPeriod]);

  const generateReportData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Calculate date range based on selected period
      let startDate = new Date();
      let endDate = new Date();

      switch (selectedPeriod) {
        case 'last-30-days':
          startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'last-3-months':
          startDate = subMonths(new Date(), 3);
          break;
        case 'last-6-months':
          startDate = subMonths(new Date(), 6);
          break;
        case 'last-year':
          startDate = subMonths(new Date(), 12);
          break;
        default:
          startDate = subMonths(new Date(), 3);
      }

      // Fetch data for reports
      const [studentsResult, classesResult, sessionsResult, packagesResult, paymentsResult] = await Promise.all([
        supabase
          .from('students')
          .select(`
            *,
            graduation_classes(name, school_name, graduation_year)
          `)
          .eq('user_id', user.id)
          .gte('created_at', startDate.toISOString()),
        supabase
          .from('graduation_classes')
          .select('*')
          .eq('user_id', user.id)
          .gte('created_at', startDate.toISOString()),
        supabase
          .from('photo_sessions')
          .select(`
            *,
            graduation_classes(name, school_name)
          `)
          .eq('user_id', user.id)
          .gte('created_at', startDate.toISOString()),
        supabase
          .from('photo_packages')
          .select('*')
          .eq('user_id', user.id)
          .gte('created_at', startDate.toISOString()),
        supabase
          .from('session_payments')
          .select('*')
          .eq('user_id', user.id)
          .gte('created_at', startDate.toISOString())
      ]);

      setReportData({
        students: studentsResult.data || [],
        classes: classesResult.data || [],
        sessions: sessionsResult.data || [],
        packages: packagesResult.data || [],
        payments: paymentsResult.data || [],
      });
    } catch (error) {
      console.error('Error generating report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = (type: string, format: string) => {
    const data = getReportDataByType(type);
    
    if (format === 'csv') {
      downloadCSV(data, type);
    } else if (format === 'excel') {
      downloadExcel(data, type);
    } else {
      downloadPDF(data, type);
    }
  };

  const getReportDataByType = (type: string) => {
    switch (type) {
      case 'students':
        return reportData.students.map(student => ({
          'Nome': student.full_name,
          'Email': student.email,
          'Telefone': student.phone,
          'CPF': student.cpf || 'N/A',
          'Status': student.status,
          'Turma': student.graduation_classes?.name || 'N/A',
          'Escola': student.graduation_classes?.school_name || 'N/A',
          'Data de Cadastro': new Date(student.created_at).toLocaleDateString('pt-BR'),
        }));
      case 'revenue':
        return reportData.payments.map(payment => ({
          'Valor': `R$ ${Number(payment.amount).toLocaleString('pt-BR')}`,
          'Status': payment.status,
          'Método': payment.payment_method,
          'Data de Vencimento': new Date(payment.due_date).toLocaleDateString('pt-BR'),
          'Data de Pagamento': payment.payment_date ? new Date(payment.payment_date).toLocaleDateString('pt-BR') : 'N/A',
          'Observações': payment.notes || 'N/A',
        }));
      case 'sessions':
        return reportData.sessions.map(session => ({
          'Título': session.title,
          'Status': session.status,
          'Data da Sessão': session.session_date ? new Date(session.session_date).toLocaleDateString('pt-BR') : 'N/A',
          'Local': session.location || 'N/A',
          'Duração': `${session.duration_minutes} min`,
          'Fotógrafo': session.photographer_name || 'N/A',
          'Turma': session.graduation_classes?.name || 'N/A',
          'Criado em': new Date(session.created_at).toLocaleDateString('pt-BR'),
        }));
      case 'performance':
        return reportData.classes.map(cls => ({
          'Nome da Turma': cls.name,
          'Escola': cls.school_name,
          'Ano': cls.graduation_year,
          'Curso': cls.course || 'N/A',
          'Formandos': cls.student_count,
          'Status': cls.status,
          'Data da Sessão': cls.session_date ? new Date(cls.session_date).toLocaleDateString('pt-BR') : 'N/A',
          'Local': cls.location || 'N/A',
        }));
      default:
        return [];
    }
  };

  const downloadCSV = (data: any[], type: string) => {
    if (data.length === 0) {
      alert('Não há dados para exportar');
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => `"${row[header]}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio-${type}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  const downloadExcel = (data: any[], type: string) => {
    // For Excel, we'll use CSV format with .xlsx extension
    // In a real implementation, you'd use a library like xlsx
    downloadCSV(data, type);
    alert('Arquivo Excel gerado como CSV. Para formato Excel completo, considere usar uma biblioteca específica.');
  };

  const downloadPDF = (data: any[], type: string) => {
    // For PDF, we'll create a simple HTML report
    if (data.length === 0) {
      alert('Não há dados para exportar');
      return;
    }

    const reportTitle = getReportTitle(type);
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${reportTitle}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #1f2937; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
          th { background-color: #f3f4f6; font-weight: bold; }
          .header { margin-bottom: 20px; }
          .date { color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${reportTitle}</h1>
          <p class="date">Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
          <p>Total de registros: ${data.length}</p>
        </div>
        <table>
          <thead>
            <tr>
              ${Object.keys(data[0]).map(key => `<th>${key}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${data.map(row => `
              <tr>
                ${Object.values(row).map(value => `<td>${value}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio-${type}-${format(new Date(), 'yyyy-MM-dd')}.html`;
    link.click();
  };

  const getReportTitle = (type: string) => {
    switch (type) {
      case 'students': return 'Relatório de Formandos';
      case 'revenue': return 'Relatório Financeiro';
      case 'sessions': return 'Relatório de Sessões Fotográficas';
      case 'performance': return 'Relatório de Produtividade';
      default: return 'Relatório';
    }
  };

  const generateCustomReport = () => {
    downloadReport(selectedReport, selectedFormat);
  };

  // Calculate chart data
  const getMonthlySessionsData = () => {
    const monthlyData: { [key: string]: number } = {};
    
    reportData.sessions.forEach(session => {
      if (session.session_date) {
        const month = format(new Date(session.session_date), 'MMM', { locale: ptBR });
        monthlyData[month] = (monthlyData[month] || 0) + 1;
      }
    });

    return Object.entries(monthlyData).map(([month, count]) => ({
      name: month,
      sessions: count,
    }));
  };

  const getPaymentStatusData = () => {
    const statusData = reportData.payments.reduce((acc: any, payment) => {
      acc[payment.status] = (acc[payment.status] || 0) + Number(payment.amount);
      return acc;
    }, {});

    const colors = {
      paid: '#10B981',
      pending: '#F59E0B',
      overdue: '#EF4444',
      cancelled: '#6B7280',
    };

    return Object.entries(statusData).map(([status, amount]) => ({
      name: status === 'paid' ? 'Pagos' : 
            status === 'pending' ? 'Pendentes' : 
            status === 'overdue' ? 'Atrasados' : 'Cancelados',
      value: amount,
      color: colors[status as keyof typeof colors] || '#6B7280',
    }));
  };

  const reportTypes = [
    {
      id: 'students',
      title: 'Relatório de Formandos',
      description: 'Análise completa de formandos por período',
      icon: Users,
      color: 'blue',
      data: reportData.students?.length || 0,
      subtitle: 'formandos cadastrados',
    },
    {
      id: 'revenue',
      title: 'Relatório Financeiro',
      description: 'Receitas, pagamentos e análise financeira',
      icon: DollarSign,
      color: 'green',
      data: reportData.payments?.filter((p: any) => p.status === 'paid').reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0) || 0,
      subtitle: 'receita total',
    },
    {
      id: 'sessions',
      title: 'Relatório de Sessões',
      description: 'Sessões fotográficas realizadas e agendadas',
      icon: Calendar,
      color: 'orange',
      data: reportData.sessions?.filter((s: any) => s.status === 'completed').length || 0,
      subtitle: 'sessões concluídas',
    },
    {
      id: 'performance',
      title: 'Relatório de Produtividade',
      description: 'Métricas de produtividade das turmas',
      icon: TrendingUp,
      color: 'purple',
      data: reportData.classes?.filter((c: any) => c.status === 'em_andamento').length || 0,
      subtitle: 'turmas ativas',
    },
  ];

  const monthlySessionsData = getMonthlySessionsData();
  const paymentStatusData = getPaymentStatusData();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
          <p className="text-gray-600 mt-1">Análises e métricas das sessões fotográficas</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="last-30-days">Últimos 30 dias</option>
            <option value="last-3-months">Últimos 3 meses</option>
            <option value="last-6-months">Últimos 6 meses</option>
            <option value="last-year">Último ano</option>
          </select>
          <button
            onClick={generateReportData}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            {loading ? 'Atualizando...' : 'Atualizar'}
          </button>
        </div>
      </div>

      {/* Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {reportTypes.map((report) => {
          const Icon = report.icon;
          return (
            <div
              key={report.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`h-10 w-10 bg-${report.color}-100 dark:bg-${report.color}-900 rounded-lg flex items-center justify-center`}>
                  <Icon className={`h-5 w-5 text-${report.color}-600 dark:text-${report.color}-400`} />
                </div>
                <button
                  onClick={() => downloadReport(report.id, 'pdf')}
                  className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                  title="Visualizar relatório"
                >
                  <Eye className="h-4 w-4" />
                </button>
              </div>

              <div className="mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{report.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{report.description}</p>
                
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {report.id === 'revenue' 
                    ? `R$ ${Number(report.data).toLocaleString('pt-BR')}`
                    : report.data.toLocaleString('pt-BR')
                  }
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">{report.subtitle}</div>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => downloadReport(report.id, 'pdf')}
                  className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm"
                >
                  <Download className="h-3 w-3 mr-1" />
                  PDF
                </button>
                <button
                  onClick={() => downloadReport(report.id, 'csv')}
                  className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm"
                >
                  <FileText className="h-3 w-3 mr-1" />
                  CSV
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Sessions Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Sessões por Mês</h3>
          {monthlySessionsData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlySessionsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="sessions" fill="#3B82F6" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
              <div className="text-center">
                <Calendar className="h-8 w-8 mx-auto mb-2" />
                <p>Nenhuma sessão no período selecionado</p>
              </div>
            </div>
          )}
        </div>

        {/* Payment Status Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Status de Pagamentos</h3>
          {paymentStatusData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={paymentStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {paymentStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `R$ ${Number(value).toLocaleString('pt-BR')}`} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center space-x-4 mt-4">
                {paymentStatusData.map((entry, index) => (
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
                <p>Nenhum pagamento no período selecionado</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Estatísticas do Período</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{reportData.students?.length || 0}</div>
            <div className="text-sm text-gray-600 dark:text-gray-300">Formandos Cadastrados</div>
          </div>
          <div className="text-center p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{reportData.classes?.length || 0}</div>
            <div className="text-sm text-gray-600 dark:text-gray-300">Turmas Criadas</div>
          </div>
          <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{reportData.sessions?.length || 0}</div>
            <div className="text-sm text-gray-600 dark:text-gray-300">Sessões Agendadas</div>
          </div>
          <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              R$ {reportData.payments?.filter((p: any) => p.status === 'paid').reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0).toLocaleString('pt-BR')}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">Receita Confirmada</div>
          </div>
        </div>
      </div>

      {/* Custom Report Builder */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Relatório Personalizado</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de Relatório</label>
            <select 
              value={selectedReport}
              onChange={(e) => setSelectedReport(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="students">Formandos</option>
              <option value="revenue">Financeiro</option>
              <option value="sessions">Sessões Fotográficas</option>
              <option value="performance">Produtividade</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Formato</label>
            <select 
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="pdf">PDF (HTML)</option>
              <option value="csv">CSV</option>
              <option value="excel">Excel</option>
            </select>
          </div>
          <div className="flex items-end">
            <button 
              onClick={generateCustomReport}
              className="w-full inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="h-4 w-4 mr-2" />
              Gerar Relatório
            </button>
          </div>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 dark:text-white mb-2">Dados do Relatório Selecionado</h4>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {selectedReport === 'students' && `${reportData.students.length} formandos encontrados no período`}
            {selectedReport === 'revenue' && `${reportData.payments.length} transações encontradas no período`}
            {selectedReport === 'sessions' && `${reportData.sessions.length} sessões encontradas no período`}
            {selectedReport === 'performance' && `${reportData.classes.length} turmas encontradas no período`}
          </p>
        </div>
      </div>

      {/* Detailed Analytics */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Análise Detalhada</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Students by Status */}
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">Formandos por Status</h4>
            <div className="space-y-2">
              {['active', 'inactive', 'graduated'].map(status => {
                const count = reportData.students.filter(s => s.status === status).length;
                const percentage = reportData.students.length > 0 ? (count / reportData.students.length * 100).toFixed(1) : 0;
                return (
                  <div key={status} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {status === 'active' ? 'Ativos' : status === 'inactive' ? 'Inativos' : 'Formados'}
                    </span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{count}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">({percentage}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sessions by Status */}
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">Sessões por Status</h4>
            <div className="space-y-2">
              {['scheduled', 'in_progress', 'completed', 'cancelled'].map(status => {
                const count = reportData.sessions.filter(s => s.status === status).length;
                const percentage = reportData.sessions.length > 0 ? (count / reportData.sessions.length * 100).toFixed(1) : 0;
                return (
                  <div key={status} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {status === 'scheduled' ? 'Agendadas' : 
                       status === 'in_progress' ? 'Em Progresso' : 
                       status === 'completed' ? 'Concluídas' : 'Canceladas'}
                    </span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{count}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">({percentage}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Revenue Summary */}
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">Resumo Financeiro</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-300">Total Faturado</span>
                <span className="text-sm font-medium text-green-600 dark:text-green-400">
                  R$ {reportData.payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + Number(p.amount), 0).toLocaleString('pt-BR')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-300">Pendente</span>
                <span className="text-sm font-medium text-orange-600 dark:text-orange-400">
                  R$ {reportData.payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + Number(p.amount), 0).toLocaleString('pt-BR')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-300">Em Atraso</span>
                <span className="text-sm font-medium text-red-600 dark:text-red-400">
                  R$ {reportData.payments.filter(p => p.status === 'overdue').reduce((sum, p) => sum + Number(p.amount), 0).toLocaleString('pt-BR')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};