import type { Service } from '@/types/database';

export type BookingJobType = 'inspection' | 'fixed';
export type BookingQuoteStatus = 'pending' | 'approved';

const inspectionFirstSlugs = new Set(['electrical', 'plumbing', 'ac', 'appliance', 'carpentry']);
const fixedFirstSlugs = new Set(['painting']);

const inspectionKeywords = ['repair', 'installation', 'install', 'fault', 'leak', 'wiring', 'diagnostic'];
const fixedKeywords = ['painting', 'cleaning', 'laundry', 'fumigation', 'delivery'];

export const resolveBookingJobType = (
  service: Pick<Service, 'name' | 'slug'> | null | undefined
): BookingJobType => {
  if (!service) return 'fixed';

  const slug = (service.slug || '').toLowerCase();
  const name = (service.name || '').toLowerCase();
  const label = `${slug} ${name}`;

  if (fixedFirstSlugs.has(slug) || fixedKeywords.some((keyword) => label.includes(keyword))) {
    return 'fixed';
  }

  if (inspectionFirstSlugs.has(slug) || inspectionKeywords.some((keyword) => label.includes(keyword))) {
    return 'inspection';
  }

  // Safer default for unknown services to avoid blocking users behind quote flow.
  return 'fixed';
};

export const resolveInitialQuoteStatus = (jobType: BookingJobType): BookingQuoteStatus => {
  return jobType === 'inspection' ? 'pending' : 'approved';
};
