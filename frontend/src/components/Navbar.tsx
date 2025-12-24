'use client';

import Link from "next/link";
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
            {/* Menu items removed as requested */}
          </div>
        </div>
      </div>
    </nav>
  );
}
