
import AdminContent from './AdminContent';

export const dynamic = 'force-dynamic';

export default function AdminPage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  // Note: ADMIN_SECRET should primarily be used on the backend. 
  // However, the current logic passes it to the client to send in headers.
  // We'll pass it from the server runtime env.
  // In a real secure app, the client shouldn't know the secret, 
  // but current architecture relies on it for this simple admin panel.
  const adminSecret = process.env.ADMIN_SECRET || 'admin123';

  return <AdminContent apiUrl={apiUrl} adminSecret={adminSecret} />;
}
