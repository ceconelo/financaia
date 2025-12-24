
import DashboardContent from './DashboardContent';

export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://backend-pgg48k4s8k0cw4gcosook80c.iaconnecto.com';

  return <DashboardContent apiUrl={apiUrl} />;
}
