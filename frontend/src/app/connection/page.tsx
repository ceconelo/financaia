'use client';

import dynamic from 'next/dynamic';

const ConnectionManager = dynamic(() => import('@/components/ConnectionManager'), {
  ssr: false,
  loading: () => <div className="container mx-auto p-8 text-center">Carregando interface de conexão...</div>
});

export default function ConnectionPage() {
  return <ConnectionManager />;
}
