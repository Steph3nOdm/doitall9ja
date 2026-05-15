// Database Types for DIA Website

export type UserRole = 'client' | 'technician' | 'admin' | 'support';
export type ClientType =
  | 'Home Owner'
  | 'Tenant'
  | 'Landlord'
  | 'Property Manager'
  | 'Business Owner'
  | 'Contractor'
  | 'Other';

export type JobStatus = 
  | 'pending'
  | 'reviewing'
  | 'assigned'
  | 'accepted'
  | 'in_progress'
  | 'completed'
  | 'confirmed'
  | 'cancelled'
  | 'disputed';

// Services table
export interface Service {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  order_index: number;
  is_active: boolean;
  created_at: string;
}

// Technician profile projection (from profiles table)
export interface Technician {
  id: string;
  full_name: string;
  image_url: string;
  skills: string[];
  // Backward-compatible display fields used by existing UI.
  name?: string;
  role?: string;
  rating?: number;
  experience?: string;
  jobs_completed?: number;
  bio?: string;
  is_active?: boolean;
  order_index?: number;
  created_at?: string;
  avatar_url?: string;
}

// Reviews/Testimonials table
export interface Review {
  id: string;
  customer_name: string;
  location: string;
  service: string;
  rating: number;
  text: string;
  is_active: boolean;
  order_index: number;
  created_at: string;
}

// Bookings table
export interface Booking {
  id: string;
  user_id?: string;
  technician_id?: string;
  job_type?: 'inspection' | 'fixed';
  quoted_price?: number;
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
  };
  quote_status?: 'pending' | 'sent' | 'accepted' | 'rejected' | 'quoted' | 'approved';
  payment_status?: 'pending' | 'paid' | 'failed';
  payment_reference?: string;
  service?: string;
  date?: string;
  time?: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  service_id: string;
  service_name?: string;
  address: string;
  city: string;
  description: string;
  preferred_date?: string;
  preferred_time?: string;
  urgency: 'low' | 'medium' | 'high' | 'emergency';
  budget_type: 'fixed' | 'hourly' | 'negotiable';
  budget_amount?: number;
  status:
    | 'pending'
    | 'assigned'
    | 'in_progress'
    | 'completed'
    | 'cancelled';
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Profiles table (extends auth.users)
export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  role: UserRole;
  client_type?: ClientType | null;
  avatar_url?: string;
  address?: string;
  city?: string;
  state?: string;
  created_at: string;
  updated_at: string;
  skills?: string[];
  years_experience?: number;
  is_available?: boolean;
  rating?: number;
  total_jobs?: number;
  bio?: string;
  verified?: boolean;
}

// Jobs table
export interface Job {
  id: string;
  client_id: string;
  technician_id?: string;
  assigned_by?: string;
  status: JobStatus;
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  location: string;
  address: string;
  budget?: number;
  budget_type: 'fixed' | 'hourly' | 'negotiable';
  urgency: 'low' | 'medium' | 'high' | 'emergency';
  preferred_date?: string;
  preferred_time?: string;
  created_at: string;
  updated_at: string;
  accepted_at?: string;
  started_at?: string;
  completed_at?: string;
  confirmed_at?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  client_rating?: number;
  technician_rating?: number;
  client_review?: string;
  technician_review?: string;
  // Joined fields
  client?: Profile;
  technician?: Profile;
  assigned_by_admin?: Profile;
}

// Messages table
export interface Message {
  id: string;
  job_id?: string;
  chat_room_id?: string;
  sender_id: string;
  receiver_id?: string;
  type: 'text' | 'image' | 'system';
  content: string;
  attachments?: string[];
  is_read: boolean;
  created_at: string;
}

// Chat rooms for support
export interface ChatRoom {
  id: string;
  user_id: string;
  support_id?: string;
  subject?: string;
  status: 'open' | 'closed';
  created_at: string;
  updated_at: string;
  last_message_at?: string;
}

// Notifications
export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'booking_created' | 'assigned' | 'status_update';
  is_read: boolean;
  created_at: string;
}

// Job Events table (for timeline/activity log)
export interface JobEvent {
  id: string;
  job_id: string;
  actor_id: string;
  event_type: string;
  description: string;
  metadata?: Record<string, any>;
  created_at: string;
}

// Database interface for Supabase client
export interface Database {
  public: {
    Tables: {
      services: {
        Row: Service;
        Insert: Omit<Service, 'id' | 'created_at'>;
        Update: Partial<Service>;
      };
      reviews: {
        Row: Review;
        Insert: Omit<Review, 'id' | 'created_at'>;
        Update: Partial<Review>;
      };
      bookings: {
        Row: Booking;
        Insert: Omit<Booking, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Booking>;
      };
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'>;
        Update: Partial<Profile>;
      };
      jobs: {
        Row: Job;
        Insert: Omit<Job, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Job>;
      };
      messages: {
        Row: Message;
        Insert: Omit<Message, 'id' | 'created_at'>;
        Update: Partial<Message>;
      };
      chat_rooms: {
        Row: ChatRoom;
        Insert: Omit<ChatRoom, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<ChatRoom>;
      };
      notifications: {
        Row: Notification;
        Insert: Omit<Notification, 'id' | 'created_at'>;
        Update: Partial<Notification>;
      };
      job_events: {
        Row: JobEvent;
        Insert: Omit<JobEvent, 'id' | 'created_at'>;
        Update: Partial<JobEvent>;
      };
    };
  };
}

