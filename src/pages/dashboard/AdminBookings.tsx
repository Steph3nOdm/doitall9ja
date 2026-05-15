import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { ensureSupabaseConfigured, supabase } from '@/lib/supabase';
import { BOOKING_STATUSES, isValidTransition, normalizeBookingStatus } from '@/lib/bookingStatus';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  LayoutDashboard,
  Briefcase,
  Users,
  MessageSquare,
  Settings,
  ClipboardList,
  Calendar,
  Clock,
  Loader2,
  RefreshCw,
  Save,
  UserCheck,
} from 'lucide-react';

type BookingStatus = (typeof BOOKING_STATUSES)[number];
type QuoteStatus = 'pending' | 'sent' | 'accepted' | 'rejected';
type LegacyQuoteStatus = QuoteStatus | 'quoted' | 'approved' | null | undefined;

type AdminBooking = {
  id: string;
  service: string | null;
  service_name: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  address: string;
  city: string;
  status: string;
  quote_status: LegacyQuoteStatus;
  payment_status: string | null;
  quoted_price: number | null;
  date: string | null;
  time: string | null;
  preferred_date: string | null;
  preferred_time: string | null;
  technician_id: string | null;
  job_type: 'inspection' | 'fixed' | null;
  created_at: string;
};

type TechnicianProfile = {
  id: string;
  full_name: string;
  email?: string;
  skills: string[] | null;
};

type TechnicianProfileFallback = {
  id: string;
  full_name: string;
  email?: string;
};

type BookingDraft = {
  status: BookingStatus;
  technician_id: string;
};

const navItems = [
  { label: 'Dashboard', href: '/dashboard/admin', icon: LayoutDashboard },
  { label: 'All Jobs', href: '/dashboard/admin/jobs', icon: Briefcase },
  { label: 'Bookings', href: '/dashboard/admin/bookings', icon: ClipboardList },
  { label: 'Technicians', href: '/dashboard/admin/technicians', icon: Users },
  { label: 'Support Chat', href: '/dashboard/admin/support', icon: MessageSquare },
  { label: 'Settings', href: '/dashboard/admin/settings', icon: Settings },
];

const serviceKeywordMap: Record<string, string[]> = {
  electrical: ['electrical', 'electrician', 'wiring', 'power', 'light'],
  plumbing: ['plumbing', 'plumber', 'pipe', 'leak', 'drain', 'water'],
  carpentry: ['carpentry', 'carpenter', 'wood', 'furniture'],
  painting: ['painting', 'painter', 'paint', 'wall'],
  ac: ['ac', 'air conditioner', 'hvac', 'cooling'],
  appliance: ['appliance', 'refrigerator', 'fridge', 'washing machine', 'oven', 'microwave'],
};

const isValidUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim());

const normalizeQuoteStatus = (value: LegacyQuoteStatus): QuoteStatus => {
  const normalized = String(value || '').toLowerCase().trim();
  if (normalized === 'quoted') return 'sent';
  if (normalized === 'approved') return 'accepted';
  if (normalized === 'sent' || normalized === 'accepted' || normalized === 'rejected' || normalized === 'pending') {
    return normalized as QuoteStatus;
  }
  return 'pending';
};

const isValidQuoteTransition = (current: QuoteStatus, next: QuoteStatus) => {
  const rules: Record<QuoteStatus, QuoteStatus[]> = {
    pending: ['sent', 'rejected'],
    sent: ['accepted', 'rejected'],
    accepted: [],
    rejected: [],
  };

  if (current === next) return true;
  return rules[current]?.includes(next) || false;
};

const getStatusLabel = (status: string) =>
  status.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

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

const getQuoteColor = (status: QuoteStatus) => {
  switch (status) {
    case 'pending':
      return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    case 'sent':
      return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    case 'accepted':
      return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'rejected':
      return 'bg-red-500/20 text-red-400 border-red-500/30';
    default:
      return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }
};

