'use client';

import Link from "next/link";
import { LayoutDashboard, Wifi, Home, MessageSquare } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

interface User {
  role: 'USER' | 'ADMIN';
}

export default function Navbar() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Persist token if present
    if (token) {
      localStorage.setItem('dashboardToken', token);
    }

    // Get token from URL or localStorage
    const activeToken = token || localStorage.getItem('dashboardToken');

    if (activeToken) {
      fetch(`http://localhost:4000/api/stats?token=${activeToken}`)
        .then(res => {
          if (res.ok) return res.json();
          throw new Error('Unauthorized');
        })
        .then(data => {
          if (data.user) {
            setUser(data.user);
          }
        })
        .catch(() => {
          // Token invalid or expired
          localStorage.removeItem('dashboardToken');
        });
    }
  }, [token]);

  const isAdmin = user?.role === 'ADMIN';
  const isTokenless = !token;

  // If user is authenticated (has token) but not admin, hide the navbar
  if (user && !isAdmin) {
    return null;
  }

  return (
    <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            FinancaIA
          </Link>
          <div className="flex gap-6">
            <Link 
              href="/" 
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Home className="h-4 w-4" />
              <span>Home</span>
            </Link>
            
            {(user || isAdmin) && (
              <Link 
                href="/dashboard" 
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <LayoutDashboard className="h-4 w-4" />
                <span>Dashboard</span>
              </Link>
            )}
            
            {(isAdmin || isTokenless) && (
              <>
                <Link 
                  href="/chat" 
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>Chat de Teste</span>
                </Link>
                <Link 
                  href="/connection" 
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Wifi className="h-4 w-4" />
                  <span>Conexão</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
