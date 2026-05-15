import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ensureSupabaseConfigured, supabase } from '@/lib/supabase';
import { isValidTransition, normalizeBookingStatus } from '@/lib/bookingStatus';
import { updateBooking } from '@/lib/bookingRpc';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Home,
  Briefcase,
  MessageSquare,
  MapPin,
  ArrowRight,
  Star,
  Clock,
  CheckCircle,
  DollarSign,
  AlertCircle,
  Loader2,
  Play,
  Plus,
  Trash2,
  FileText,
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', href: '/dashboard/technician', icon: Home },
  { label: 'Available Jobs', href: '/dashboard/technician/jobs', icon: Briefcase },
  { label: 'My Jobs', href: '/dashboard/technician/my-jobs', icon: CheckCircle },
  { label: 'Messages', href: '/dashboard/technician/messages', icon: MessageSquare },
  { label: 'Earnings', href: '/dashboard/technician/earnings', icon: DollarSign },
];

const createQuoteRow = (): QuoteRow => ({
  id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  item_name: '',
  description: '',
  quantity: '1',
  unit_price: '',
});

const isValidUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim());

const normalizeQuoteStatus = (value: TechnicianBooking['quote_status']): 'pending' | 'sent' | 'accepted' | 'rejected' => {
  const normalized = String(value || '').toLowerCase().trim();
  if (normalized === 'quoted') return 'sent';
  if (normalized === 'approved') return 'accepted';
  if (normalized === 'sent' || normalized === 'accepted' || normalized === 'rejected' || normalized === 'pending') {
    return normalized;
  }
  return 'pending';
};

type TechnicianBookingStatus =
  | 'pending'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

type TechnicianBooking = {
  id: string;
  service: string | null;
  service_name: string | null;
  date: string | null;
  time: string | null;
  preferred_date: string | null;
  preferred_time: string | null;
  job_type?: 'inspection' | 'fixed' | null;
  quote_status?: 'pending' | 'sent' | 'accepted' | 'rejected' | 'quoted' | 'approved' | null;
  quoted_price?: number | null;
  quote_details?: {
    items: Array<{
      item_name: string;
      description?: string;
      quantity: number;
      unit_price: number;
      total: number;
    }>;
    subtotal: number;
    service_fee: number;
    grand_total: number;
    submitted_at?: string;
  } | null;
  payment_status?: string | null;
  technician_id?: string | null;
  status: TechnicianBookingStatus;
  address: string;
  city: string;
  created_at: string;
};

type QuoteRow = {
  id: string;
  item_name: string;
  description: string;
  quantity: string;
  unit_price: string;
};

