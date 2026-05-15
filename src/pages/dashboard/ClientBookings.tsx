import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useServices } from '@/hooks/useServices';
import { createBooking, ensureSupabaseConfigured, supabase } from '@/lib/supabase';
import { isValidTransition, normalizeBookingStatus } from '@/lib/bookingStatus';
import { updateBooking } from '@/lib/bookingRpc';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Calendar,
  CheckCircle,
  Clock,
  History,
  Home,
  Loader2,
  MessageSquare,
  Plus,
  Briefcase,
  PencilLine,
  XCircle,
} from 'lucide-react';

type UserBooking = {
  id: string;
  service_id: string | null;
  service: string | null;
  customer_email?: string | null;
  date: string | null;
  time: string | null;
  job_type?: 'inspection' | 'fixed' | null;
  quote_status?: 'pending' | 'sent' | 'accepted' | 'rejected' | 'quoted' | 'approved' | null;
  quoted_price?: number | null;
  quote_details?: {
    items?: Array<{
      item_name: string;
      description?: string;
      quantity: number;
      unit_price: number;
      total?: number;
    }>;
    subtotal?: number;
    service_fee?: number;
    grand_total?: number;
  } | null;
  payment_status?: 'pending' | 'paid' | 'failed' | null;
  payment_reference?: string | null;
  status: string;
  created_at: string;
};

const navItems = [
  { label: 'Dashboard', href: '/dashboard/client', icon: Home },
  { label: 'My Jobs', href: '/dashboard/client/jobs', icon: Briefcase },
  { label: 'Bookings', href: '/dashboard/client/bookings', icon: Calendar },
  { label: 'Request Service', href: '/dashboard/client/request', icon: Plus },
  { label: 'Messages', href: '/dashboard/client/messages', icon: MessageSquare },
  { label: 'History', href: '/dashboard/client/history', icon: History },
];

