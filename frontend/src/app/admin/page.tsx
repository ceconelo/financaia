'use client';

import { useEffect, useState } from 'react';

interface WaitlistUser {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  createdAt: string;
}

export default function AdminPage() {
  const [users, setUsers] = useState<WaitlistUser[]>([]);
  const [activeUsers, setActiveUsers] = useState<WaitlistUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [waitlistRes, activeRes] = await Promise.all([
        fetch('http://localhost:4000/api/admin/waitlist'),
        fetch('http://localhost:4000/api/admin/active-users')
      ]);
      
      const waitlistData = await waitlistRes.json();
      const activeData = await activeRes.json();
      
      setUsers(waitlistData);
      setActiveUsers(activeData);
    } catch {
      console.error('Erro ao buscar dados');
    } finally {
      setLoading(false);
    }
  };

  const approveUser = async (userId: string) => {
    try {
      await fetch('http://localhost:4000/api/admin/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      // Atualizar listas
      const user = users.find(u => u.id === userId);
      if (user) {
        setUsers(users.filter(u => u.id !== userId));
        setActiveUsers([user, ...activeUsers]);
      }
      alert('Usuário aprovado!');
    } catch {
      alert('Erro ao aprovar usuário');
    }
  };

  const revokeUser = async (userId: string) => {
    if (!confirm('Tem certeza que deseja revogar o acesso deste usuário?')) return;
    
    try {
      await fetch('http://localhost:4000/api/admin/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      // Atualizar listas
      const user = activeUsers.find(u => u.id === userId);
      if (user) {
        setActiveUsers(activeUsers.filter(u => u.id !== userId));
        // Se tiver email, volta pra waitlist, senão só sai da lista de ativos
        if (user.email) {
          setUsers([...users, user]);
        }
      }
      alert('Acesso revogado!');
    } catch {
      alert('Erro ao revogar acesso');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-8">🛡️ Painel Administrativo</h1>
      
      {/* Active Users Section */}
      <div className="bg-gray-800 rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4 text-green-400">✅ Usuários Ativos ({activeUsers.length})</h2>
        
        {loading ? (
          <p>Carregando...</p>
        ) : activeUsers.length === 0 ? (
          <p className="text-gray-400">Nenhum usuário ativo.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="p-3">Data</th>
                  <th className="p-3">Nome/Tel</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Ação</th>
                </tr>
              </thead>
              <tbody>
                {activeUsers.map(user => (
                  <tr key={user.id} className="border-b border-gray-700 hover:bg-gray-750">
                    <td className="p-3">{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td className="p-3">
                      <div>{user.name || 'Sem nome'}</div>
                      <div className="text-sm text-gray-400">{user.phoneNumber}</div>
                    </td>
                    <td className="p-3">{user.email || '-'}</td>
                    <td className="p-3">
                      <button
                        onClick={() => revokeUser(user.id)}
                        className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded transition-colors text-sm"
                      >
                        Revogar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Waitlist Section */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 text-yellow-400">⏳ Fila de Espera ({users.length})</h2>
        
        {loading ? (
          <p>Carregando...</p>
        ) : users.length === 0 ? (
          <p className="text-gray-400">Nenhum usuário na fila de espera.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="p-3">Data</th>
                  <th className="p-3">Nome/Tel</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Ação</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} className="border-b border-gray-700 hover:bg-gray-750">
                    <td className="p-3">{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td className="p-3">
                      <div>{user.name || 'Sem nome'}</div>
                      <div className="text-sm text-gray-400">{user.phoneNumber}</div>
                    </td>
                    <td className="p-3">{user.email}</td>
                    <td className="p-3">
                      <button
                        onClick={() => approveUser(user.id)}
                        className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded transition-colors text-sm"
                      >
                        Aprovar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
