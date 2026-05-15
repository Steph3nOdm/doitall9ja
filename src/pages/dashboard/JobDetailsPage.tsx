import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ensureSupabaseConfigured, supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
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
  LayoutDashboard,
  Users,
  Settings,
  DollarSign,
  CheckCircle,
  Loader2,
  ArrowLeft,
  MapPin,
  Clock,
} from 'lucide-react';
import type { Job } from '@/types/database';

type DashboardRole = 'client' | 'technician' | 'admin' | 'support';

interface JobDetailsPageProps {
  dashboardRole: DashboardRole;
}

const clientNavItems = [
  { label: 'Dashboard', href: '/dashboard/client', icon: Home },
  { label: 'My Jobs', href: '/dashboard/client/jobs', icon: Briefcase },
  { label: 'Bookings', href: '/dashboard/client/bookings', icon: Calendar },
  { label: 'Request Service', href: '/dashboard/client/request', icon: Plus },
  { label: 'Messages', href: '/dashboard/client/messages', icon: MessageSquare },
  { label: 'History', href: '/dashboard/client/history', icon: History },
];

const technicianNavItems = [
  { label: 'Dashboard', href: '/dashboard/technician', icon: Home },
  { label: 'Available Jobs', href: '/dashboard/technician/jobs', icon: Briefcase },
  { label: 'My Jobs', href: '/dashboard/technician/my-jobs', icon: CheckCircle },
  { label: 'Messages', href: '/dashboard/technician/messages', icon: MessageSquare },
  { label: 'Earnings', href: '/dashboard/technician/earnings', icon: DollarSign },
];

const adminNavItems = [
  { label: 'Dashboard', href: '/dashboard/admin', icon: LayoutDashboard },
  { label: 'All Jobs', href: '/dashboard/admin/jobs', icon: Briefcase },
  { label: 'Bookings', href: '/dashboard/admin/bookings', icon: Calendar },
  { label: 'Technicians', href: '/dashboard/admin/technicians', icon: Users },
  { label: 'Support Chat', href: '/dashboard/admin/support', icon: MessageSquare },
  { label: 'Settings', href: '/dashboard/admin/settings', icon: Settings },
];

export default function JobDetailsPage({ dashboardRole }: JobDetailsPageProps) {
  const { jobId } = useParams<{ jobId: string }>();
  const { user } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const navItems = useMemo(() => {
    if (dashboardRole === 'client') return clientNavItems;
    if (dashboardRole === 'technician') return technicianNavItems;
    return adminNavItems;
  }, [dashboardRole]);

  const backHref = useMemo(() => {
    if (dashboardRole === 'client') return '/dashboard/client/jobs';
    if (dashboardRole === 'technician') return '/dashboard/technician/jobs';
    return '/dashboard/admin/jobs';
  }, [dashboardRole]);

  useEffect(() => {
    const loadJob = async () => {
      if (!user || !jobId) {
        setJob(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError('');

      try {
        ensureSupabaseConfigured();
        const { data, error } = await supabase
          .from('jobs')
          .select('*')
          .eq('id', jobId)
          .single();

        if (error) throw error;
        setJob((data as Job) || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load job details');
        setJob(null);
      } finally {
        setIsLoading(false);
      }
    };

    void loadJob();
  }, [user, jobId]);

  const statusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'assigned':
      case 'accepted':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'in_progress':
        return 'bg-[#00C853]/20 text-[#00C853] border-[#00C853]/30';
      case 'completed':
      case 'confirmed':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'cancelled':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <DashboardLayout navItems={navItems} userRole={dashboardRole === 'support' ? 'admin' : dashboardRole}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Job Details</h1>
            <p className="text-gray-400">Job ID: {jobId || '-'}</p>
          </div>
          <Link to={backHref}>
            <Button variant="outline" className="border-gray-700 text-gray-300 hover:bg-[#2a2a2a]">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Jobs
            </Button>
          </Link>
        </div>

        {error && (
          <Alert className="bg-red-900/20 border-red-800">
            <AlertDescription className="text-red-400">{error}</AlertDescription>
          </Alert>
        )}

        <Card className="bg-[#1a1a1a] border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-[#00C853] mx-auto" />
              </div>
            ) : !job ? (
              <p className="text-gray-400">Job not found or you do not have access.</p>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-white">{job.title}</h2>
                    <p className="text-gray-400">{job.category}</p>
                  </div>
                  <Badge className={statusColor(job.status)}>
                    {job.status.replace(/_/g, ' ')}
                  </Badge>
                </div>

                <p className="text-gray-300">{job.description}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="p-3 rounded-lg bg-[#111] border border-gray-800">
                    <p className="text-gray-500 mb-1">Location</p>
                    <p className="text-gray-200 inline-flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {job.address}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-[#111] border border-gray-800">
                    <p className="text-gray-500 mb-1">Created</p>
                    <p className="text-gray-200 inline-flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {new Date(job.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="text-sm text-gray-400">
                  <p>Urgency: <span className="text-gray-200">{job.urgency}</span></p>
                  <p>Budget: <span className="text-gray-200">{job.budget ? `N${job.budget.toLocaleString()}` : 'Not set'}</span></p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
