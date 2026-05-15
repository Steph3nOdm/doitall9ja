import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useClientJobs } from '@/hooks/useJobs';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Home,
  Briefcase,
  MessageSquare,
  History,
  Plus,
  Search,
  MapPin,
  Calendar,
  ArrowRight,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

const navItems = [
  { label: 'Dashboard', href: '/dashboard/client', icon: Home },
  { label: 'My Jobs', href: '/dashboard/client/jobs', icon: Briefcase },
  { label: 'Bookings', href: '/dashboard/client/bookings', icon: Calendar },
  { label: 'Request Service', href: '/dashboard/client/request', icon: Plus },
  { label: 'Messages', href: '/dashboard/client/messages', icon: MessageSquare },
  { label: 'History', href: '/dashboard/client/history', icon: History },
];

export default function ClientJobs() {
  const { jobs, activeJobs, completedJobs, isLoading, cancelJob } = useClientJobs();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

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
      case 'cancelled':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const filterJobs = (jobList: typeof jobs) => {
    if (!searchQuery) return jobList;
    return jobList.filter(job =>
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.address.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const handleCancel = async () => {
    if (!selectedJob || !cancelReason.trim()) return;
    
    setIsCancelling(true);
    try {
      await cancelJob(selectedJob.id, cancelReason);
      setCancelDialogOpen(false);
      setCancelReason('');
      setSelectedJob(null);
    } catch (error) {
      console.error('Error cancelling job:', error);
    } finally {
      setIsCancelling(false);
    }
  };

  const renderJobCard = (job: typeof jobs[0]) => (
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
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{job.address}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Calendar className="h-4 w-4 flex-shrink-0" />
            <span>{new Date(job.created_at).toLocaleDateString()}</span>
          </div>
          {job.budget && (
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium text-[#00C853]">
                ₦{job.budget.toLocaleString()}
              </span>
              <span className="text-xs text-gray-500">({job.budget_type})</span>
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

        <div className="flex gap-2">
          <Link to={`/dashboard/client/jobs/${job.id}`} className="flex-1">
            <Button 
              variant="outline" 
              className="w-full border-gray-700 text-gray-300 hover:bg-[#2a2a2a] hover:text-white"
            >
              View Details
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          
          {['pending', 'assigned'].includes(job.status) && (
            <Button
              variant="outline"
              onClick={() => {
                setSelectedJob(job);
                setCancelDialogOpen(true);
              }}
              className="border-red-800 text-red-400 hover:bg-red-900/20 hover:text-red-300"
            >
              <XCircle className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <DashboardLayout navItems={navItems} userRole="client">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">My Jobs</h1>
            <p className="text-gray-400">Manage and track all your service requests</p>
          </div>
          <Link to="/dashboard/client/request">
            <Button className="bg-[#00C853] hover:bg-[#00C853]/90 text-black">
              <Plus className="mr-2 h-4 w-4" />
              New Request
            </Button>
          </Link>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search jobs by title, category, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-[#1a1a1a] border-gray-800 text-white placeholder:text-gray-500"
          />
        </div>

        {/* Jobs Tabs */}
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="bg-[#1a1a1a] border border-gray-800">
            <TabsTrigger 
              value="active"
              className="data-[state=active]:bg-[#00C853] data-[state=active]:text-black"
            >
              <Clock className="h-4 w-4 mr-2" />
              Active ({activeJobs.length})
            </TabsTrigger>
            <TabsTrigger 
              value="completed"
              className="data-[state=active]:bg-[#00C853] data-[state=active]:text-black"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Completed ({completedJobs.length})
            </TabsTrigger>
            <TabsTrigger 
              value="all"
              className="data-[state=active]:bg-[#00C853] data-[state=active]:text-black"
            >
              <Briefcase className="h-4 w-4 mr-2" />
              All ({jobs.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-6">
            {isLoading ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#00C853] mx-auto" />
                <p className="text-gray-400 mt-4">Loading jobs...</p>
              </div>
            ) : filterJobs(activeJobs).length === 0 ? (
              <div className="text-center py-12">
                <Clock className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No Active Jobs</h3>
                <p className="text-gray-400 mb-4">You don't have any active jobs at the moment.</p>
                <Link to="/dashboard/client/request">
                  <Button className="bg-[#00C853] hover:bg-[#00C853]/90 text-black">
                    Request a Service
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filterJobs(activeJobs).map(renderJobCard)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="mt-6">
            {isLoading ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#00C853] mx-auto" />
                <p className="text-gray-400 mt-4">Loading jobs...</p>
              </div>
            ) : filterJobs(completedJobs).length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No Completed Jobs</h3>
                <p className="text-gray-400">Your completed jobs will appear here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filterJobs(completedJobs).map(renderJobCard)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="all" className="mt-6">
            {isLoading ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#00C853] mx-auto" />
                <p className="text-gray-400 mt-4">Loading jobs...</p>
              </div>
            ) : filterJobs(jobs).length === 0 ? (
              <div className="text-center py-12">
                <Briefcase className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No Jobs Yet</h3>
                <p className="text-gray-400 mb-4">You haven't created any service requests yet.</p>
                <Link to="/dashboard/client/request">
                  <Button className="bg-[#00C853] hover:bg-[#00C853]/90 text-black">
                    Request a Service
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filterJobs(jobs).map(renderJobCard)}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Cancel Dialog */}
        <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
          <DialogContent className="bg-[#1a1a1a] border-gray-800 text-white">
            <DialogHeader>
              <DialogTitle>Cancel Job Request</DialogTitle>
              <DialogDescription className="text-gray-400">
                Are you sure you want to cancel this job request? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {selectedJob && (
                <div className="p-3 bg-[#2a2a2a] rounded-lg">
                  <p className="font-medium text-white">{selectedJob.title}</p>
                  <p className="text-sm text-gray-400">{selectedJob.category}</p>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="reason" className="text-gray-300">Reason for cancellation</Label>
                <Textarea
                  id="reason"
                  placeholder="Please tell us why you're cancelling..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="bg-[#2a2a2a] border-gray-700 text-white placeholder:text-gray-500"
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setCancelDialogOpen(false)}
                className="border-gray-700 text-gray-300 hover:bg-[#2a2a2a]"
              >
                Keep Job
              </Button>
              <Button
                onClick={handleCancel}
                disabled={!cancelReason.trim() || isCancelling}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isCancelling ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  'Cancel Job'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
