'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, DollarSign, Activity, Calendar, ArrowUpCircle, ArrowDownCircle, Wallet, Trash2, Edit, ChevronLeft, ChevronRight, Settings, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useSearchParams } from 'next/navigation';

interface Stats {
  users: { total: number; active: number };
  transactions: { today: number; week: number; month: number };
  financials: { income: number; expense: number; balance: number };
  topCategories: Array<{ category: string; total: number }>;
  period: { month: number; year: number };
  user?: {
    name: string | null;
    phoneNumber: string;
    role: string;
    familyGroupId?: string | null;
    isFamilyAdmin?: boolean;
  };
}

interface ChartData {
  date: string;
  income: number;
  expense: number;
}

interface Transaction {
  id: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  description: string | null;
  createdAt: string;
  user?: {
    name: string | null;
    phoneNumber: string;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface DashboardContentProps {
  apiUrl: string;
}

export default function DashboardPage({ apiUrl }: DashboardContentProps) {
  const searchParams = useSearchParams();
  const urlToken = searchParams.get('token');
  
  const [token, setToken] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  
  const [showColumnFilter, setShowColumnFilter] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    date: true,
    description: true,
    category: true,
    type: true,
    amount: true,
    user: true,
    actions: true
  });

  const toggleColumn = (key: keyof typeof visibleColumns) => {
    setVisibleColumns(prev => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    // Token handling logic
    let activeToken = urlToken;

    if (activeToken) {
      // New token from URL: Store it and clean URL
      localStorage.setItem('dashboardToken', activeToken);
      window.history.replaceState({}, '', '/dashboard'); // Clean URL
    } else {
      // No token in URL: Try to get from storage
      activeToken = localStorage.getItem('dashboardToken');
    }

    if (activeToken) {
      setToken(activeToken);
    } else {
      setError('Acesso não autorizado. Por favor, acesse através do link enviado pelo Bot no Telegram.');
      setLoading(false);
    }
  }, [urlToken]);

  useEffect(() => {
    if (!token) return;

    // Buscar estatísticas com filtro de mês/ano e token (via Header)
    fetch(`${apiUrl}/api/stats?month=${selectedMonth}&year=${selectedYear}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(async res => {
        if (!res.ok) {
          if (res.status === 401) {
            localStorage.removeItem('dashboardToken'); // Clear invalid token
            throw new Error('Token inválido ou expirado.');
          }
          throw new Error('Erro ao carregar dados.');
        }
        return res.json();
      })
      .then(data => setStats(data))
      .catch(err => {
        console.error('Erro ao buscar stats:', err);
        setError(err.message);
      })
      .finally(() => setLoading(false));

    // Buscar dados do gráfico
    fetch(`${apiUrl}/api/transactions/chart?days=7`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(async res => {
        if (!res.ok) throw new Error('Erro ao carregar gráfico.');
        return res.json();
      })
      .then(data => setChartData(data))
      .catch(err => console.error('Erro ao buscar chart:', err));
  }, [selectedMonth, selectedYear, token]);

  useEffect(() => {
    if (token) {
      fetchTransactions();
    }
  }, [selectedMonth, selectedYear, token]);

  const fetchStats = () => {
    if (!token) return;
    setLoading(true);
    fetch(`${apiUrl}/api/stats?month=${selectedMonth}&year=${selectedYear}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setStats(data))
      .finally(() => setLoading(false));
  };

  const fetchTransactions = (page = 1) => {
    if (!token) return;
    fetch(`${apiUrl}/api/transactions?month=${selectedMonth}&year=${selectedYear}&page=${page}&limit=10`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setTransactions(data.transactions);
        setPagination(data.pagination);
      })
      .catch(err => console.error('Erro ao buscar transações:', err));
  };

  const handleResetMonth = async () => {
    if (!token) return;
    if (!confirm('Tem certeza que deseja apagar TODOS os dados deste mês? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      const res = await fetch(`${apiUrl}/api/transactions/reset?month=${selectedMonth}&year=${selectedYear}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        alert('Dados do mês resetados com sucesso!');
        fetchStats();
        fetchTransactions();
      } else {
        alert('Erro ao resetar dados.');
      }
    } catch (error) {
      console.error('Erro ao resetar:', error);
      alert('Erro ao resetar dados.');
    }
  };

