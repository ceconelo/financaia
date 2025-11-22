'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, TrendingUp, DollarSign, Activity, Calendar, ArrowUpCircle, ArrowDownCircle, Wallet } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface Stats {
  users: { total: number; active: number };
  transactions: { today: number; week: number; month: number };
  financials: { income: number; expense: number; balance: number };
  topCategories: Array<{ category: string; total: number }>;
  period: { month: number; year: number };
}

interface ChartData {
  date: string;
  income: number;
  expense: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  useEffect(() => {
    // Buscar estatísticas com filtro de mês/ano
    fetch(`http://localhost:4000/api/stats?month=${selectedMonth}&year=${selectedYear}`)
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(err => console.error('Erro ao buscar stats:', err));

    // Buscar dados do gráfico (mantém últimos 7 dias por enquanto, ou poderia ser do mês)
    // Para manter consistência com o dashboard original, mantemos o gráfico de 7 dias,
    // mas idealmente poderia ser "evolução do mês". Vamos manter 7 dias por enquanto como solicitado no plano.
    fetch('http://localhost:4000/api/transactions/chart?days=7')
      .then(res => res.json())
      .then(data => setChartData(data))
      .catch(err => console.error('Erro ao buscar chart:', err));
  }, [selectedMonth, selectedYear]);

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

  if (!stats) {
    return (
      <div className="container mx-auto p-8">
        <div className="text-center">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      <div className="mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">
            Visão geral do FinancaIA Bot
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

          <Link href="/connection">
            <Button>Ver Conexão WhatsApp</Button>
          </Link>
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
              R$ {stats.financials?.income.toFixed(2) || '0.00'}
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
              R$ {stats.financials?.expense.toFixed(2) || '0.00'}
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
            <div className={`text-2xl font-bold ${stats.financials?.balance >= 0 ? 'text-blue-500' : 'text-red-500'}`}>
              R$ {stats.financials?.balance.toFixed(2) || '0.00'}
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
            <div className="text-2xl font-bold">{stats.users.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.users.active} ativos esta semana
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
            <div className="text-2xl font-bold">{stats.transactions.today}</div>
            <p className="text-xs text-muted-foreground">
              {stats.transactions.week} esta semana
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
            <div className="text-2xl font-bold">{stats.transactions.month}</div>
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
            {stats.topCategories[0] ? (
              <>
                <div className="text-2xl font-bold capitalize">
                  {stats.topCategories[0].category}
                </div>
                <p className="text-xs text-muted-foreground">
                  R$ {stats.topCategories[0].total.toFixed(2)}
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
