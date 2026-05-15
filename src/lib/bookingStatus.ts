export const BOOKING_STATUSES = [
  'pending',
  'assigned',
  'in_progress',
  'completed',
  'cancelled',
] as const;

export type BookingStatusStrict = (typeof BOOKING_STATUSES)[number];

const transitionMap: Record<BookingStatusStrict, BookingStatusStrict[]> = {
  pending: ['assigned', 'cancelled'],
  assigned: ['in_progress', 'cancelled'],
  in_progress: ['completed'],
  completed: [],
  cancelled: [],
};

const aliasMap: Record<string, BookingStatusStrict> = {
  pending: 'pending',
  new: 'pending',
  contacted: 'pending',
  assigned: 'assigned',
  inspection_scheduled: 'assigned',
  scheduled: 'assigned',
  quoted: 'assigned',
  approved: 'assigned',
  paid: 'assigned',
  in_progress: 'in_progress',
  completed: 'completed',
  cancelled: 'cancelled',
};

export const normalizeBookingStatus = (status: string | null | undefined): BookingStatusStrict => {
  const key = String(status || '').toLowerCase().trim();
  return aliasMap[key] || 'pending';
};

export const isValidTransition = (
  current: string | null | undefined,
  next: string | null | undefined
): boolean => {
  const currentStatus = normalizeBookingStatus(current);
  const nextStatus = normalizeBookingStatus(next);

  if (currentStatus === nextStatus) return true;
  return transitionMap[currentStatus]?.includes(nextStatus) || false;
};

export const canTransition = isValidTransition;
