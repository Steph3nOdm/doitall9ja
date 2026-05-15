import { useEffect, useMemo, useState } from 'react';
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
  CheckCircle,
  DollarSign,
  Loader2,
  RefreshCw,
  Calendar,
} from 'lucide-react';

type EarningBooking = {
  id: string;
  service: string | null;
  service_name: string | null;
  status: string;
  payment_status: string | null;
  quoted_price: number | null;
  budget_amount: number | null;
  created_at: string;
};

const navItems = [
  { label: 'Dashboard', href: '/dashboard/technician', icon: Home },
  { label: 'Available Jobs', href: '/dashboard/technician/jobs', icon: Briefcase },
  { label: 'My Jobs', href: '/dashboard/technician/my-jobs', icon: CheckCircle },
  { label: 'Messages', href: '/dashboard/technician/messages', icon: MessageSquare },
  { label: 'Earnings', href: '/dashboard/technician/earnings', icon: DollarSign },
];

export default function TechnicianEarningsPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<EarningBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadEarnings = async () => {
    if (!user) {
      setBookings([]);
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
        .eq('technician_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBookings((data as EarningBooking[]) || []);
    } catch (error) {
      console.error('APP ERROR:', error);
      setError(error instanceof Error ? error.message : 'Failed to load earnings');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadEarnings();
  }, [user?.id]);

  const paidCompletedJobs = useMemo(
    () => bookings.filter((booking) => booking.payment_status === 'paid' && booking.status === 'completed'),
    [bookings]
  );

  const totalEarnings = useMemo(
    () =>
      paidCompletedJobs.reduce((sum, booking) => {
        const amount =
          typeof booking.quoted_price === 'number' && booking.quoted_price > 0
            ? booking.quoted_price
            : typeof booking.budget_amount === 'number'
              ? booking.budget_amount
              : 0;
        return sum + amount;
      }, 0),
    [paidCompletedJobs]
  );

  return (
    <DashboardLayout navItems={navItems} userRole="technician">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Earnings</h1>
            <p className="text-gray-400">Track completed and paid jobs.</p>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={loadEarnings}
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
            <CardTitle className="text-white">Summary</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg border border-gray-800 bg-[#111] p-4">
              <p className="text-gray-400 text-sm">Paid Completed Jobs</p>
              <p className="text-2xl font-bold text-white mt-1">{paidCompletedJobs.length}</p>
            </div>
            <div className="rounded-lg border border-gray-800 bg-[#111] p-4 md:col-span-2">
              <p className="text-gray-400 text-sm">Total Earnings</p>
              <p className="text-2xl font-bold text-[#00C853] mt-1">N{totalEarnings.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a1a] border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Recent Paid Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-[#00C853] mx-auto" />
              </div>
            ) : paidCompletedJobs.length === 0 ? (
              <p className="text-gray-400">No completed paid jobs yet.</p>
            ) : (
              <div className="space-y-3">
                {paidCompletedJobs.map((booking) => {
                  const amount =
                    typeof booking.quoted_price === 'number' && booking.quoted_price > 0
                      ? booking.quoted_price
                      : typeof booking.budget_amount === 'number'
                        ? booking.budget_amount
                        : 0;

                  return (
                    <div key={booking.id} className="rounded-lg border border-gray-800 bg-[#111] p-4">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <div>
                          <p className="text-white font-semibold">{booking.service || booking.service_name || 'Service'}</p>
                          <p className="text-xs text-gray-400 inline-flex items-center gap-1 mt-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(booking.created_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Paid</Badge>
                          <Badge className="bg-[#00C853]/20 text-[#00C853] border-[#00C853]/30">N{amount.toLocaleString()}</Badge>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
