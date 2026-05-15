import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { ensureSupabaseConfigured, supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Home,
  Briefcase,
  MessageSquare,
  History,
  Plus,
  Calendar,
  Loader2,
  RefreshCw,
} from 'lucide-react';

type HistoryBooking = {
  id: string;
  service: string | null;
  service_name: string | null;
  status: string;
  created_at: string;
  city: string | null;
  address: string | null;
};

const navItems = [
  { label: 'Dashboard', href: '/dashboard/client', icon: Home },
  { label: 'My Jobs', href: '/dashboard/client/jobs', icon: Briefcase },
  { label: 'Bookings', href: '/dashboard/client/bookings', icon: Calendar },
  { label: 'Request Service', href: '/dashboard/client/request', icon: Plus },
  { label: 'Messages', href: '/dashboard/client/messages', icon: MessageSquare },
  { label: 'History', href: '/dashboard/client/history', icon: History },
];

const statusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'cancelled':
      return 'bg-red-500/20 text-red-400 border-red-500/30';
    default:
      return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }
};

export default function ClientHistoryPage() {
  const { user } = useAuth();
  const [history, setHistory] = useState<HistoryBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadHistory = async () => {
    if (!user) {
      setHistory([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      ensureSupabaseConfigured();
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['completed', 'cancelled'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHistory((data as HistoryBooking[]) || []);
    } catch (error) {
      console.error('APP ERROR:', error);
      setError(error instanceof Error ? error.message : 'Failed to load history');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadHistory();
  }, [user?.id]);

  return (
    <DashboardLayout navItems={navItems} userRole="client">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">History</h1>
            <p className="text-gray-400">View your completed and cancelled jobs.</p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={loadHistory}
            disabled={isLoading}
            className="border-gray-700 text-gray-300 hover:bg-[#2a2a2a] hover:text-white"
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
        </div>

        {error && (
          <Alert className="bg-red-900/20 border-red-800">
            <AlertDescription className="text-red-400">{error}</AlertDescription>
          </Alert>
        )}

        <Card className="bg-[#1a1a1a] border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Job History</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-[#00C853] mx-auto" />
              </div>
            ) : history.length === 0 ? (
              <p className="text-gray-400">No history items yet.</p>
            ) : (
              <div className="space-y-3">
                {history.map((item) => (
                  <div key={item.id} className="rounded-lg border border-gray-800 bg-[#111] p-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                      <div>
                        <p className="text-white font-semibold">{item.service || item.service_name || 'Service'}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(item.created_at).toLocaleString()} | {item.city || 'Lagos'}
                        </p>
                        <p className="text-xs text-gray-500">{item.address || 'No address provided'}</p>
                      </div>
                      <Badge className={`${statusColor(item.status)} capitalize`}>
                        {item.status.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
