import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

const invalidSupabaseUrlValues = new Set([
  '',
  'your_supabase_url',
  'https://your-project.supabase.co',
  'your-project.supabase.co',
]);

const invalidSupabaseKeyValues = new Set([
  '',
  'your_supabase_anon_key',
  'your-anon-key',
]);

const isValidHttpUrl = (value: string) => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
};

export const supabaseConfigError = (() => {
  if (invalidSupabaseUrlValues.has(supabaseUrl) || !isValidHttpUrl(supabaseUrl)) {
    return 'Supabase URL is not configured. Set VITE_SUPABASE_URL in your deployment environment and rebuild.';
  }
  if (invalidSupabaseKeyValues.has(supabaseAnonKey)) {
    return 'Supabase anon key is not configured. Set VITE_SUPABASE_ANON_KEY in your deployment environment and rebuild.';
  }
  return null;
})();

// Keep app booting so we can show actionable errors in UI instead of crashing at import time.
const safeSupabaseUrl = supabaseConfigError ? 'https://invalid.supabase.local' : supabaseUrl;
const safeSupabaseAnonKey = supabaseConfigError ? 'invalid-anon-key' : supabaseAnonKey;

export const supabase = createClient(safeSupabaseUrl, safeSupabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

export const ensureSupabaseConfigured = () => {
  if (supabaseConfigError) {
    throw new Error(supabaseConfigError);
  }
};

// ============================================
// AUTH HELPERS
// ============================================

export const signUp = async (email: string, password: string, userData: {
  full_name: string;
  phone: string;
  role: 'client' | 'technician';
}) => {
  ensureSupabaseConfigured();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: userData.full_name,
        phone: userData.phone,
        role: userData.role,
      },
    },
  });
  
  if (error) throw error;
  return data;
};

export const signIn = async (email: string, password: string) => {
  ensureSupabaseConfigured();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) throw error;
  return data;
};

export const signOut = async () => {
  ensureSupabaseConfigured();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const resetPassword = async (email: string) => {
  ensureSupabaseConfigured();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) throw error;
};

// ============================================
// SERVICES API
// ============================================

export const fetchServices = async () => {
  ensureSupabaseConfigured();
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('is_active', true)
    .order('order_index', { ascending: true });
  
  if (error) throw error;
  return data || [];
};

export const fetchServiceBySlug = async (slug: string) => {
  ensureSupabaseConfigured();
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();
  
  if (error) throw error;
  return data;
};

// ============================================
// TECHNICIANS API
// ============================================

type TechnicianProfileRow = {
  id: string;
  full_name?: string | null;
  rating?: number | null;
  years_experience?: number | null;
  total_jobs?: number | null;
  avatar_url?: string | null;
  bio?: string | null;
  skills?: string[] | null;
  is_available?: boolean | null;
  created_at?: string | null;
};

const defaultTechnicianAvatar =
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face';

const mapProfileToTechnician = (row: TechnicianProfileRow) => {
  console.log('ROW FROM SUPABASE:', row);

  const rawId = String(row.id || '').trim();
  if (!rawId || rawId.length !== 36) {
    console.error('INVALID TECHNICIAN UUID:', row);
  }

  const years = typeof row.years_experience === 'number' ? row.years_experience : 0;
  const experienceLabel = years > 0 ? `${years} years` : 'Not set';

  return {
    id: rawId,
    full_name: row.full_name || 'Unknown',
    image_url: row.avatar_url || defaultTechnicianAvatar,
    skills: Array.isArray(row.skills) ? row.skills : [],
    // Backward-compatible display fields used by existing UI components.
    name: row.full_name || 'Unknown',
    role: 'technician',
    rating: typeof row.rating === 'number' ? row.rating : 0,
    experience: experienceLabel,
    jobs_completed: typeof row.total_jobs === 'number' ? row.total_jobs : 0,
    avatar_url: row.avatar_url || defaultTechnicianAvatar,
    bio: row.bio || undefined,
    is_active: row.is_available ?? true,
    order_index: 0,
    created_at: row.created_at || new Date().toISOString(),
  };
};

export const fetchTechnicians = async () => {
  ensureSupabaseConfigured();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'technician')
    .order('full_name', { ascending: true });

  if (error) throw error;

  const mapped = ((data as TechnicianProfileRow[] | null) || []).map(mapProfileToTechnician);
  const valid = mapped.filter((tech) => tech.id.length === 36);

  if (valid.length !== mapped.length) {
    console.error('SYSTEM ERROR:', 'Dropped technician records with invalid UUIDs');
  }

  return valid;
};

export const fetchTechnicianById = async (id: string) => {
  ensureSupabaseConfigured();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .eq('role', 'technician')
    .single();

  if (error) throw error;
  return mapProfileToTechnician(data as TechnicianProfileRow);
};

