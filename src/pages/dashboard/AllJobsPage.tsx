import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ensureSupabaseConfigured, supabase } from '@/lib/supabase';
import { isValidTransition, normalizeBookingStatus } from '@/lib/bookingStatus';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  LayoutDashboard,
  Briefcase,
  Users,
  MessageSquare,
  Settings,
  Home,
  CheckCircle,
  DollarSign,
  ClipboardList,
  ArrowRight,
  Loader2,
  MapPin,
  Clock,
  Calendar,
} from 'lucide-react';

type DashboardRole = 'admin' | 'technician';
type JobsTab = 'all' | 'available' | 'my';

type BookingItem = {
  id: string;
  service: string | null;
  service_name: string | null;
  description: string | null;
  address: string | null;
  city: string | null;
  urgency: 'low' | 'medium' | 'high' | 'emergency' | null;
  budget_amount: number | null;
  quoted_price: number | null;
  status: string;
  technician_id: string | null;
  created_at: string;
};

type AllJobsPageProps = {
  dashboardRole: DashboardRole;
  initialTab?: JobsTab;
};

const adminNavItems = [
  { label: 'Dashboard', href: '/dashboard/admin', icon: LayoutDashboard },
  { label: 'All Jobs', href: '/dashboard/admin/jobs', icon: Briefcase },
  { label: 'Bookings', href: '/dashboard/admin/bookings', icon: ClipboardList },
  { label: 'Technicians', href: '/dashboard/admin/technicians', icon: Users },
  { label: 'Support Chat', href: '/dashboard/admin/support', icon: MessageSquare },
  { label: 'Settings', href: '/dashboard/admin/settings', icon: Settings },
];

const technicianNavItems = [
  { label: 'Dashboard', href: '/dashboard/technician', icon: Home },
  { label: 'Available Jobs', href: '/dashboard/technician/jobs', icon: Briefcase },
  { label: 'My Jobs', href: '/dashboard/technician/my-jobs', icon: CheckCircle },
  { label: 'Messages', href: '/dashboard/technician/messages', icon: MessageSquare },
  { label: 'Earnings', href: '/dashboard/technician/earnings', icon: DollarSign },
];

const getStatusColor = (status: string) => {
  const normalized = normalizeBookingStatus(status);
  switch (normalized) {
    case 'pending':
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'assigned':
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'in_progress':
      return 'bg-[#00C853]/20 text-[#00C853] border-[#00C853]/30';
    case 'completed':
      return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'cancelled':
      return 'bg-red-500/20 text-red-400 border-red-500/30';
    default:
      return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }
};

const getUrgencyColor = (urgency: string | null) => {
  switch (urgency) {
    case 'emergency':
      return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'high':
      return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    case 'medium':
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    default:
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
  }
};

const getStatusLabel = (status: string) => normalizeBookingStatus(status).replace(/_/g, ' ');

const isValidUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim());

