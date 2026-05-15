import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useClientJobs } from '@/hooks/useJobs';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import {
  Home,
  Briefcase,
  MessageSquare,
  History,
  Plus,
  MapPin,
  Calendar,
  ArrowRight,
  Star,
  CheckCircle,
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', href: '/dashboard/client', icon: Home },
  { label: 'My Jobs', href: '/dashboard/client/jobs', icon: Briefcase },
  { label: 'Bookings', href: '/dashboard/client/bookings', icon: Calendar },
  { label: 'Request Service', href: '/dashboard/client/request', icon: Plus },
  { label: 'Messages', href: '/dashboard/client/messages', icon: MessageSquare },
  { label: 'History', href: '/dashboard/client/history', icon: History },
];

export default function ClientDashboard() {
  const { profile } = useAuth();
  const { jobs, activeJobs, completedJobs, isLoading } = useClientJobs();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'assigned':
      case 'accepted':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'in_progress':
        return 'bg-[#00C853]/20 text-[#00C853] border-[#00C853]/30';
      case 'completed':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'confirmed':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <DashboardLayout navItems={navItems} userRole="client">
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">
              Welcome back, {profile?.full_name?.split(' ')[0]}!
            </h1>
            <p className="text-gray-400 mt-1">
              Manage your home services and track your jobs
            </p>
          </div>
          <Link to="/dashboard/client/request">
            <Button className="bg-[#00C853] hover:bg-[#00C853]/90 text-black font-semibold">
              <Plus className="mr-2 h-4 w-4" />
              Request a Service
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-[#1a1a1a] border-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Active Jobs</p>
                  <p className="text-3xl font-bold text-white mt-1">
                    {isLoading ? '-' : activeJobs.length}
                  </p>
                </div>
                <div className="h-12 w-12 bg-[#00C853]/20 rounded-lg flex items-center justify-center">
                  <Briefcase className="h-6 w-6 text-[#00C853]" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1a1a1a] border-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Completed Jobs</p>
                  <p className="text-3xl font-bold text-white mt-1">
                    {isLoading ? '-' : completedJobs.length}
                  </p>
                </div>
                <div className="h-12 w-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1a1a1a] border-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Jobs</p>
                  <p className="text-3xl font-bold text-white mt-1">
                    {isLoading ? '-' : jobs.length}
                  </p>
                </div>
                <div className="h-12 w-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Star className="h-6 w-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Active Jobs Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Active Jobs</h2>
            <Link 
              to="/dashboard/client/jobs"
              className="text-[#00C853] hover:text-[#00C853]/80 text-sm flex items-center gap-1"
            >
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin h-8 w-8 border-2 border-[#00C853] border-t-transparent rounded-full mx-auto"></div>
              <p className="text-gray-400 mt-4">Loading jobs...</p>
            </div>
          ) : activeJobs.length === 0 ? (
            <Card className="bg-[#1a1a1a] border-gray-800">
              <CardContent className="p-12 text-center">
                <div className="h-16 w-16 bg-[#2a2a2a] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Briefcase className="h-8 w-8 text-gray-500" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">No Active Jobs</h3>
                <p className="text-gray-400 mb-6">You don't have any active jobs at the moment.</p>
                <Link to="/dashboard/client/request">
                  <Button className="bg-[#00C853] hover:bg-[#00C853]/90 text-black">
                    <Plus className="mr-2 h-4 w-4" />
                    Request a Service
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {activeJobs.slice(0, 4).map((job) => (
                <Card key={job.id} className="bg-[#1a1a1a] border-gray-800 hover:border-gray-700 transition-colors">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-white">{job.title}</h3>
                        <p className="text-sm text-gray-400">{job.category}</p>
                      </div>
                      <Badge className={`${getStatusColor(job.status)} capitalize`}>
                        {getStatusLabel(job.status)}
                      </Badge>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <MapPin className="h-4 w-4" />
                        <span className="truncate">{job.address}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(job.created_at).toLocaleDateString()}</span>
                      </div>
                      {job.budget && (
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <span className="font-medium text-[#00C853]">
                            ₦{job.budget.toLocaleString()}
                          </span>
                          <span className="text-xs">({job.budget_type})</span>
                        </div>
                      )}
                    </div>

                    {job.technician && (
                      <div className="flex items-center gap-3 p-3 bg-[#2a2a2a] rounded-lg mb-4">
                        <div className="h-10 w-10 bg-[#00C853]/20 rounded-full flex items-center justify-center">
                          <span className="text-[#00C853] font-medium">
                            {job.technician.full_name?.charAt(0)}
                          </span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">
                            {job.technician.full_name}
                          </p>
                          <p className="text-xs text-gray-400">Assigned Technician</p>
                        </div>
                      </div>
                    )}

                    <Link to={`/dashboard/client/jobs/${job.id}`}>
                      <Button 
                        variant="outline" 
                        className="w-full border-gray-700 text-gray-300 hover:bg-[#2a2a2a] hover:text-white"
                      >
                        View Details
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Link to="/dashboard/client/bookings">
              <Card className="bg-[#1a1a1a] border-gray-800 hover:border-yellow-500/50 transition-colors cursor-pointer h-full">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="h-12 w-12 bg-yellow-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Calendar className="h-6 w-6 text-yellow-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Book Service</h3>
                    <p className="text-sm text-gray-400">Pick date and time</p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link to="/dashboard/client/request">
              <Card className="bg-[#1a1a1a] border-gray-800 hover:border-[#00C853]/50 transition-colors cursor-pointer h-full">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="h-12 w-12 bg-[#00C853]/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Plus className="h-6 w-6 text-[#00C853]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Request Service</h3>
                    <p className="text-sm text-gray-400">Book a new service</p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link to="/dashboard/client/jobs">
              <Card className="bg-[#1a1a1a] border-gray-800 hover:border-blue-500/50 transition-colors cursor-pointer h-full">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="h-12 w-12 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Briefcase className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">My Jobs</h3>
                    <p className="text-sm text-gray-400">View all your jobs</p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link to="/dashboard/client/messages">
              <Card className="bg-[#1a1a1a] border-gray-800 hover:border-purple-500/50 transition-colors cursor-pointer h-full">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="h-12 w-12 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="h-6 w-6 text-purple-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Support</h3>
                    <p className="text-sm text-gray-400">Chat with support</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