// ============================================
// REVIEWS API
// ============================================

export const fetchReviews = async () => {
  ensureSupabaseConfigured();
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('is_active', true)
    .order('order_index', { ascending: true });
  
  if (error) throw error;
  return data || [];
};

// ============================================
// BOOKINGS API
// ============================================

export const createBooking = async (fields: {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  service_id: string;
  address: string;
  city: string;
  description: string;
  preferred_date?: string;
  preferred_time?: string;
  urgency: 'low' | 'medium' | 'high' | 'emergency';
  budget_type: 'fixed' | 'hourly' | 'negotiable';
  budget_amount?: number;
  job_type?: 'inspection' | 'fixed';
  quote_status?: 'pending' | 'quoted' | 'approved' | 'rejected';
  payment_status?: 'pending' | 'paid' | 'failed';
}) => {
  ensureSupabaseConfigured();

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    console.error('SYSTEM ERROR: No authenticated user');
    throw new Error('User not authenticated');
  }

  const requiredFields = ['customer_name', 'customer_email', 'customer_phone', 'service_id', 'address', 'city', 'description'] as const;
  for (const f of requiredFields) {
    if (!String(fields[f] || '').trim()) {
      throw new Error(`${f.replace(/_/g, ' ')} is required.`);
    }
  }

  const payload = {
    user_id: userData.user.id,
    customer_name: fields.customer_name.trim(),
    customer_email: fields.customer_email.trim(),
    customer_phone: fields.customer_phone.trim(),
    service_id: fields.service_id.trim(),
    service_name: fields.service_id.trim(),
    address: fields.address.trim(),
    city: fields.city.trim(),
    description: fields.description.trim(),
    preferred_date: fields.preferred_date || null,
    preferred_time: fields.preferred_time || null,
    urgency: fields.urgency,
    budget_type: fields.budget_type,
    budget_amount: fields.budget_amount ?? null,
    job_type: fields.job_type ?? 'fixed',
    quote_status: fields.quote_status ?? 'pending',
    payment_status: fields.payment_status ?? 'pending',
    status: 'pending',
  };

  console.log('BOOKING CREATE:', payload);

  const { data, error } = await supabase
    .from('bookings')
    .insert(payload as any)
    .select()
    .single();

  if (error) {
    console.error('SYSTEM ERROR:', error);
    throw error;
  }
  return data;
};

export const fetchBookings = async (userId?: string, isAdmin = false) => {
  ensureSupabaseConfigured();

  let query;
  if (isAdmin) {
    query = supabase.from('bookings').select('*');
  } else {
    query = supabase.from('bookings').select('*');
    if (userId) {
      query = query.eq('user_id', userId);
    }
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  
  if (error) {
    console.error('SYSTEM ERROR:', error);
    throw error;
  }
  return data || [];
};

// ============================================
// JOBS API (for authenticated users)
// ============================================

export const fetchJobs = async (userId?: string, role?: string) => {
  ensureSupabaseConfigured();
  let query = supabase.from('jobs').select('*');
  
  if (userId && role === 'client') {
    query = query.eq('client_id', userId);
  } else if (userId && role === 'technician') {
    query = query.eq('technician_id', userId);
  }
  
  const { data, error } = await query.order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
};

export const createJob = async (job: {
  client_id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  address: string;
  budget?: number;
  budget_type: 'fixed' | 'hourly' | 'negotiable';
  urgency: 'low' | 'medium' | 'high' | 'emergency';
  preferred_date?: string;
  preferred_time?: string;
}) => {
  ensureSupabaseConfigured();
  const { data, error } = await supabase
    .from('jobs')
    .insert({
      ...job,
      status: 'pending',
    } as any)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

// ============================================
// PROFILES API
// ============================================

export const fetchProfile = async (userId: string) => {
  ensureSupabaseConfigured();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (error) throw error;
  return data;
};

export const updateProfile = async (userId: string, updates: Partial<{
  full_name: string;
  phone: string;
  address: string;
  city: string;
  avatar_url: string;
}>) => {
  ensureSupabaseConfigured();
  const { data, error } = await supabase
    .from('profiles')
    .update(updates as any)
    .eq('id', userId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

// ============================================
// REALTIME SUBSCRIPTIONS
// ============================================

export const subscribeToBookings = (callback: (payload: any) => void) => {
  ensureSupabaseConfigured();
  return supabase
    .channel('bookings-channel')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, callback)
    .subscribe();
};

export const subscribeToJobs = (callback: (payload: any) => void) => {
  ensureSupabaseConfigured();
  return supabase
    .channel('jobs-channel')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, callback)
    .subscribe();
};