export default function AllJobsPage({ dashboardRole, initialTab = 'all' }: AllJobsPageProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<JobsTab>(initialTab);
  const [allJobs, setAllJobs] = useState<BookingItem[]>([]);
  const [availableJobs, setAvailableJobs] = useState<BookingItem[]>([]);
  const [myJobs, setMyJobs] = useState<BookingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAcceptingJobId, setIsAcceptingJobId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const navItems = dashboardRole === 'admin' ? adminNavItems : technicianNavItems;

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const loadJobs = async () => {
    setIsLoading(true);
    setError('');

    try {
      ensureSupabaseConfigured();

      if (dashboardRole === 'admin') {
        const { data, error } = await supabase
          .from('bookings')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setAllJobs((data as BookingItem[]) || []);
      } else {
        if (!user) {
          setAvailableJobs([]);
          setMyJobs([]);
          return;
        }

        const [availableResponse, myJobsResponse] = await Promise.all([
          supabase
            .from('bookings')
            .select('*')
            .is('technician_id', null)
            .eq('status', 'pending')
            .order('created_at', { ascending: false }),
          supabase
            .from('bookings')
            .select('*')
            .eq('technician_id', user.id)
            .order('created_at', { ascending: false }),
        ]);

        if (availableResponse.error) throw availableResponse.error;
        if (myJobsResponse.error) throw myJobsResponse.error;

        setAvailableJobs((availableResponse.data as BookingItem[]) || []);
        setMyJobs((myJobsResponse.data as BookingItem[]) || []);
      }
    } catch (error) {
      console.error('SYSTEM ERROR:', error instanceof Error ? error.message : String(error));
      setError(error instanceof Error ? error.message : 'Failed to load jobs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadJobs();
  }, [dashboardRole, user?.id]);

  const acceptJob = async (bookingId: string) => {
    if (!user) return;

    if (!user.id || !isValidUuid(user.id)) {
      console.error('BLOCKED INVALID TECHNICIAN ID:', user.id);
      setError('Invalid technician selected');
      return;
    }

    const booking = availableJobs.find((item) => item.id === bookingId);
    if (booking && !isValidTransition(normalizeBookingStatus(booking.status), 'assigned')) {
      setError('Invalid status transition');
      return;
    }

    setIsAcceptingJobId(bookingId);
    setError('');
    setSuccess('');

    try {
      ensureSupabaseConfigured();

      console.log('ASSIGN DEBUG:', {
        bookingId,
        technicianId: user.id,
        length: user.id?.length,
      });

      const { data, error } = await supabase
        .from('bookings')
        .update({
          technician_id: user.id,
          status: 'assigned',
        })
        .eq('id', bookingId)
        .is('technician_id', null)
        .select('id, technician_id, status');

      console.log('ASSIGN RESULT:', data, error);

      if (error) {
        console.error('SYSTEM ERROR:', error.message);
        throw error;
      }

      if (!data || data.length === 0) {
        setError('This job has already been claimed by another technician.');
        return;
      }

      setSuccess('Job accepted successfully.');
      await loadJobs();
      setActiveTab('my');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('SYSTEM ERROR:', message);
      if (message.toLowerCase().includes('already assigned') || message.toLowerCase().includes('job already assigned')) {
        setError('This job has already been claimed by another technician.');
      } else {
        setError(message || 'Failed to accept job');
      }
    } finally {
      setIsAcceptingJobId('');
    }
  };

  const stats = useMemo(() => {
    if (dashboardRole === 'admin') {
      return {
        total: allJobs.length,
        pending: allJobs.filter((job) => normalizeBookingStatus(job.status) === 'pending').length,
      };
    }
    return {
      available: availableJobs.length,
      mine: myJobs.length,
    };
  }, [dashboardRole, allJobs, availableJobs, myJobs]);

  const renderJobCard = (job: BookingItem, mode: 'admin' | 'available' | 'my') => {
    const title = job.service || job.service_name || 'Service Request';
    const location = [job.city || 'Lagos', job.address || 'No address provided']
      .filter(Boolean)
      .join(' - ');
    const budget = typeof job.budget_amount === 'number' && job.budget_amount > 0
      ? job.budget_amount
      : typeof job.quoted_price === 'number'
        ? job.quoted_price
        : null;

    return (
      <Card key={job.id} className="bg-[#1a1a1a] border-gray-800">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-white font-semibold">{title}</h3>
              <p className="text-xs text-gray-500 mt-1">ID: {job.id.slice(0, 8)}</p>
            </div>
            <Badge className={`${getStatusColor(job.status)} capitalize`}>
              {getStatusLabel(job.status)}
            </Badge>
          </div>

          <div className="space-y-2 text-sm">
            <p className="text-gray-300 inline-flex items-center gap-2">
              <MapPin className="h-4 w-4 text-gray-500" />
              {location}
            </p>
            <p className="text-gray-300 inline-flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              {job.description || 'No description provided'}
            </p>
            <p className="text-gray-400 inline-flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              {new Date(job.created_at).toLocaleString()}
            </p>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Badge className={`${getUrgencyColor(job.urgency)} capitalize`}>
                {(job.urgency || 'medium')}
              </Badge>
              {budget !== null && (
                <Badge className="bg-[#00C853]/20 text-[#00C853] border-[#00C853]/30">
                  N{budget.toLocaleString()}
                </Badge>
              )}
            </div>

            {mode === 'available' ? (
              <Button
                type="button"
                size="sm"
                onClick={() => acceptJob(job.id)}
                disabled={isAcceptingJobId === job.id || job.technician_id !== null}
                className="bg-[#00C853] hover:bg-[#00C853]/90 text-black font-semibold"
              >
                {isAcceptingJobId === job.id ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Accepting...
                  </>
                ) : job.technician_id !== null ? (
                  'Already Assigned'
                ) : (
                  'Accept Job'
                )}
              </Button>
            ) : (
              <Link to={`/dashboard/${dashboardRole}/jobs/${job.id}`}>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-gray-700 text-gray-300 hover:bg-[#2a2a2a] hover:text-white"
                >
                  View Details
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <DashboardLayout navItems={navItems} userRole={dashboardRole}>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {dashboardRole === 'admin' ? 'All Jobs' : 'Jobs'}
            </h1>
            <p className="text-gray-400">
              {dashboardRole === 'admin'
                ? `Track all platform bookings. Total: ${stats.total || 0}, Pending: ${stats.pending || 0}`
                : `Discover available jobs and manage your assignments. Available: ${stats.available || 0}, My jobs: ${stats.mine || 0}`}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={loadJobs}
            disabled={isLoading}
            className="border-gray-700 text-gray-300 hover:bg-[#2a2a2a] hover:text-white"
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Refresh
          </Button>
        </div>

        {error && (
          <Alert className="bg-red-900/20 border-red-800">
            <AlertDescription className="text-red-400">{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="bg-[#00C853]/10 border-[#00C853]/40">
            <AlertDescription className="text-[#00C853]">{success}</AlertDescription>
          </Alert>
        )}

        <Card className="bg-[#1a1a1a] border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">
              {dashboardRole === 'admin' ? 'Jobs' : 'Technician Jobs'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as JobsTab)} className="space-y-4">
              <TabsList className={`grid ${dashboardRole === 'admin' ? 'grid-cols-1 max-w-xs' : 'grid-cols-2 max-w-md'} bg-[#2a2a2a]`}>
                {dashboardRole === 'admin' ? (
                  <TabsTrigger value="all" className="data-[state=active]:bg-[#00C853] data-[state=active]:text-black">
                    All Jobs
                  </TabsTrigger>
                ) : (
                  <>
                    <TabsTrigger value="available" className="data-[state=active]:bg-[#00C853] data-[state=active]:text-black">
                      Available Jobs
                    </TabsTrigger>
                    <TabsTrigger value="my" className="data-[state=active]:bg-[#00C853] data-[state=active]:text-black">
                      My Jobs
                    </TabsTrigger>
                  </>
                )}
              </TabsList>

              {dashboardRole === 'admin' ? (
                <TabsContent value="all" className="space-y-3">
                  {isLoading ? (
                    <div className="text-center py-10">
                      <Loader2 className="h-6 w-6 animate-spin text-[#00C853] mx-auto" />
                    </div>
                  ) : allJobs.length === 0 ? (
                    <p className="text-gray-400">No jobs available.</p>
                  ) : (
                    allJobs.map((job) => renderJobCard(job, 'admin'))
                  )}
                </TabsContent>
              ) : (
                <>
                  <TabsContent value="available" className="space-y-3">
                    {isLoading ? (
                      <div className="text-center py-10">
                        <Loader2 className="h-6 w-6 animate-spin text-[#00C853] mx-auto" />
                      </div>
                    ) : availableJobs.length === 0 ? (
                      <p className="text-gray-400">No available jobs right now.</p>
                    ) : (
                      availableJobs.map((job) => renderJobCard(job, 'available'))
                    )}
                  </TabsContent>

                  <TabsContent value="my" className="space-y-3">
                    {isLoading ? (
                      <div className="text-center py-10">
                        <Loader2 className="h-6 w-6 animate-spin text-[#00C853] mx-auto" />
                      </div>
                    ) : myJobs.length === 0 ? (
                      <p className="text-gray-400">You do not have assigned jobs yet.</p>
                    ) : (
                      myJobs.map((job) => renderJobCard(job, 'my'))
                    )}
                  </TabsContent>
                </>
              )}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}