export default function TechnicianDashboard() {
  const { user, profile } = useAuth();
  const [availableBookings, setAvailableBookings] = useState<TechnicianBooking[]>([]);
  const [assignedBookings, setAssignedBookings] = useState<TechnicianBooking[]>([]);
  const [isAvailableBookingsLoading, setIsAvailableBookingsLoading] = useState(false);
  const [isAssignedBookingsLoading, setIsAssignedBookingsLoading] = useState(false);
  const [bookingActionId, setBookingActionId] = useState('');
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState('');
  const [quoteBooking, setQuoteBooking] = useState<TechnicianBooking | null>(null);
  const [quoteRows, setQuoteRows] = useState<QuoteRow[]>([createQuoteRow()]);
  const [serviceFee, setServiceFee] = useState('0');
  const [isSubmittingQuote, setIsSubmittingQuote] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'assigned':
        return 'bg-blue-500/20 text-blue-400';
      case 'accepted':
        return 'bg-purple-500/20 text-purple-400';
      case 'in_progress':
        return 'bg-[#00C853]/20 text-[#00C853]';
      case 'completed':
        return 'bg-green-500/20 text-green-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'emergency':
        return 'bg-red-500/20 text-red-400';
      case 'high':
        return 'bg-orange-500/20 text-orange-400';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-400';
      default:
        return 'bg-blue-500/20 text-blue-400';
    }
  };

  const getBookingStatusColor = (status: TechnicianBookingStatus) => {
    switch (status) {
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

  const getRowTotal = (row: QuoteRow) => {
    const quantity = Number(row.quantity);
    const unitPrice = Number(row.unit_price);
    if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice)) return 0;
    if (quantity <= 0 || unitPrice < 0) return 0;
    return quantity * unitPrice;
  };

  const quoteSubtotal = quoteRows.reduce((sum, row) => sum + getRowTotal(row), 0);
  const parsedServiceFee = Number(serviceFee);
  const normalizedServiceFee = Number.isFinite(parsedServiceFee) && parsedServiceFee > 0 ? parsedServiceFee : 0;
  const quoteGrandTotal = quoteSubtotal + normalizedServiceFee;
  const isJobsLoading = isAvailableBookingsLoading || isAssignedBookingsLoading;

  const availableJobs = availableBookings.map((booking) => ({
    id: booking.id,
    title: booking.service || booking.service_name || 'Service',
    category: booking.job_type === 'inspection' ? 'Inspection' : 'Fixed',
    urgency: 'medium',
    location: booking.city || 'Lagos',
    address: booking.address || '',
    technician_id: booking.technician_id || null,
    budget: typeof booking.quoted_price === 'number' ? booking.quoted_price : undefined,
  }));

  const activeJobs = assignedBookings
    .filter((booking) => !['completed', 'cancelled'].includes(booking.status))
    .map((booking) => ({
      id: booking.id,
      title: booking.service || booking.service_name || 'Service',
      category: booking.job_type === 'inspection' ? 'Inspection' : 'Fixed',
      status: booking.status,
      address: booking.address || '',
    }));

  const completedJobs = assignedBookings.filter((booking) => booking.status === 'completed');

  const fetchAvailableBookings = async () => {
    if (!user) {
      setAvailableBookings([]);
      return;
    }

    setIsAvailableBookingsLoading(true);
    setBookingError('');
    try {
      ensureSupabaseConfigured();
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .is('technician_id', null)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('SYSTEM ERROR:', error instanceof Error ? error.message : String(error));
        throw error;
      }

      setAvailableBookings((data as TechnicianBooking[]) || []);
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : 'Failed to load available jobs');
      setAvailableBookings([]);
    } finally {
      setIsAvailableBookingsLoading(false);
    }
  };

  const fetchAssignedBookings = async () => {
    if (!user) {
      setAssignedBookings([]);
      return;
    }

    setIsAssignedBookingsLoading(true);
    setBookingError('');
    setBookingSuccess('');
    try {
      ensureSupabaseConfigured();
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('technician_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('SYSTEM ERROR:', error instanceof Error ? error.message : String(error));
        throw error;
      }
      setAssignedBookings((data as TechnicianBooking[]) || []);
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : 'Failed to load assigned bookings');
      setAssignedBookings([]);
    } finally {
      setIsAssignedBookingsLoading(false);
    }
  };

  useEffect(() => {
    void fetchAvailableBookings();
    void fetchAssignedBookings();
  }, [user?.id]);

  const acceptAvailableJob = async (bookingId: string) => {
    if (!user) return;

    if (!user.id || !isValidUuid(user.id)) {
      console.error('BLOCKED INVALID TECHNICIAN ID:', user.id);
      setBookingError('Invalid technician selected');
      return;
    }

    const booking = availableBookings.find((item) => item.id === bookingId);
    if (booking && !isValidTransition(normalizeBookingStatus(booking.status), 'assigned')) {
      setBookingError('Invalid status transition');
      return;
    }

    setBookingActionId(bookingId);
    setBookingError('');
    setBookingSuccess('');

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
        setBookingError('This job is no longer available. Please refresh.');
        return;
      }

      setBookingSuccess('Job accepted successfully');
      await Promise.all([fetchAvailableBookings(), fetchAssignedBookings()]);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('SYSTEM ERROR:', message);
      if (message.toLowerCase().includes('already assigned') || message.toLowerCase().includes('job already assigned')) {
        setBookingError('This job is no longer available. Please refresh.');
      } else {
        setBookingError(message || 'Failed to accept job');
      }
    } finally {
      setBookingActionId('');
    }
  };
  const updateBookingStatus = async (booking: TechnicianBooking, nextStatus: 'in_progress' | 'completed') => {
    if (!user) return;

    if (booking.payment_status !== 'paid') {
      setBookingError('Payment required before work');
      return;
    }

    const canStart = normalizeBookingStatus(booking.status) === 'assigned' && nextStatus === 'in_progress';
    const canComplete = booking.status === 'in_progress' && nextStatus === 'completed';
    if (!canStart && !canComplete) return;

    if (!isValidTransition(normalizeBookingStatus(booking.status), nextStatus)) {
      setBookingError('Invalid status transition');
      return;
    }

    setBookingActionId(booking.id);
    setBookingError('');
    setBookingSuccess('');

    try {
      ensureSupabaseConfigured();

      const payload = { status: nextStatus };
      console.log('Payload:', {
        booking_id: booking.id,
        technician_id: user.id,
        status: nextStatus,
      });

      await updateBooking(booking.id, payload as any, false);

      setAssignedBookings((prev) =>
        prev.map((item) => (item.id === booking.id ? { ...item, status: nextStatus } : item))
      );
      setBookingSuccess('Booking status updated successfully');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('SYSTEM ERROR:', message);
      setBookingError(message || 'Failed to update booking status');
    } finally {
      setBookingActionId('');
    }
  };

  const openQuoteDialog = (booking: TechnicianBooking) => {
    setBookingError('');
    setBookingSuccess('');
    setQuoteBooking(booking);
    setQuoteRows([createQuoteRow()]);
    setServiceFee('0');
  };

  const closeQuoteDialog = () => {
    setQuoteBooking(null);
    setQuoteRows([createQuoteRow()]);
    setServiceFee('0');
  };

  const updateQuoteRow = (rowId: string, field: keyof Omit<QuoteRow, 'id'>, value: string) => {
    setQuoteRows((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, [field]: value } : row))
    );
  };

  const addQuoteRow = () => {
    setQuoteRows((prev) => [...prev, createQuoteRow()]);
  };

  const removeQuoteRow = (rowId: string) => {
    setQuoteRows((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((row) => row.id !== rowId);
    });
  };

  const submitQuote = async () => {
    if (!user || !quoteBooking) return;

    const normalizedRows = quoteRows.map((row) => ({
      item_name: row.item_name.trim(),
      description: row.description.trim(),
      quantity: Number(row.quantity),
      unit_price: Number(row.unit_price),
    }));

    if (
      normalizedRows.length === 0 ||
      normalizedRows.some(
        (row) =>
          !row.item_name ||
          !Number.isFinite(row.quantity) ||
          !Number.isFinite(row.unit_price) ||
          row.quantity <= 0 ||
          row.unit_price < 0
      )
    ) {
      setBookingError('Please complete all quote rows with valid quantity and unit price');
      return;
    }

    const items = normalizedRows.map((row) => ({
      ...row,
      total: row.quantity * row.unit_price,
    }));

    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const fee = normalizedServiceFee;
    const grandTotal = Math.round(subtotal + fee);

    if (grandTotal <= 0) {
      setBookingError('Quote total must be greater than zero');
      return;
    }

    setIsSubmittingQuote(true);
    setBookingActionId(quoteBooking.id);
    setBookingError('');
    setBookingSuccess('');

    const quoteDetails = {
      items,
      subtotal,
      service_fee: fee,
      grand_total: grandTotal,
      submitted_at: new Date().toISOString(),
    };

    try {
      ensureSupabaseConfigured();
      const payload = {
        quoted_price: grandTotal,
        quote_details: quoteDetails as any,
        quote_status: 'sent',
      };

      console.log('Payload:', {
        booking_id: quoteBooking.id,
        technician_id: user.id,
        status: quoteBooking.status,
        quoted_price: payload.quoted_price,
      });

      await updateBooking(quoteBooking.id, payload as any, false);

      setAssignedBookings((prev) =>
        prev.map((item) =>
          item.id === quoteBooking.id
            ? {
                ...item,
                quoted_price: grandTotal,
                quote_details: quoteDetails,
                quote_status: 'sent',
              }
            : item
        )
      );
      setBookingSuccess('Quote submitted successfully');
      closeQuoteDialog();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('SYSTEM ERROR:', message);
      setBookingError(message || 'Failed to submit quote');
    } finally {
      setIsSubmittingQuote(false);
      setBookingActionId('');
    }
  };

  return (
    <DashboardLayout navItems={navItems} userRole="technician">
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">
              Welcome back, {profile?.full_name?.split(' ')[0]}!
            </h1>
            <p className="text-gray-400 mt-1">
              Find jobs and manage your assignments
            </p>
          </div>
          <Link to="/dashboard/technician/jobs">
            <Button className="bg-[#00C853] hover:bg-[#00C853]/90 text-black font-semibold">
              <Briefcase className="mr-2 h-4 w-4" />
              Find Jobs
            </Button>
          </Link>
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
                  <p className="text-gray-400 text-xs">Available</p>
                  <p className="text-xl font-bold text-white">
                    {isJobsLoading ? '-' : availableJobs.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1a1a1a] border-gray-800">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Clock className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Active</p>
                  <p className="text-xl font-bold text-white">
                    {isJobsLoading ? '-' : activeJobs.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1a1a1a] border-gray-800">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Completed</p>
                  <p className="text-xl font-bold text-white">
                    {isJobsLoading ? '-' : completedJobs.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1a1a1a] border-gray-800">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                  <Star className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Rating</p>
                  <p className="text-xl font-bold text-white">
                    {profile?.rating?.toFixed(1) || 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Available Jobs */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Available Jobs</h2>
              <Link 
                to="/dashboard/technician/jobs"
                className="text-[#00C853] hover:text-[#00C853]/80 text-sm flex items-center gap-1"
              >
                View All <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {isJobsLoading ? (
              <div className="text-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-[#00C853] mx-auto" />
              </div>
            ) : availableJobs.length === 0 ? (
              <Card className="bg-[#1a1a1a] border-gray-800">
                <CardContent className="p-8 text-center">
                  <Briefcase className="h-10 w-10 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">No available jobs matching your skills</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {availableJobs.slice(0, 3).map((job) => (
                  <Card key={job.id} className="bg-[#1a1a1a] border-gray-800">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-medium text-white text-sm">{job.title}</h3>
                          <p className="text-xs text-gray-400">{job.category}</p>
                        </div>
                        <Badge className={`${getUrgencyColor(job.urgency)} text-xs`}>
                          {job.urgency}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {job.location || 'Lagos'}
                        </span>
                        {job.budget && (
                          <span className="text-[#00C853]">
                            N{job.budget.toLocaleString()}
                          </span>
                        )}
                      </div>

                      <Button
                        onClick={() => acceptAvailableJob(job.id)}
                        disabled={bookingActionId === job.id || Boolean(job.technician_id)}
                        size="sm"
                        className="w-full bg-[#00C853] hover:bg-[#00C853]/90 text-black"
                      >
                        {bookingActionId === job.id ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Accepting...
                          </>
                        ) : job.technician_id ? (
                          'Already Assigned'
                        ) : (
                          'Accept Job'
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* My Jobs */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">My Jobs</h2>
              <Link 
                to="/dashboard/technician/my-jobs"
                className="text-[#00C853] hover:text-[#00C853]/80 text-sm flex items-center gap-1"
              >
                View All <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {isJobsLoading ? (
              <div className="text-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-[#00C853] mx-auto" />
              </div>
            ) : activeJobs.length === 0 ? (
              <Card className="bg-[#1a1a1a] border-gray-800">
                <CardContent className="p-8 text-center">
                  <Clock className="h-10 w-10 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">No active jobs</p>
                  <p className="text-xs text-gray-500 mt-1">Accept a job to get started</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {activeJobs.slice(0, 3).map((job) => (
                  <Card key={job.id} className="bg-[#1a1a1a] border-gray-800">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-medium text-white text-sm">{job.title}</h3>
                          <p className="text-xs text-gray-400">{job.category}</p>
                        </div>
                        <Badge className={`${getStatusColor(job.status)} text-xs capitalize`}>
                          {job.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {job.address?.slice(0, 30)}...
                        </span>
                      </div>

                      <Link to={`/dashboard/technician/jobs/${job.id}`}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full border-gray-700 text-gray-300 hover:bg-[#2a2a2a]"
                        >
                          View Details
                          <ArrowRight className="ml-2 h-3 w-3" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Assigned Booking Workflow */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Assigned Bookings</h2>

          {bookingError && (
            <Alert className="mb-4 bg-red-900/20 border-red-800">
              <AlertDescription className="text-red-400">{bookingError}</AlertDescription>
            </Alert>
          )}

          {bookingSuccess && (
            <Alert className="mb-4 bg-[#00C853]/10 border-[#00C853]/40">
              <AlertDescription className="text-[#00C853]">{bookingSuccess}</AlertDescription>
            </Alert>
          )}

          {isAssignedBookingsLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[#00C853] mx-auto" />
            </div>
          ) : assignedBookings.length === 0 ? (
            <Card className="bg-[#1a1a1a] border-gray-800">
              <CardContent className="p-8 text-center">
                <Briefcase className="h-10 w-10 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No assigned bookings yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {assignedBookings.map((booking) => {
                const displayDate = booking.date || booking.preferred_date || '-';
                const displayTime = booking.time || booking.preferred_time || '-';
                const isInspection = booking.job_type === 'inspection';
                const quoteStatus = isInspection ? normalizeQuoteStatus(booking.quote_status) : 'accepted';
                const isPaid = booking.payment_status === 'paid';
                const paymentStatus = booking.payment_status || 'pending';
                const canCreateQuote = isInspection && quoteStatus === 'pending' && normalizeBookingStatus(booking.status) === 'assigned';
                const isStarting = bookingActionId === booking.id && normalizeBookingStatus(booking.status) === 'assigned';
                const isCompleting = bookingActionId === booking.id && booking.status === 'in_progress';

                return (
                  <Card key={booking.id} className="bg-[#1a1a1a] border-gray-800">
                    <CardContent className="p-4">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                        <div>
                          <h3 className="font-medium text-white">
                            {booking.service || booking.service_name || 'Service'}
                          </h3>
                          <p className="text-xs text-gray-400 mt-1">{booking.address}, {booking.city}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge className={isInspection ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-gray-500/20 text-gray-300 border-gray-500/30'}>
                              {isInspection ? 'Inspection' : 'Fixed'}
                            </Badge>
                            <Badge className={quoteStatus === 'accepted' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-purple-500/20 text-purple-400 border-purple-500/30'}>
                              Quote: {quoteStatus.replace('_', ' ')}
                            </Badge>
                            {typeof booking.quoted_price === 'number' && (
                              <Badge className="bg-[#00C853]/20 text-[#00C853] border-[#00C853]/30">
                                N{booking.quoted_price.toLocaleString()}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-400 mt-2">
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {displayDate}
                            </span>
                            <span>{displayTime}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            className={
                              paymentStatus === 'paid'
                                ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                : paymentStatus === 'failed'
                                  ? 'bg-red-500/20 text-red-400 border-red-500/30'
                                  : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                            }
                          >
                            {paymentStatus === 'paid'
                              ? 'Payment Completed'
                              : paymentStatus === 'failed'
                                ? 'Payment Failed'
                                : 'Awaiting Payment'}
                          </Badge>
                          <Badge className={`${getBookingStatusColor(booking.status)} capitalize`}>
                            {booking.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>

                      {!isPaid && (
                        <p className="text-xs text-yellow-400 mt-2">
                          {isInspection && quoteStatus === 'pending'
                            ? 'Create and submit quote to continue'
                            : 'Awaiting payment'}
                        </p>
                      )}

                      <div className="flex flex-col sm:flex-row gap-2 mt-4">
                        {canCreateQuote && (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => openQuoteDialog(booking)}
                            disabled={isSubmittingQuote || bookingActionId === booking.id}
                            className="bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
                          >
                            <FileText className="mr-2 h-4 w-4" />
                            Create Quote
                          </Button>
                        )}
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => updateBookingStatus(booking, 'in_progress')}
                            disabled={!isPaid || normalizeBookingStatus(booking.status) !== 'assigned' || bookingActionId === booking.id}
                            className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                          >
                          {isStarting ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Play className="mr-2 h-4 w-4" />
                          )}
                          Start Job
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => updateBookingStatus(booking, 'completed')}
                          disabled={!isPaid || booking.status !== 'in_progress' || bookingActionId === booking.id}
                          className="bg-[#00C853] hover:bg-[#00C853]/90 text-black disabled:opacity-50"
                        >
                          {isCompleting ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle className="mr-2 h-4 w-4" />
                          )}
                          Complete Job
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <Dialog
          open={Boolean(quoteBooking)}
          onOpenChange={(open) => {
            if (!open && !isSubmittingQuote) closeQuoteDialog();
          }}
        >
          <DialogContent className="bg-[#1a1a1a] border-gray-800 text-white sm:max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Quote</DialogTitle>
              <DialogDescription className="text-gray-400">
                Build an itemized quotation for {quoteBooking?.service || quoteBooking?.service_name || 'this service'}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="overflow-x-auto rounded-md border border-gray-800">
                <table className="min-w-full text-sm">
                  <thead className="bg-[#111]">
                    <tr>
                      <th className="px-3 py-2 text-left text-gray-300">Item Name</th>
                      <th className="px-3 py-2 text-left text-gray-300">Description</th>
                      <th className="px-3 py-2 text-left text-gray-300">Qty</th>
                      <th className="px-3 py-2 text-left text-gray-300">Unit Price (N)</th>
                      <th className="px-3 py-2 text-left text-gray-300">Total (N)</th>
                      <th className="px-3 py-2 text-left text-gray-300">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quoteRows.map((row) => (
                      <tr key={row.id} className="border-t border-gray-800">
                        <td className="px-3 py-2 min-w-[160px]">
                          <Input
                            value={row.item_name}
                            onChange={(e) => updateQuoteRow(row.id, 'item_name', e.target.value)}
                            placeholder="e.g., Inspection fee"
                            className="bg-[#2a2a2a] border-gray-700 text-white"
                          />
                        </td>
                        <td className="px-3 py-2 min-w-[220px]">
                          <Input
                            value={row.description}
                            onChange={(e) => updateQuoteRow(row.id, 'description', e.target.value)}
                            placeholder="Item details"
                            className="bg-[#2a2a2a] border-gray-700 text-white"
                          />
                        </td>
                        <td className="px-3 py-2 min-w-[90px]">
                          <Input
                            type="number"
                            min="1"
                            step="1"
                            value={row.quantity}
                            onChange={(e) => updateQuoteRow(row.id, 'quantity', e.target.value)}
                            className="bg-[#2a2a2a] border-gray-700 text-white"
                          />
                        </td>
                        <td className="px-3 py-2 min-w-[140px]">
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            value={row.unit_price}
                            onChange={(e) => updateQuoteRow(row.id, 'unit_price', e.target.value)}
                            className="bg-[#2a2a2a] border-gray-700 text-white"
                          />
                        </td>
                        <td className="px-3 py-2 text-gray-200 whitespace-nowrap">
                          {getRowTotal(row).toLocaleString()}
                        </td>
                        <td className="px-3 py-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => removeQuoteRow(row.id)}
                            disabled={quoteRows.length === 1}
                            className="border-gray-700 text-gray-300 hover:bg-[#2a2a2a]"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={addQuoteRow}
                className="border-gray-700 text-gray-300 hover:bg-[#2a2a2a]"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Row
              </Button>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-300">Service Fee (Optional)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={serviceFee}
                    onChange={(e) => setServiceFee(e.target.value)}
                    className="bg-[#2a2a2a] border-gray-700 text-white"
                  />
                </div>
                <div className="space-y-1 text-sm bg-[#111] border border-gray-800 rounded-md p-3">
                  <p className="text-gray-300">Subtotal: <span className="text-white">N{Math.round(quoteSubtotal).toLocaleString()}</span></p>
                  <p className="text-gray-300">Service Fee: <span className="text-white">N{Math.round(normalizedServiceFee).toLocaleString()}</span></p>
                  <p className="text-[#00C853] font-semibold">Grand Total: N{Math.round(quoteGrandTotal).toLocaleString()}</p>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closeQuoteDialog}
                disabled={isSubmittingQuote}
                className="border-gray-700 text-gray-300 hover:bg-[#2a2a2a]"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={submitQuote}
                disabled={isSubmittingQuote}
                className="bg-[#00C853] hover:bg-[#00C853]/90 text-black font-semibold"
              >
                {isSubmittingQuote ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting Quote...
                  </>
                ) : (
                  'Submit Quote'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Profile Completion Alert */}
        {!profile?.skills?.length && (
          <Alert className="bg-yellow-900/20 border-yellow-800">
            <AlertCircle className="h-4 w-4 text-yellow-400" />
            <AlertDescription className="text-yellow-400 flex items-center justify-between">
              <span>Complete your profile to get more job matches</span>
              <Link to="/dashboard/profile">
                <Button size="sm" className="bg-yellow-600 hover:bg-yellow-700 text-white">
                  Complete Profile
                </Button>
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {/* Quick Stats */}
        <Card className="bg-gradient-to-r from-[#00C853]/20 to-[#00C853]/5 border-[#00C853]/30">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Your Performance</h3>
                <p className="text-gray-400 text-sm">Keep up the great work!</p>
              </div>
              <div className="flex gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">{profile?.total_jobs || 0}</p>
                  <p className="text-xs text-gray-400">Total Jobs</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-[#00C853]">{profile?.rating?.toFixed(1) || 'N/A'}</p>
                  <p className="text-xs text-gray-400">Rating</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">{profile?.years_experience || 0}</p>
                  <p className="text-xs text-gray-400">Years Exp.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}




