const getPaymentColor = (status: string | null) => {
  if (status === 'paid') return 'bg-green-500/20 text-green-400 border-green-500/30';
  if (status === 'failed') return 'bg-red-500/20 text-red-400 border-red-500/30';
  return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
};

const errorMentionsColumn = (err: unknown, column: string) => {
  if (!err || typeof err !== 'object') return false;
  const message = String((err as { message?: unknown }).message || '').toLowerCase();
  const details = String((err as { details?: unknown }).details || '').toLowerCase();
  const hint = String((err as { hint?: unknown }).hint || '').toLowerCase();
  const code = String((err as { code?: unknown }).code || '').toUpperCase();
  const needle = column.toLowerCase();

  return (
    code === 'PGRST204' ||
    code === '42703' ||
    message.includes(needle) ||
    details.includes(needle) ||
    hint.includes(needle)
  );
};

export default function AdminBookings() {
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [technicians, setTechnicians] = useState<TechnicianProfile[]>([]);
  const [drafts, setDrafts] = useState<Record<string, BookingDraft>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingBookingId, setIsSavingBookingId] = useState('');
  const [isQuoteActionBookingId, setIsQuoteActionBookingId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [quoteFilter, setQuoteFilter] = useState<'all' | QuoteStatus>('all');

  const technicianMap = useMemo(() => new Map(technicians.map((tech) => [tech.id, tech])), [technicians]);

  const quoteBookings = useMemo(() => {
    return bookings.filter((booking) => {
      const quoteStatus = normalizeQuoteStatus(booking.quote_status);
      if (quoteFilter === 'all') return quoteStatus !== 'pending';
      return quoteStatus === quoteFilter;
    });
  }, [bookings, quoteFilter]);

  const isBookingPaid = (booking: Pick<AdminBooking, 'payment_status'>) => booking.payment_status === 'paid';
  const isInspectionBooking = (booking: Pick<AdminBooking, 'job_type'>) => booking.job_type !== 'fixed';
  const canAssignBeforePayment = (booking: Pick<AdminBooking, 'job_type' | 'quote_status'>) =>
    isInspectionBooking(booking) && normalizeQuoteStatus(booking.quote_status) === 'pending';

  const getServiceKeywords = (booking: AdminBooking) => {
    const serviceLabel = `${booking.service || ''} ${booking.service_name || ''}`.toLowerCase().trim();
    const tokens = serviceLabel.split(/[^a-z0-9]+/).filter((token) => token.length > 2);
    const keywords = new Set<string>(tokens);

    if (serviceLabel) keywords.add(serviceLabel);

    Object.entries(serviceKeywordMap).forEach(([category, related]) => {
      if (serviceLabel.includes(category) || related.some((keyword) => serviceLabel.includes(keyword))) {
        keywords.add(category);
        related.forEach((keyword) => keywords.add(keyword));
      }
    });

    return [...keywords];
  };

  const getTechnicianOptions = (booking: AdminBooking) => {
    const keywords = getServiceKeywords(booking);
    if (keywords.length === 0) {
      return { options: technicians, usedFallback: true };
    }

    const matched = technicians.filter((tech) => {
      const normalizedSkills = (tech.skills || []).map((skill) => skill.toLowerCase().trim()).filter(Boolean);
      if (normalizedSkills.length === 0) return false;
      return keywords.some((keyword) =>
        normalizedSkills.some((skill) => skill.includes(keyword) || keyword.includes(skill))
      );
    });

    if (matched.length === 0) {
      return { options: technicians, usedFallback: true };
    }

    if (booking.technician_id) {
      const assigned = technicianMap.get(booking.technician_id);
      if (assigned && !matched.some((tech) => tech.id === assigned.id)) {
        return { options: [assigned, ...matched], usedFallback: false };
      }
    }

    return { options: matched, usedFallback: false };
  };

  const loadData = async () => {
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      ensureSupabaseConfigured();

      const bookingsResponse = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false });

      if (bookingsResponse.error) {
        console.error('SYSTEM ERROR:', bookingsResponse.error.message);
        throw bookingsResponse.error;
      }

      const bookingRows = (bookingsResponse.data as AdminBooking[]) || [];
      console.log('Admin Quotes:', bookingRows.filter((booking) => normalizeQuoteStatus(booking.quote_status) !== 'pending'));
      let technicianRows: TechnicianProfile[] = [];

      const techniciansResponse = await supabase
        .from('profiles')
        .select('id, full_name, email, skills')
        .eq('role', 'technician')
        .order('full_name', { ascending: true });

      if (techniciansResponse.error) {
        if (errorMentionsColumn(techniciansResponse.error, 'skills')) {
          const fallbackTechniciansResponse = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .eq('role', 'technician')
            .order('full_name', { ascending: true });

          if (fallbackTechniciansResponse.error) throw fallbackTechniciansResponse.error;

          technicianRows = ((fallbackTechniciansResponse.data as TechnicianProfileFallback[]) || []).map((row) => ({
            ...row,
            skills: null,
          }));
          setError('Technician skills are unavailable until the skills column migration is applied.');
        } else {
          throw techniciansResponse.error;
        }
      } else {
        technicianRows = (techniciansResponse.data as TechnicianProfile[]) || [];
      }

      const initialDrafts: Record<string, BookingDraft> = {};
      bookingRows.forEach((booking) => {
        initialDrafts[booking.id] = {
          status: normalizeBookingStatus(booking.status),
          technician_id: booking.technician_id || 'unassigned',
        };
      });

      setBookings(bookingRows);
      setTechnicians(technicianRows);
      setDrafts(initialDrafts);
    } catch (err) {
      console.error('SYSTEM ERROR:', err instanceof Error ? err.message : String(err));
      setError(err instanceof Error ? err.message : 'Failed to load bookings');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const hasChanges = (booking: AdminBooking) => {
    const draft = drafts[booking.id];
    if (!draft) return false;
    const currentStatus = normalizeBookingStatus(booking.status);
    const currentTechnician = booking.technician_id || 'unassigned';
    return draft.status !== currentStatus || draft.technician_id !== currentTechnician;
  };

  const handleDraftChange = (bookingId: string, field: keyof BookingDraft, value: string) => {
    setDrafts((prev) => {
      const booking = bookings.find((item) => item.id === bookingId);
      if (!booking) return prev;

      const isPaid = isBookingPaid(booking);
      const canAssignWithoutPayment = canAssignBeforePayment(booking);

      if (field === 'technician_id' && value !== 'unassigned') {
        if (!isValidUuid(value)) {
          console.error('BLOCKED INVALID TECHNICIAN ID:', value);
          setError('Invalid technician selected');
          setSuccess('');
          return prev;
        }

        if (!technicians.some((tech) => tech.id === value)) {
          setError('Invalid technician selected');
          setSuccess('');
          return prev;
        }

        if (booking.technician_id && booking.technician_id !== value) {
          setError('Job already assigned');
          setSuccess('');
          return prev;
        }

        if (!isPaid && !canAssignWithoutPayment) {
          setError('Cannot assign technician until payment is completed');
          setSuccess('');
          return prev;
        }
      }

      if (field === 'status') {
        const nextStatus = value as BookingStatus;
        const currentStatus = normalizeBookingStatus(booking.status);

        if (!isValidTransition(currentStatus, nextStatus)) {
          setError('Invalid status transition');
          setSuccess('');
          return prev;
        }

        if (nextStatus === 'in_progress' && !isPaid) {
          setError('Payment required before work');
          setSuccess('');
          return prev;
        }

        const selectedTech = prev[bookingId]?.technician_id || booking.technician_id || 'unassigned';
        if (nextStatus === 'assigned' && selectedTech === 'unassigned') {
          setError('Select a technician before assigning');
          setSuccess('');
          return prev;
        }
      }

      const current = prev[bookingId] || {
        status: normalizeBookingStatus(booking.status),
        technician_id: booking.technician_id || 'unassigned',
      };

      const next: BookingDraft = {
        ...current,
        [field]: value,
      } as BookingDraft;

      if (field === 'technician_id' && value !== 'unassigned') {
        next.status = 'assigned';
      }

      return {
        ...prev,
        [bookingId]: next,
      };
    });
  };

  const resolveDraftTechnicianId = (booking: AdminBooking, technicianId?: string) => {
    const rawValue = technicianId ?? drafts[booking.id]?.technician_id;
    if (!rawValue || rawValue === 'unassigned') return null;
    return rawValue;
  };

  const handleAssign = async (booking: AdminBooking, technicianId?: string) => {
    const selectedTechnicianId = resolveDraftTechnicianId(booking, technicianId);

    if (!selectedTechnicianId) {
      setError('No technician selected');
      setSuccess('');
      return;
    }

    if (!isValidUuid(selectedTechnicianId)) {
      console.error('BLOCKED INVALID TECHNICIAN ID:', selectedTechnicianId);
      setError('Invalid technician selected');
      setSuccess('');
      return;
    }

    if (!technicians.some((tech) => tech.id === selectedTechnicianId)) {
      setError('Invalid technician selected');
      setSuccess('');
      return;
    }

    if (booking.technician_id !== null) {
      setError('Job already taken');
      setSuccess('');
      return;
    }

    if (!isValidTransition(normalizeBookingStatus(booking.status), 'assigned')) {
      setError('Invalid status transition');
      setSuccess('');
      return;
    }

    const isPaid = isBookingPaid(booking);
    const canAssignWithoutPayment = canAssignBeforePayment(booking);

    if (!isPaid && !canAssignWithoutPayment) {
      setError('Cannot assign technician until payment is completed');
      setSuccess('');
      return;
    }

    setIsSavingBookingId(booking.id);
    setError('');
    setSuccess('');

    try {
      ensureSupabaseConfigured();

      console.log('ASSIGN DEBUG:', {
        bookingId: booking.id,
        technicianId: selectedTechnicianId,
        length: selectedTechnicianId?.length,
      });

      const { data, error } = await supabase
        .from('bookings')
        .update({
          technician_id: selectedTechnicianId,
          status: 'assigned',
        })
        .eq('id', booking.id)
        .is('technician_id', null)
        .select('id, technician_id, status');

      console.log('ASSIGN RESULT:', data, error);

      if (error) {
        console.error('SYSTEM ERROR:', error.message);
        throw error;
      }

      if (!data || data.length === 0) {
        setError('Job already taken');
        setSuccess('');
        return;
      }

      setSuccess('Job assigned successfully');
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('SYSTEM ERROR:', message);
      setError(message || 'Failed to assign job');
    } finally {
      setIsSavingBookingId('');
    }
  };

  const saveBooking = async (booking: AdminBooking) => {
    const draft = drafts[booking.id];
    if (!draft || !hasChanges(booking)) return;

    const selectedTechnicianId = draft.technician_id === 'unassigned' ? null : draft.technician_id;
    const currentStatus = normalizeBookingStatus(booking.status);
    const nextStatus = draft.status;
    const currentTechnicianId = booking.technician_id;
    const isPaid = isBookingPaid(booking);

    if (selectedTechnicianId && !isValidUuid(selectedTechnicianId)) {
      console.error('BLOCKED INVALID TECHNICIAN ID:', selectedTechnicianId);
      setError('Invalid technician selected');
      setSuccess('');
      return;
    }

    if (selectedTechnicianId && !technicians.some((tech) => tech.id === selectedTechnicianId)) {
      setError('Invalid technician selected');
      setSuccess('');
      return;
    }

    if (!currentTechnicianId && selectedTechnicianId) {
      await handleAssign(booking, selectedTechnicianId);
      return;
    }

    if (currentTechnicianId && selectedTechnicianId && currentTechnicianId !== selectedTechnicianId) {
      setError('Job already assigned');
      setSuccess('');
      return;
    }

    if (nextStatus === 'assigned' && !(currentTechnicianId || selectedTechnicianId)) {
      setError('Select a technician before assigning');
      setSuccess('');
      return;
    }

    if (nextStatus === 'in_progress' && !isPaid) {
      setError('Payment required before work');
      setSuccess('');
      return;
    }

    if (!isValidTransition(currentStatus, nextStatus)) {
      setError('Invalid status transition');
      setSuccess('');
      return;
    }

    setIsSavingBookingId(booking.id);
    setError('');
    setSuccess('');

    try {
      ensureSupabaseConfigured();
      const { error } = await supabase
        .from('bookings')
        .update({ status: nextStatus })
        .eq('id', booking.id);

      if (error) throw error;

      setBookings((prev) =>
        prev.map((item) =>
          item.id === booking.id
            ? {
                ...item,
                status: nextStatus,
              }
            : item
        )
      );

      setDrafts((prev) => ({
        ...prev,
        [booking.id]: {
          status: nextStatus,
          technician_id: currentTechnicianId || 'unassigned',
        },
      }));

      setSuccess(`Booking ${booking.id.slice(0, 8)} updated successfully`);
    } catch (err) {
      console.error('SYSTEM ERROR:', err instanceof Error ? err.message : String(err));
      setError(err instanceof Error ? err.message : 'Failed to update booking');
    } finally {
      setIsSavingBookingId('');
    }
  };

  const handleQuoteAction = async (booking: AdminBooking, nextQuoteStatus: QuoteStatus) => {
    const currentQuoteStatus = normalizeQuoteStatus(booking.quote_status);
    if (!isValidQuoteTransition(currentQuoteStatus, nextQuoteStatus)) {
      setError('Invalid quote transition');
      setSuccess('');
      return;
    }

    setError('');
    setSuccess('');
    setIsQuoteActionBookingId(booking.id);

    try {
      ensureSupabaseConfigured();
      const { error } = await supabase
        .from('bookings')
        .update({ quote_status: nextQuoteStatus })
        .eq('id', booking.id);

      if (error) {
        console.error('SYSTEM ERROR:', error.message);
        throw error;
      }

      setBookings((prev) =>
        prev.map((item) =>
          item.id === booking.id
            ? {
                ...item,
                quote_status: nextQuoteStatus,
              }
            : item
        )
      );

      setSuccess(`Quote ${nextQuoteStatus} successfully`);
    } catch (err) {
      console.error('SYSTEM ERROR:', err instanceof Error ? err.message : String(err));
      setError(err instanceof Error ? err.message : 'Failed to update quote');
    } finally {
      setIsQuoteActionBookingId('');
    }
  };

  return (
    <DashboardLayout navItems={navItems} userRole="admin">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Booking Management</h1>
            <p className="text-gray-400">View all bookings, update status, and manage quotes.</p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={loadData}
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

        {success && (
          <Alert className="bg-[#00C853]/10 border-[#00C853]/40">
            <AlertDescription className="text-[#00C853]">{success}</AlertDescription>
          </Alert>
        )}

        <Card className="bg-[#1a1a1a] border-gray-800">
          <CardHeader className="space-y-3">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <CardTitle className="text-white">Submitted Quotes</CardTitle>
              <Select value={quoteFilter} onValueChange={(value) => setQuoteFilter(value as 'all' | QuoteStatus)}>
                <SelectTrigger className="w-full md:w-56 bg-[#2a2a2a] border-gray-700 text-white">
                  <SelectValue placeholder="Filter quotes" />
                </SelectTrigger>
                <SelectContent className="bg-[#2a2a2a] border-gray-700">
                  <SelectItem value="all">All Quotes</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-[#00C853] mx-auto" />
              </div>
            ) : quoteBookings.length === 0 ? (
              <p className="text-gray-400">No quotes available for this filter.</p>
            ) : (
              <div className="space-y-3">
                {quoteBookings.map((booking) => {
                  const technician = booking.technician_id ? technicianMap.get(booking.technician_id) : null;
                  const serviceLabel = booking.service || booking.service_name || 'Service';
                  const quoteAmount = typeof booking.quoted_price === 'number' ? `N${booking.quoted_price.toLocaleString()}` : 'Not set';
                  const quoteStatus = normalizeQuoteStatus(booking.quote_status);

                  return (
                    <div key={`quote-${booking.id}`} className="rounded-lg border border-gray-800 bg-[#111] p-4 space-y-2">
                      <p className="text-white font-semibold">{serviceLabel}</p>
                      <p className="text-sm text-gray-400">Client: {booking.customer_name}</p>
                      <p className="text-sm text-gray-400">Technician: {technician?.full_name || 'Unassigned'}</p>
                      <div className="flex items-center gap-2">
                        <Badge className={getQuoteColor(quoteStatus)}>Quote: {getStatusLabel(quoteStatus)}</Badge>
                        <span className="text-sm text-[#00C853]">{quoteAmount}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a1a] border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">All Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-[#00C853] mx-auto" />
              </div>
            ) : bookings.length === 0 ? (
              <p className="text-gray-400">No bookings available.</p>
            ) : (
              <div className="space-y-4">
                {bookings.map((booking) => {
                  const draft = drafts[booking.id];
                  const assignedTech = booking.technician_id ? technicianMap.get(booking.technician_id) : null;
                  const technicianOptionsInfo = getTechnicianOptions(booking);
                  const technicianOptions = technicianOptionsInfo.options;
                  const displayDate = booking.date || booking.preferred_date || '-';
                  const displayTime = booking.time || booking.preferred_time || '-';
                  const isInspection = isInspectionBooking(booking);
                  const isPaid = isBookingPaid(booking);
                  const canAssignWithoutPayment = canAssignBeforePayment(booking);
                  const paymentStatus = booking.payment_status || 'pending';
                  const quoteStatus = normalizeQuoteStatus(booking.quote_status);
                  const currentStatus = normalizeBookingStatus(booking.status);
                  const selectedStatus = draft?.status || currentStatus;
                  const selectedTechnicianId = draft?.technician_id || booking.technician_id || 'unassigned';
                  const hasPaidAccess = isPaid;
                  const isSaving = isSavingBookingId === booking.id;
                  const isQuoteSaving = isQuoteActionBookingId === booking.id;

                  return (
                    <div key={booking.id} className="rounded-lg border border-gray-800 bg-[#111] p-4 space-y-4">
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                        <div>
                          <p className="text-white font-semibold">{booking.service || booking.service_name || 'Service'}</p>
                          <p className="text-sm text-gray-400 mt-1">
                            {hasPaidAccess ? `${booking.customer_name} - ${booking.customer_email}` : booking.customer_name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {hasPaidAccess ? booking.customer_phone : 'Contact available after payment'}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">{booking.address}, {booking.city}</p>
                          <p className="text-xs text-gray-500 mt-1">Type: {isInspection ? 'Inspection' : 'Fixed'}</p>
                          {typeof booking.quoted_price === 'number' && (
                            <p className="text-xs text-[#00C853] mt-1">Quoted Price: N{booking.quoted_price.toLocaleString()}</p>
                          )}
                          <div className="text-sm text-gray-400 flex items-center gap-4 mt-2">
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {displayDate}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {displayTime}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 mt-2">
                            Created: {new Date(booking.created_at).toLocaleString()}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className={getStatusColor(currentStatus)}>{getStatusLabel(currentStatus)}</Badge>
                          <Badge className={getQuoteColor(quoteStatus)}>{getStatusLabel(quoteStatus)}</Badge>
                          <Badge className={getPaymentColor(paymentStatus)}>
                            {paymentStatus === 'paid'
                              ? 'Payment Completed'
                              : paymentStatus === 'failed'
                                ? 'Payment Failed'
                                : 'Awaiting Payment'}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-2">
                          <p className="text-xs text-gray-400">Booking Status</p>
                          <Select
                            value={selectedStatus}
                            onValueChange={(value) => handleDraftChange(booking.id, 'status', value as BookingStatus)}
                          >
                            <SelectTrigger className="bg-[#2a2a2a] border-gray-700 text-white">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#2a2a2a] border-gray-700">
                              {BOOKING_STATUSES.map((status) => {
                                const invalidTransition = !isValidTransition(currentStatus, status);
                                const paymentBlocked = status === 'in_progress' && !isPaid;
                                const assignmentMissingTech = status === 'assigned' && selectedTechnicianId === 'unassigned';

                                return (
                                  <SelectItem
                                    key={status}
                                    value={status}
                                    disabled={invalidTransition || paymentBlocked || assignmentMissingTech}
                                  >
                                    {getStatusLabel(status)}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <p className="text-xs text-gray-400">Assign Technician</p>
                          <Select
                            value={selectedTechnicianId}
                            onValueChange={(value) => handleDraftChange(booking.id, 'technician_id', value)}
                          >
                            <SelectTrigger
                              className="bg-[#2a2a2a] border-gray-700 text-white"
                              disabled={Boolean(booking.technician_id) || (!isPaid && !canAssignWithoutPayment)}
                            >
                              <SelectValue placeholder="Select technician" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#2a2a2a] border-gray-700">
                              <SelectItem value="unassigned">Unassigned</SelectItem>
                              {technicianOptions.map((tech) => (
                                <SelectItem key={tech.id} value={tech.id}>
                                  {tech.full_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <p className="text-xs text-gray-500 inline-flex items-center gap-1">
                            <UserCheck className="h-3 w-3" />
                            {assignedTech ? `Current: ${assignedTech.full_name}` : 'No technician assigned'}
                          </p>
                          {!isPaid && !isInspection && (
                            <p className="text-xs text-yellow-400">Cannot assign technician until payment is completed</p>
                          )}
                          {booking.technician_id && <p className="text-xs text-blue-400">Job already assigned</p>}
                          {!isPaid && isInspection && canAssignWithoutPayment && (
                            <p className="text-xs text-blue-400">Inspection assignment allowed before quote submission</p>
                          )}
                          {!isPaid && isInspection && !canAssignWithoutPayment && (
                            <p className="text-xs text-yellow-400">Cannot assign technician until payment is completed</p>
                          )}
                          <p className="text-xs text-gray-500">
                            {technicianOptionsInfo.usedFallback
                              ? 'No direct skill match found. Showing all technicians.'
                              : 'Showing technicians with matching skills.'}
                          </p>
                        </div>

                        <div className="md:self-end">
                          <Button
                            type="button"
                            onClick={() => handleAssign(booking)}
                            disabled={
                              isSaving ||
                              selectedTechnicianId === 'unassigned' ||
                              Boolean(booking.technician_id) ||
                              (!isPaid && !canAssignWithoutPayment)
                            }
                            className="w-full mb-2 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                          >
                            {booking.technician_id ? 'Assigned' : 'Assign'}
                          </Button>
                          <Button
                            type="button"
                            onClick={() => saveBooking(booking)}
                            disabled={isSaving || !hasChanges(booking)}
                            className="w-full bg-[#00C853] hover:bg-[#00C853]/90 text-black font-semibold"
                          >
                            {isSaving ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="mr-2 h-4 w-4" />
                                Save Changes
                              </>
                            )}
                          </Button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleQuoteAction(booking, 'sent')}
                          disabled={isQuoteSaving || quoteStatus !== 'pending'}
                          className="border-purple-700 text-purple-300 hover:bg-purple-900/20"
                        >
                          Send Quote
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleQuoteAction(booking, 'accepted')}
                          disabled={isQuoteSaving || quoteStatus !== 'sent'}
                          className="border-green-700 text-green-300 hover:bg-green-900/20"
                        >
                          Accept Quote
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleQuoteAction(booking, 'rejected')}
                          disabled={isQuoteSaving || !['pending', 'sent'].includes(quoteStatus)}
                          className="border-red-700 text-red-300 hover:bg-red-900/20"
                        >
                          Reject Quote
                        </Button>
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