  const handleEditTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransaction || !token) return;

    try {
      const res = await fetch(`${apiUrl}/api/transactions/${editingTransaction.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: editingTransaction.amount,
          category: editingTransaction.category,
          description: editingTransaction.description,
          type: editingTransaction.type
        })
      });

      if (res.ok) {
        setShowEditModal(false);
        setEditingTransaction(null);
        fetchStats();
        fetchTransactions(pagination.page);
      } else {
        alert('Erro ao atualizar transação.');
      }
    } catch (error) {
      console.error('Erro ao atualizar:', error);
      alert('Erro ao atualizar transação.');
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!token) return;
    if (!confirm('Tem certeza que deseja excluir esta transação?')) return;

    try {
      const res = await fetch(`${apiUrl}/api/transactions/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        fetchStats();
        fetchTransactions(pagination.page);
      } else {
        alert('Erro ao excluir transação.');
      }
    } catch (error) {
      console.error('Erro ao excluir:', error);
      alert('Erro ao excluir transação.');
    }
  };

  const months = [
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' },
  ];

  const years = [2023, 2024, 2025];

  if (loading) {
    return (
      <div className="container mx-auto p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">Carregando...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-8 flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-500">Acesso Negado</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
            {error === 'Acesso não autorizado. Por favor, acesse através do link enviado pelo Bot no Telegram.' && (
              <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800 mt-4">
                Para acessar seu dashboard, envie o comando <span className="font-mono font-bold">/dashboard</span> para o bot no Telegram.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const canReset = !stats?.user?.familyGroupId || stats?.user?.isFamilyAdmin;

  return (
    <div className="min-h-screen bg-gray-50/50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Dashboard FinancaIA</h1>
            <p className="text-sm text-muted-foreground">
              {stats?.user?.name ? `Bem-vindo de volta, ${stats?.user.name}` : 'Visão geral do FinancaIA'}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-lg border">
              <Calendar className="h-4 w-4 text-muted-foreground ml-2" />
              <select 
                className="bg-transparent border-none text-sm focus:ring-0 cursor-pointer outline-none text-gray-600 font-medium"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              >
                {months.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              <div className="w-px h-4 bg-gray-300 mx-1"></div>
              <select 
                className="bg-transparent border-none text-sm focus:ring-0 cursor-pointer outline-none text-gray-600 font-medium"
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              >
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {canReset && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleResetMonth}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                title="Resetar dados do mês"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="shadow-sm border-l-4 border-l-emerald-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <p className="text-sm font-medium text-muted-foreground">Receitas</p>
                <ArrowUpCircle className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-bold text-gray-900 mt-2">
                R$ {stats?.financials?.income.toFixed(2) || '0.00'}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-l-4 border-l-red-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <p className="text-sm font-medium text-muted-foreground">Despesas</p>
                <ArrowDownCircle className="h-4 w-4 text-red-500" />
              </div>
              <div className="text-2xl font-bold text-gray-900 mt-2">
                R$ {stats?.financials?.expense.toFixed(2) || '0.00'}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-l-4 border-l-blue-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <p className="text-sm font-medium text-muted-foreground">Saldo</p>
                <Wallet className="h-4 w-4 text-blue-500" />
              </div>
              <div className={`text-2xl font-bold mt-2 ${(stats?.financials?.balance ?? 0) >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                R$ {stats?.financials?.balance.toFixed(2) || '0.00'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Secondary Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Hoje</p>
                <div className="text-xl font-bold mt-1">{stats?.transactions.today} <span className="text-xs font-normal text-muted-foreground">transações</span></div>
              </div>
              <Activity className="h-8 w-8 text-gray-100" />
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Este Mês</p>
                <div className="text-xl font-bold mt-1">{stats?.transactions.month} <span className="text-xs font-normal text-muted-foreground">transações</span></div>
              </div>
              <TrendingUp className="h-8 w-8 text-gray-100" />
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Top Categoria</p>
                <div className="text-xl font-bold mt-1 capitalize truncate max-w-[150px]">
                  {stats?.topCategories[0]?.category || 'N/A'}
                </div>
              </div>
              <DollarSign className="h-8 w-8 text-gray-100" />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Chart */}
          <Card className="md:col-span-2 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Fluxo de Caixa (7 dias)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: '#6b7280' }}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: '#6b7280' }}
                      tickFormatter={(value) => `R$${value}`}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: number) => [`R$ ${value.toFixed(2)}`, '']}
                      labelFormatter={(label) => new Date(label).toLocaleDateString('pt-BR')}
                    />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                    <Line 
                      type="monotone" 
                      dataKey="income" 
                      stroke="#10b981" 
                      name="Receitas"
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 6 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="expense" 
                      stroke="#ef4444" 
                      name="Despesas"
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Top Categories List */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Top Categorias</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats?.topCategories.slice(0, 5).map((cat, index) => (
                  <div key={cat.category} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                        {index + 1}
                      </div>
                      <p className="font-medium capitalize text-sm text-gray-700">{cat.category}</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">
                      R$ {cat.total.toFixed(2)}
                    </p>
                  </div>
                ))}
                {stats?.topCategories.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                    <Activity className="h-8 w-8 mb-2 opacity-20" />
                    <p className="text-sm">Sem dados neste mês</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transaction Table */}
        <Card className="shadow-sm overflow-hidden">
          <CardHeader className="border-b bg-gray-50/50 px-6 py-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Transações Recentes</CardTitle>
              <span className="text-xs text-muted-foreground bg-white px-2 py-1 rounded border">
                {pagination.total} registros
              </span>
            </div>
            <div className="relative mt-2 md:mt-0">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-2 text-xs h-8"
                onClick={() => setShowColumnFilter(!showColumnFilter)}
              >
                <Settings className="h-3 w-3" />
                Colunas
              </Button>
              
              {showColumnFilter && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border p-2 z-20 animate-in fade-in zoom-in-95 duration-200">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground px-2 py-1 mb-1">Exibir Colunas</p>
                    {[
                      { key: 'date', label: 'Data' },
                      { key: 'description', label: 'Descrição' },
                      { key: 'category', label: 'Categoria' },
                      { key: 'type', label: 'Tipo' },
                      { key: 'amount', label: 'Valor' },
                      { key: 'user', label: 'Usuário' },
                      { key: 'actions', label: 'Ações' },
                    ].map((col) => (
                      <button
                        key={col.key}
                        onClick={() => toggleColumn(col.key as keyof typeof visibleColumns)}
                        className="w-full flex items-center justify-between px-2 py-1.5 text-xs rounded hover:bg-gray-50 text-gray-700"
                      >
                        <span>{col.label}</span>
                        {visibleColumns[col.key as keyof typeof visibleColumns] && <Check className="h-3 w-3 text-blue-600" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50/50">
                <tr>
                  {visibleColumns.date && <th className="text-left py-3 px-6 font-medium text-muted-foreground">Data</th>}
                  {visibleColumns.description && <th className="text-left py-3 px-6 font-medium text-muted-foreground">Descrição</th>}
                  {visibleColumns.category && <th className="text-left py-3 px-6 font-medium text-muted-foreground">Categoria</th>}
                  {visibleColumns.type && <th className="text-left py-3 px-6 font-medium text-muted-foreground">Tipo</th>}
                  {visibleColumns.amount && <th className="text-right py-3 px-6 font-medium text-muted-foreground">Valor</th>}
                  {visibleColumns.user && <th className="text-left py-3 px-6 font-medium text-muted-foreground">Usuário</th>}
                  {visibleColumns.actions && <th className="text-center py-3 px-6 font-medium text-muted-foreground w-[100px]">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y">
                {transactions.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                    {visibleColumns.date && (
                      <td className="py-3 px-6 text-gray-600">
                        {new Date(t.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                      </td>
                    )}
                    {visibleColumns.description && <td className="py-3 px-6 font-medium text-gray-900">{t.description || '-'}</td>}
                    {visibleColumns.category && (
                      <td className="py-3 px-6 capitalize text-gray-600">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          {t.category}
                        </span>
                      </td>
                    )}
                    {visibleColumns.type && (
                      <td className="py-3 px-6">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          t.type === 'INCOME' 
                            ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20' 
                            : 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20'
                        }`}>
                          {t.type === 'INCOME' ? 'Receita' : 'Despesa'}
                        </span>
                      </td>
                    )}
                    {visibleColumns.amount && (
                      <td className={`py-3 px-6 text-right font-semibold ${t.type === 'INCOME' ? 'text-emerald-600' : 'text-red-600'}`}>
                        R$ {t.amount.toFixed(2)}
                      </td>
                    )}
                    {visibleColumns.user && (
                      <td className="py-3 px-6 text-gray-600 text-xs">
                        {t.user?.name || t.user?.phoneNumber || 'Eu'}
                      </td>
                    )}
                    {visibleColumns.actions && (
                      <td className="py-3 px-6">
                        <div className="flex justify-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                            onClick={() => {
                              setEditingTransaction(t);
                              setShowEditModal(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-gray-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDeleteTransaction(t.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {transactions.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <div className="bg-gray-50 p-4 rounded-full mb-3">
                  <Calendar className="h-6 w-6 opacity-50" />
                </div>
                <p className="font-medium">Nenhuma transação encontrada</p>
                <p className="text-sm">Tente selecionar outro mês ou registre uma nova transação.</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50/50">
              <p className="text-xs text-muted-foreground">
                Mostrando <span className="font-medium">{((pagination.page - 1) * pagination.limit) + 1}</span> - <span className="font-medium">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> de <span className="font-medium">{pagination.total}</span>
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 p-0"
                  disabled={pagination.page === 1}
                  onClick={() => fetchTransactions(pagination.page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center justify-center px-3 text-sm font-medium min-w-[80px]">
                  {pagination.page} / {pagination.totalPages}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 p-0"
                  disabled={pagination.page === pagination.totalPages}
                  onClick={() => fetchTransactions(pagination.page + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Edit Modal */}
        {showEditModal && editingTransaction && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="px-6 py-4 border-b bg-gray-50/50 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">Editar Transação</h2>
                <button 
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <span className="sr-only">Fechar</span>
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <form onSubmit={handleEditTransaction} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">R$</span>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      value={editingTransaction.amount}
                      onChange={e => setEditingTransaction({...editingTransaction, amount: parseFloat(e.target.value)})}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-shadow"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                  <input
                    type="text"
                    value={editingTransaction.category}
                    onChange={e => setEditingTransaction({...editingTransaction, category: e.target.value})}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-shadow"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                  <input
                    type="text"
                    value={editingTransaction.description || ''}
                    onChange={e => setEditingTransaction({...editingTransaction, description: e.target.value})}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-shadow"
                    placeholder="Opcional"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setEditingTransaction({...editingTransaction, type: 'INCOME'})}
                      className={`flex items-center justify-center px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${
                        editingTransaction.type === 'INCOME'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700 ring-1 ring-emerald-500'
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <ArrowUpCircle className={`h-4 w-4 mr-2 ${editingTransaction.type === 'INCOME' ? 'text-emerald-500' : 'text-gray-400'}`} />
                      Receita
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingTransaction({...editingTransaction, type: 'EXPENSE'})}
                      className={`flex items-center justify-center px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${
                        editingTransaction.type === 'EXPENSE'
                          ? 'bg-red-50 border-red-200 text-red-700 ring-1 ring-red-500'
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <ArrowDownCircle className={`h-4 w-4 mr-2 ${editingTransaction.type === 'EXPENSE' ? 'text-red-500' : 'text-gray-400'}`} />
                      Despesa
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingTransaction(null);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                    Salvar Alterações
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