export default function ClientBookings() {
  const { user, profile } = useAuth();
  const { services, isLoading: servicesLoading } = useServices();
  const [serviceId, setServiceId] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [bookingCity, setBookingCity] = useState('Lagos');
  const [bookingDescription, setBookingDescription] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [bookingUrgency, setBookingUrgency] = useState<'low' | 'medium' | 'high' | 'emergency'>('medium');
  const [bookingBudgetType, setBookingBudgetType] = useState<'fixed' | 'hourly' | 'negotiable'>('negotiable');
  const [bookingBudgetAmount, setBookingBudgetAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);
  const [bookings, setBookings] = useState<UserBooking[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingBooking, setEditingBooking] = useState<UserBooking | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editServiceId, setEditServiceId] = useState('');
  const [editBookingDate, setEditBookingDate] = useState('');
  const [editBookingTime, setEditBookingTime] = useState('');
  const [isUpdatingBooking, setIsUpdatingBooking] = useState(false);
  const [activeBookingActionId, setActiveBookingActionId] = useState('');

  const serviceMap = useMemo(() => {
    return new Map(services.map((service) => [service.id, service.name]));
  }, [services]);


  const serviceIdByName = useMemo(() => {
    return new Map(services.map((service) => [service.name, service.id]));
  }, [services]);

  const loadBookings = async () => {
    if (!user) return;
    setIsLoadingBookings(true);
    setError('');
    try {
      ensureSupabaseConfigured();
      const isAdmin = profile?.role === 'admin' || profile?.role === 'support';
      let query = supabase.from('bookings').select('*');
      if (!isAdmin) {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('SYSTEM ERROR:', error instanceof Error ? error.message : String(error));
        throw error;
      }
      setBookings((data as UserBooking[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bookings');
    } finally {
      setIsLoadingBookings(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, [user]);

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

  const getStatusLabel = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  };

  const normalizeQuoteStatus = (value: UserBooking['quote_status']) => {
    const normalized = String(value || '').toLowerCase().trim();
    if (normalized === 'quoted') return 'sent';
    if (normalized === 'approved') return 'accepted';
    if (normalized === 'sent' || normalized === 'accepted' || normalized === 'rejected' || normalized === 'pending') {
      return normalized as 'pending' | 'sent' | 'accepted' | 'rejected';
    }
    return 'pending';
  };

  const canManageBooking = (status: string) => {
    const normalized = normalizeBookingStatus(status);
    return ['pending', 'assigned'].includes(normalized);
  };

  const isBookingPaid = (booking: Pick<UserBooking, 'payment_status'>) => booking.payment_status === 'paid';
  const isInspectionBooking = (booking: Pick<UserBooking, 'job_type'>) => booking.job_type === 'inspection';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!user) {
      setError('You must be logged in to create a booking');
      return;
    }

    if (!serviceId || !bookingDate || !bookingTime) {
      setError('Please select service, date, and time');
      return;
    }

    const serviceName = serviceMap.get(serviceId);
    if (!serviceName) {
      setError('Selected service is invalid');
      return;
    }

    setIsSubmitting(true);

    try {
      const service = serviceName.trim();
      const date = bookingDate.trim();
      const time = bookingTime.trim();
      if (!service || !date || !time) {
        throw new Error('Service, date, and time are required for booking creation.');
      }

      await createBooking({ service, date, time });

      setSuccess('Booking created successfully');
      setServiceId('');
      setBookingDate('');
      setBookingTime('');
      setBookingCity('Lagos');
      setBookingDescription('');
      setPreferredDate('');
      setPreferredTime('');
      setBookingUrgency('medium');
      setBookingBudgetType('negotiable');
      setBookingBudgetAmount('');
      await loadBookings();
    } catch (err) {
      console.error('SYSTEM ERROR:', err instanceof Error ? err.message : String(err));
      setError(err instanceof Error ? err.message : 'Failed to create booking');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditDialog = (booking: UserBooking) => {
    if (!canManageBooking(booking.status)) {
      setError('Only active bookings can be updated');
      return;
    }

    const resolvedServiceId = booking.service_id || (booking.service ? serviceIdByName.get(booking.service) : '');
    if (!resolvedServiceId) {
      setError('Booking service is no longer available for update');
      return;
    }

    setError('');
    setSuccess('');
    setEditingBooking(booking);
    setEditServiceId(resolvedServiceId);
    setEditBookingDate(booking.date || '');
    setEditBookingTime(booking.time || '');
    setIsEditDialogOpen(true);
  };

  const handleUpdateBooking = async () => {
    if (!user || !editingBooking) return;

    setError('');
    setSuccess('');

    if (!editServiceId || !editBookingDate || !editBookingTime) {
      setError('Please select service, date, and time');
      return;
    }

    const serviceName = serviceMap.get(editServiceId);
    if (!serviceName) {
      setError('Selected service is invalid');
      return;
    }


    setIsUpdatingBooking(true);
    try {
      ensureSupabaseConfigured();
      await updateBooking(
        editingBooking.id,
        {
          service_id: editServiceId,
          service: serviceName,
          date: editBookingDate,
          time: editBookingTime,
        },
        false
      );

      setSuccess('Booking updated successfully');
      setIsEditDialogOpen(false);
      setEditingBooking(null);
      setEditServiceId('');
      setEditBookingDate('');
      setEditBookingTime('');
      await loadBookings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update booking');
    } finally {
      setIsUpdatingBooking(false);
    }
  };

  const handleCancelBooking = async (booking: UserBooking) => {
    if (!user) {
      setError('You must be logged in to cancel a booking');
      return;
    }

    if (!canManageBooking(booking.status)) {
      setError('Only active bookings can be cancelled');
      return;
    }

    if (!isValidTransition(normalizeBookingStatus(booking.status), 'cancelled')) {
      setError('Invalid status transition');
      return;
    }

    setError('');
    setSuccess('');
    setActiveBookingActionId(booking.id);

    try {
      ensureSupabaseConfigured();
      await updateBooking(
        booking.id,
        { status: 'cancelled' },
        false
      );

      setSuccess('Booking cancelled successfully');
      await loadBookings();
    } catch (err) {
      console.error('SYSTEM ERROR:', err instanceof Error ? err.message : String(err));
      setError(err instanceof Error ? err.message : 'Failed to cancel booking');
    } finally {
      setActiveBookingActionId('');
    }
  };

  const handlePayNow = async (booking: UserBooking) => {
    if (!user) {
      setError('You must be logged in to complete payment');
      return;
    }

    if (isInspectionBooking(booking) && normalizeQuoteStatus(booking.quote_status) !== 'accepted') {
      setError('Quote must be approved before payment');
      return;
    }

    if (booking.payment_status === 'paid' || isBookingPaid(booking)) {
      setSuccess('Payment already completed');
      return;
    }

    setError('');
    setSuccess('');
    setActiveBookingActionId(booking.id);

    try {
      ensureSupabaseConfigured();

      const { data, error } = await supabase.functions.invoke('paystack-init', {
        body: {
          booking_id: booking.id,
          email: booking.customer_email || user.email || '',
          amount: booking.quoted_price || 0,
          callback_url: `${window.location.origin}/payment-success`,
        },
      });

      if (error) throw error;

      if (!data?.success || !data?.authorization_url) {
        throw new Error(data?.message || 'Failed to initialize payment');
      }

      window.location.assign(data.authorization_url as string);
    } catch (err) {
      console.error('SYSTEM ERROR:', err instanceof Error ? err.message : String(err));
      setError(err instanceof Error ? err.message : 'Failed to initialize payment');
    } finally {
      setActiveBookingActionId('');
    }
  };

  const handleQuoteDecision = async (booking: UserBooking, decision: 'accepted' | 'rejected') => {
    if (!user) {
      setError('You must be logged in to update quote status');
      return;
    }

    const currentQuoteStatus = normalizeQuoteStatus(booking.quote_status);
    if (currentQuoteStatus !== 'sent') {
      setError('This booking does not have a pending quote decision');
      return;
    }

    setError('');
    setSuccess('');
    setActiveBookingActionId(booking.id);

    try {
      ensureSupabaseConfigured();
      const updates =
        decision === 'accepted'
          ? { quote_status: 'accepted', payment_status: 'pending' }
          : {
              quote_status: 'rejected',
              status: 'cancelled',
              payment_status: 'pending',
            };

      if (
        decision === 'rejected' &&
        !isValidTransition(normalizeBookingStatus(booking.status), 'cancelled')
      ) {
        throw new Error('Invalid status transition');
      }

      console.log('Payload:', {
        booking_id: booking.id,
        user_id: user.id,
        decision,
        updates,
      });

      await updateBooking(booking.id, updates as any, false);

      setSuccess(
        decision === 'accepted'
          ? 'Quote approved. You can now proceed to payment.'
          : 'Quote rejected. Booking cancelled.'
      );
      await loadBookings();
    } catch (err) {
      console.error('SYSTEM ERROR:', err instanceof Error ? err.message : String(err));
      setError(err instanceof Error ? err.message : 'Failed to update quote decision');
    } finally {
      setActiveBookingActionId('');
    }
  };

  return (
    <DashboardLayout navItems={navItems} userRole="client">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Book a Service</h1>
          <p className="text-gray-400">Select a service and preferred appointment time.</p>
        </div>

        <Card className="bg-[#1a1a1a] border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">New Booking</CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert className="mb-4 bg-red-900/20 border-red-800">
                <AlertDescription className="text-red-400">{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="mb-4 bg-[#00C853]/10 border-[#00C853]/40">
                <CheckCircle className="h-4 w-4 text-[#00C853]" />
                <AlertDescription className="text-[#00C853]">{success}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Service</Label>
                <Select value={serviceId} onValueChange={setServiceId}>
                  <SelectTrigger className="bg-[#2a2a2a] border-gray-700 text-white">
                    <SelectValue placeholder={servicesLoading ? 'Loading services...' : 'Select a service'} />
                  </SelectTrigger>
                  <SelectContent className="bg-[#2a2a2a] border-gray-700">
                    {services.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="booking-date" className="text-gray-300">Date</Label>
                <Input
                  id="booking-date"
                  type="date"
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="bg-[#2a2a2a] border-gray-700 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="booking-time" className="text-gray-300">Time</Label>
                <Input
                  id="booking-time"
                  type="time"
                  value={bookingTime}
                  onChange={(e) => setBookingTime(e.target.value)}
                  className="bg-[#2a2a2a] border-gray-700 text-white"
                />
              </div>

              <div className="space-y-2 md:col-span-3">
                <Label htmlFor="booking-description" className="text-gray-300">Description (Optional)</Label>
                <Textarea
                  id="booking-description"
                  value={bookingDescription}
                  onChange={(e) => setBookingDescription(e.target.value)}
                  placeholder="Add extra details for this booking"
                  className="bg-[#2a2a2a] border-gray-700 text-white placeholder:text-gray-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="booking-city" className="text-gray-300">City (Optional)</Label>
                <Input
                  id="booking-city"
                  type="text"
                  value={bookingCity}
                  onChange={(e) => setBookingCity(e.target.value)}
                  placeholder="Lagos"
                  className="bg-[#2a2a2a] border-gray-700 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="preferred-date" className="text-gray-300">Preferred Date (Optional)</Label>
                <Input
                  id="preferred-date"
                  type="date"
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                  className="bg-[#2a2a2a] border-gray-700 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="preferred-time" className="text-gray-300">Preferred Time (Optional)</Label>
                <Input
                  id="preferred-time"
                  type="time"
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                  className="bg-[#2a2a2a] border-gray-700 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Urgency (Optional)</Label>
                <Select
                  value={bookingUrgency}
                  onValueChange={(value) => setBookingUrgency(value as 'low' | 'medium' | 'high' | 'emergency')}
                >
                  <SelectTrigger className="bg-[#2a2a2a] border-gray-700 text-white">
                    <SelectValue placeholder="Select urgency" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#2a2a2a] border-gray-700">
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Budget Type (Optional)</Label>
                <Select
                  value={bookingBudgetType}
                  onValueChange={(value) => setBookingBudgetType(value as 'fixed' | 'hourly' | 'negotiable')}
                >
                  <SelectTrigger className="bg-[#2a2a2a] border-gray-700 text-white">
                    <SelectValue placeholder="Select budget type" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#2a2a2a] border-gray-700">
                    <SelectItem value="fixed">Fixed</SelectItem>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="negotiable">Negotiable</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="budget-amount" className="text-gray-300">Budget Amount (Optional)</Label>
                <Input
                  id="budget-amount"
                  type="number"
                  min="0"
                  value={bookingBudgetAmount}
                  onChange={(e) => setBookingBudgetAmount(e.target.value)}
                  placeholder="50000"
                  className="bg-[#2a2a2a] border-gray-700 text-white"
                  disabled={bookingBudgetType === 'negotiable'}
                />
              </div>

              <div className="md:col-span-3">
                <Button type="submit" disabled={isSubmitting || servicesLoading} className="bg-[#00C853] hover:bg-[#00C853]/90 text-black font-semibold">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Booking...
                    </>
                  ) : (
                    'Create Booking'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a1a] border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">My Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingBookings ? (
              <div className="text-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-[#00C853] mx-auto" />
              </div>
            ) : bookings.length === 0 ? (
              <p className="text-gray-400">No bookings yet.</p>
            ) : (
              <div className="space-y-3">
                {bookings.map((booking) => {
                  const isPaid = isBookingPaid(booking);
                  const paymentStatus = booking.payment_status || 'pending';
                  const isInspection = isInspectionBooking(booking);
                  const quoteStatus = isInspection ? normalizeQuoteStatus(booking.quote_status) : 'accepted';
                  const canPayNow = !isPaid && (!isInspection || quoteStatus === 'accepted');
                  const quoteItems = Array.isArray(booking.quote_details?.items) ? booking.quote_details.items : [];
                  const quoteServiceFee =
                    typeof booking.quote_details?.service_fee === 'number' ? booking.quote_details.service_fee : 0;
                  const quoteGrandTotal =
                    typeof booking.quote_details?.grand_total === 'number'
                      ? booking.quote_details.grand_total
                      : (typeof booking.quoted_price === 'number' ? booking.quoted_price : 0);

                  return (
                  <div
                    key={booking.id}
                    className={`p-4 rounded-lg border bg-[#111] flex flex-col md:flex-row md:items-center md:justify-between gap-3 ${
                      isPaid ? 'border-gray-800' : 'border-yellow-700/60'
                    }`}
                  >
                    <div>
                      <p className="text-white font-medium">{booking.service || 'Service'}</p>
                      <div className="text-sm text-gray-400 flex items-center gap-4 mt-1">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {booking.date || '-'}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {booking.time || '-'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className={isInspection ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-gray-500/20 text-gray-300 border-gray-500/30'}>
                          {isInspection ? 'Inspection' : 'Fixed'}
                        </Badge>
                        <Badge className={quoteStatus === 'accepted' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-purple-500/20 text-purple-400 border-purple-500/30'}>
                          Quote: {getStatusLabel(quoteStatus)}
                        </Badge>
                      </div>
                      {isInspection && quoteStatus === 'sent' && (
                        <div className="mt-3 rounded-md border border-gray-800 bg-[#161616] p-3">
                          <p className="text-xs text-gray-400 mb-2">Submitted Quotation</p>
                          {quoteItems.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="min-w-full text-xs">
                                <thead>
                                  <tr className="text-gray-500">
                                    <th className="text-left py-1 pr-3">Item</th>
                                    <th className="text-left py-1 pr-3">Qty</th>
                                    <th className="text-left py-1 pr-3">Unit</th>
                                    <th className="text-left py-1">Total</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {quoteItems.map((item, index) => {
                                    const rowTotal =
                                      typeof item.total === 'number'
                                        ? item.total
                                        : Number(item.quantity || 0) * Number(item.unit_price || 0);
                                    return (
                                      <tr key={`${booking.id}-quote-item-${index}`} className="text-gray-300 border-t border-gray-800">
                                        <td className="py-1 pr-3">
                                          {item.item_name}
                                          {item.description ? <span className="text-gray-500"> - {item.description}</span> : null}
                                        </td>
                                        <td className="py-1 pr-3">{item.quantity}</td>
                                        <td className="py-1 pr-3">N{Number(item.unit_price || 0).toLocaleString()}</td>
                                        <td className="py-1">N{Number(rowTotal || 0).toLocaleString()}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <p className="text-xs text-gray-400">Itemized details unavailable.</p>
                          )}
                          <div className="text-xs text-gray-300 mt-2 space-y-1">
                            <p>Service Fee: <span className="text-white">N{Math.round(quoteServiceFee).toLocaleString()}</span></p>
                            <p className="text-[#00C853] font-semibold">
                              Grand Total: N{Math.round(quoteGrandTotal).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      )}
                      {!isPaid && canPayNow && <p className="text-xs text-yellow-400 mt-2">Awaiting payment</p>}
                      {!isPaid && isInspection && quoteStatus !== 'accepted' && (
                        <p className="text-xs text-blue-400 mt-2">Waiting for technician quote approval before payment</p>
                      )}
                      {paymentStatus === 'failed' && (
                        <p className="text-xs text-red-400 mt-2">Previous payment attempt failed. Try again.</p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
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
                      <Badge className={getStatusColor(booking.status)}>{getStatusLabel(booking.status)}</Badge>
                      {isInspection && quoteStatus === 'sent' && (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleQuoteDecision(booking, 'accepted')}
                            className="bg-[#00C853] hover:bg-[#00C853]/90 text-black font-semibold"
                            disabled={activeBookingActionId === booking.id}
                          >
                            {activeBookingActionId === booking.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Accept'}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleQuoteDecision(booking, 'rejected')}
                            className="border-red-800 text-red-400 hover:bg-red-900/20 hover:text-red-300"
                            disabled={activeBookingActionId === booking.id}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                      {canPayNow && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handlePayNow(booking)}
                          className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
                          disabled={activeBookingActionId === booking.id}
                        >
                          {activeBookingActionId === booking.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Pay Now'
                          )}
                        </Button>
                      )}
                      {canManageBooking(booking.status) && (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(booking)}
                            className="border-gray-700 text-gray-300 hover:bg-[#2a2a2a] hover:text-white"
                            disabled={activeBookingActionId === booking.id}
                          >
                            <PencilLine className="h-4 w-4 mr-1" />
                            Update
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleCancelBooking(booking)}
                            className="border-red-800 text-red-400 hover:bg-red-900/20 hover:text-red-300"
                            disabled={activeBookingActionId === booking.id}
                          >
                            {activeBookingActionId === booking.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <XCircle className="h-4 w-4 mr-1" />
                                Cancel
                              </>
                            )}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                )})}
              </div>
            )}
            <div className="mt-4">
              <Link to="/dashboard/client/request" className="text-[#00C853] text-sm hover:underline">
                Need a full request instead? Go to Request Service
              </Link>
            </div>
          </CardContent>
        </Card>

        <Dialog
          open={isEditDialogOpen}
          onOpenChange={(open) => {
            setIsEditDialogOpen(open);
            if (!open) {
              setEditingBooking(null);
            }
          }}
        >
          <DialogContent className="bg-[#1a1a1a] border-gray-800 text-white">
            <DialogHeader>
              <DialogTitle>Update Booking</DialogTitle>
              <DialogDescription className="text-gray-400">
                Update your service, date, or time for this booking.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className="text-gray-300">Service</Label>
                <Select value={editServiceId} onValueChange={setEditServiceId}>
                  <SelectTrigger className="bg-[#2a2a2a] border-gray-700 text-white">
                    <SelectValue placeholder={servicesLoading ? 'Loading services...' : 'Select a service'} />
                  </SelectTrigger>
                  <SelectContent className="bg-[#2a2a2a] border-gray-700">
                    {services.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-booking-date" className="text-gray-300">Date</Label>
                <Input
                  id="edit-booking-date"
                  type="date"
                  value={editBookingDate}
                  onChange={(e) => setEditBookingDate(e.target.value)}
                  className="bg-[#2a2a2a] border-gray-700 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-booking-time" className="text-gray-300">Time</Label>
                <Input
                  id="edit-booking-time"
                  type="time"
                  value={editBookingTime}
                  onChange={(e) => setEditBookingTime(e.target.value)}
                  className="bg-[#2a2a2a] border-gray-700 text-white"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                className="border-gray-700 text-gray-300 hover:bg-[#2a2a2a]"
              >
                Close
              </Button>
              <Button
                type="button"
                onClick={handleUpdateBooking}
                disabled={isUpdatingBooking || servicesLoading}
                className="bg-[#00C853] hover:bg-[#00C853]/90 text-black font-semibold"
              >
                {isUpdatingBooking ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}




