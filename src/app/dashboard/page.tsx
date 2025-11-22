'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, TrendingUp, DollarSign, Activity, Calendar, ArrowUpCircle, ArrowDownCircle, Wallet, Trash2 } from 'lucide-react';
import Link from 'next/link';
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

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [stats, setStats] = useState<Stats | null>(null);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  useEffect(() => {
    if (!token) {
      setError('Acesso não autorizado. Por favor, acesse através do link enviado pelo Bot no Telegram.');
      return;
    }

    // Buscar estatísticas com filtro de mês/ano e token
    fetch(`http://localhost:4000/api/stats?month=${selectedMonth}&year=${selectedYear}&token=${token}`)
      .then(async res => {
        if (!res.ok) {
          if (res.status === 401) throw new Error('Token inválido ou expirado.');
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
    fetch(`http://localhost:4000/api/transactions/chart?days=7&token=${token}`)
      .then(async res => {
        if (!res.ok) throw new Error('Erro ao carregar gráfico.');
        return res.json();
      })
      .then(data => setChartData(data))
      .catch(err => console.error('Erro ao buscar chart:', err));
  }, [selectedMonth, selectedYear, token]);

  const fetchStats = () => {
    setLoading(true);
    fetch(`http://localhost:4000/api/stats?month=${selectedMonth}&year=${selectedYear}&token=${token}`)
      .then(res => res.json())
      .then(data => setStats(data))
      .finally(() => setLoading(false));
  };

  const handleResetMonth = async () => {
    if (!confirm('Tem certeza que deseja apagar TODOS os dados deste mês? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      const res = await fetch(`http://localhost:4000/api/transactions/reset?token=${token}&month=${selectedMonth}&year=${selectedYear}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        alert('Dados do mês resetados com sucesso!');
        fetchStats(); // Refresh data
      } else {
        alert('Erro ao resetar dados.');
      }
    } catch (error) {
      console.error('Erro ao resetar:', error);
      alert('Erro ao resetar dados.');
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
    <div className="container mx-auto p-8">
      <div className="mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">
            {stats?.user?.name ? `Olá, ${stats?.user.name}` : 'Visão geral do FinancaIA Bot'}
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-card p-2 rounded-lg border shadow-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <select 
              className="bg-transparent border-none text-sm focus:ring-0 cursor-pointer outline-none"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            >
              {months.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            <select 
              className="bg-transparent border-none text-sm focus:ring-0 cursor-pointer outline-none"
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
              variant="destructive" 
              size="sm"
              onClick={handleResetMonth}
              className="bg-red-100 text-red-600 hover:bg-red-200 hover:text-red-700 border-red-200"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Resetar Mês
            </Button>
          )}
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Receitas (Mês)
            </CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">
              R$ {stats?.financials?.income.toFixed(2) || '0.00'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Despesas (Mês)
            </CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              R$ {stats?.financials?.expense.toFixed(2) || '0.00'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Saldo (Mês)
            </CardTitle>
            <Wallet className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats?.financials?.balance >= 0 ? 'text-blue-500' : 'text-red-500'}`}>
              R$ {stats?.financials?.balance.toFixed(2) || '0.00'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Usuários
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.users.total}</div>
            <p className="text-xs text-muted-foreground">
              Global
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Transações Hoje
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.transactions.today}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.transactions.week} esta semana
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Transações (Mês)
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.transactions.month}</div>
            <p className="text-xs text-muted-foreground">
              Neste mês selecionado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Top Categoria
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {stats?.topCategories[0] ? (
              <>
                <div className="text-2xl font-bold capitalize">
                  {stats?.topCategories[0].category}
                </div>
                <p className="text-xs text-muted-foreground">
                  R$ {stats?.topCategories[0].total.toFixed(2)}
                </p>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">
                Sem dados
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Receitas vs Despesas (Últimos 7 dias)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(value) => new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
              />
              <YAxis />
              <Tooltip 
                formatter={(value: number) => `R$ ${value.toFixed(2)}`}
                labelFormatter={(label) => new Date(label).toLocaleDateString('pt-BR')}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="income" 
                stroke="#10b981" 
                name="Receitas"
                strokeWidth={2}
              />
              <Line 
                type="monotone" 
                dataKey="expense" 
                stroke="#ef4444" 
                name="Despesas"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Categories */}
      <Card>
        <CardHeader>
          <CardTitle>Top 5 Categorias (Mês)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.topCategories.map((cat, index) => (
              <div key={cat.category} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-2xl font-bold text-muted-foreground">
                    #{index + 1}
                  </div>
                  <div>
                    <p className="font-medium capitalize">{cat.category}</p>
                  </div>
                </div>
                <p className="text-lg font-bold">
                  R$ {cat.total.toFixed(2)}
                </p>
              </div>
            ))}
            {stats.topCategories.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma transação registrada neste mês
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
