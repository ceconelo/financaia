'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, TrendingUp, DollarSign, Activity } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface Stats {
  users: { total: number; active: number };
  transactions: { today: number; week: number; month: number };
  topCategories: Array<{ category: string; total: number }>;
}

interface ChartData {
  date: string;
  income: number;
  expense: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [chartData, setChartData] = useState<ChartData[]>([]);

  useEffect(() => {
    // Buscar estatísticas
    fetch('http://localhost:4000/api/stats')
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(err => console.error('Erro ao buscar stats:', err));

    // Buscar dados do gráfico
    fetch('http://localhost:4000/api/transactions/chart?days=7')
      .then(res => res.json())
      .then(data => setChartData(data))
      .catch(err => console.error('Erro ao buscar chart:', err));
  }, []);

  if (!stats) {
    return (
      <div className="container mx-auto p-8">
        <div className="text-center">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">
            Visão geral do FinancaIA Bot
          </p>
        </div>
        <Link href="/connection">
          <Button>Ver Conexão WhatsApp</Button>
        </Link>
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
              No último mês
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
                Nenhuma transação registrada ainda
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
