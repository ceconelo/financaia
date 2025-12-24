
import { Suspense } from 'react';
import DashboardContent from './DashboardContent';

export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://backend-pgg48k4s8k0cw4gcosook80c.iaconnecto.com';

  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Carregando...</div>}>
      <DashboardContent apiUrl={apiUrl} />
    </Suspense>
  );
}
