import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAdminJobs } from '@/hooks/useJobs';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import {
  LayoutDashboard,
  Briefcase,
  Users,
  MessageSquare,
  Settings,
  Clock,
  ClipboardList,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Loader2,
  MapPin,
  Calendar,
  User,
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', href: '/dashboard/admin', icon: LayoutDashboard },
  { label: 'All Jobs', href: '/dashboard/admin/jobs', icon: Briefcase },
  { label: 'Bookings', href: '/dashboard/admin/bookings', icon: ClipboardList },
  { label: 'Technicians', href: '/dashboard/admin/technicians', icon: Users },
  { label: 'Support Chat', href: '/dashboard/admin/support', icon: MessageSquare },
  { label: 'Settings', href: '/dashboard/admin/settings', icon: Settings },
];

export default function AdminDashboard() {
  const { 
    jobs, 
    pendingJobs, 
    assignedJobs, 
    inProgressJobs, 
    completedJobs,
    disputedJobs,
    isLoading,
    fetchAllJobs 
  } = useAdminJobs();
  
  const [stats, setStats] = useState({
    totalTechnicians: 0,
    totalClients: 0,
    totalRevenue: 0,
  });
  const [isStatsLoading, setIsStatsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchAllJobs();
  }, []);

  const fetchStats = async () => {
    setIsStatsLoading(true);
    try {
      // Get technician count
      const { count: technicianCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'technician');

      // Get client count
      const { count: clientCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'client');

      setStats({
        totalTechnicians: technicianCount || 0,
        totalClients: clientCount || 0,
        totalRevenue: 0, // Will be calculated from payments
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setIsStatsLoading(false);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'emergency':
        return 'bg-red-500 text-white';
      case 'high':
        return 'bg-orange-500 text-white';
      case 'medium':
        return 'bg-yellow-500 text-black';
      default:
        return 'bg-blue-500 text-white';
    }
  };

  return (
    <DashboardLayout navItems={navItems} userRole="admin">
      <div className="space-y-8">
        {/* Welcome Section */}
        <div>
          <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-gray-400 mt-1">
            Overview of platform activity and management
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-[#1a1a1a] border-gray-800">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-[#00C853]/20 rounded-lg flex items-center justify-center">
                  <Briefcase className="h-5 w-5 text-[#00C853]" />
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Total Jobs</p>
                  <p className="text-xl font-bold text-white">
                    {isLoading ? '-' : jobs.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1a1a1a] border-gray-800">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Technicians</p>
                  <p className="text-xl font-bold text-white">
                    {isStatsLoading ? '-' : stats.totalTechnicians}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1a1a1a] border-gray-800">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <User className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Clients</p>
                  <p className="text-xl font-bold text-white">
                    {isStatsLoading ? '-' : stats.totalClients}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1a1a1a] border-gray-800">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                  <Clock className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Pending</p>
                  <p className="text-xl font-bold text-white">
                    {isLoading ? '-' : pendingJobs.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Job Status Overview */}
        <Card className="bg-[#1a1a1a] border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Job Status Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center p-4 bg-[#2a2a2a] rounded-lg">
                <p className="text-2xl font-bold text-yellow-400">{pendingJobs.length}</p>
                <p className="text-xs text-gray-400">Pending</p>
              </div>
              <div className="text-center p-4 bg-[#2a2a2a] rounded-lg">
                <p className="text-2xl font-bold text-blue-400">{assignedJobs.length}</p>
                <p className="text-xs text-gray-400">Assigned</p>
              </div>
              <div className="text-center p-4 bg-[#2a2a2a] rounded-lg">
                <p className="text-2xl font-bold text-[#00C853]">{inProgressJobs.length}</p>
                <p className="text-xs text-gray-400">In Progress</p>
              </div>
              <div className="text-center p-4 bg-[#2a2a2a] rounded-lg">
                <p className="text-2xl font-bold text-green-400">{completedJobs.length}</p>
                <p className="text-xs text-gray-400">Completed</p>
              </div>
              <div className="text-center p-4 bg-[#2a2a2a] rounded-lg">
                <p className="text-2xl font-bold text-red-400">{disputedJobs.length}</p>
                <p className="text-xs text-gray-400">Disputed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Jobs & Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Pending Jobs */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Recent Jobs Requiring Attention</h2>
              <Link 
                to="/dashboard/admin/jobs"
                className="text-[#00C853] hover:text-[#00C853]/80 text-sm flex items-center gap-1"
              >
                View All <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {isLoading ? (
              <div className="text-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-[#00C853] mx-auto" />
              </div>
            ) : pendingJobs.length === 0 ? (
              <Card className="bg-[#1a1a1a] border-gray-800">
                <CardContent className="p-8 text-center">
                  <CheckCircle className="h-10 w-10 text-[#00C853] mx-auto mb-3" />
                  <p className="text-gray-400">All caught up! No pending jobs.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {pendingJobs.slice(0, 5).map((job) => (
                  <Card key={job.id} className="bg-[#1a1a1a] border-gray-800">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-white">{job.title}</h3>
                            <Badge className={`${getUrgencyColor(job.urgency)} text-xs`}>
                              {job.urgency}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-400 mb-2">{job.category}</p>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {job.client?.full_name}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {job.location || 'Lagos'}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(job.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <Link to="/dashboard/admin/bookings">
                          <Button size="sm" className="bg-[#00C853] hover:bg-[#00C853]/90 text-black">
                            Assign
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link to="/dashboard/admin/jobs">
                <Card className="bg-[#1a1a1a] border-gray-800 hover:border-[#00C853]/50 transition-colors cursor-pointer">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="h-10 w-10 bg-[#00C853]/20 rounded-lg flex items-center justify-center">
                      <Briefcase className="h-5 w-5 text-[#00C853]" />
                    </div>
                    <div>
                      <h3 className="font-medium text-white">Manage Jobs</h3>
                      <p className="text-xs text-gray-400">Assign and monitor jobs</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link to="/dashboard/admin/technicians">
                <Card className="bg-[#1a1a1a] border-gray-800 hover:border-blue-500/50 transition-colors cursor-pointer">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="h-10 w-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                      <Users className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <h3 className="font-medium text-white">Technicians</h3>
                      <p className="text-xs text-gray-400">Manage technician profiles</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link to="/dashboard/admin/support">
                <Card className="bg-[#1a1a1a] border-gray-800 hover:border-purple-500/50 transition-colors cursor-pointer">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="h-10 w-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                      <MessageSquare className="h-5 w-5 text-purple-500" />
                    </div>
                    <div>
                      <h3 className="font-medium text-white">Support Chat</h3>
                      <p className="text-xs text-gray-400">Handle support requests</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>

            {/* Disputed Jobs Alert */}
            {disputedJobs.length > 0 && (
              <Card className="bg-red-900/20 border-red-800 mt-4">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                    <div>
                      <h3 className="font-medium text-red-400">{disputedJobs.length} Disputed Jobs</h3>
                      <p className="text-xs text-red-300">Require immediate attention</p>
                    </div>
                  </div>
                  <Link to="/dashboard/admin/jobs?filter=disputed">
                    <Button 
                      size="sm" 
                      className="w-full mt-3 bg-red-600 hover:bg-red-700 text-white"
                    >
                      View Disputed Jobs
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
