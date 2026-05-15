import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { ensureSupabaseConfigured, supabase, supabaseConfigError } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
import type { Profile, UserRole } from '@/types/database';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: UserRole | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signUp: (email: string, password: string, userData: {
    full_name: string;
    phone: string;
    role: 'client' | 'technician';
  }) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const isUserRole = (value: unknown): value is UserRole => {
  return value === 'client' || value === 'technician' || value === 'admin' || value === 'support';
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const resolveRoleFromUser = useCallback((authUser: User | null): UserRole | null => {
    if (!authUser) return null;
    const metadataRole = (authUser.user_metadata as Record<string, unknown> | null)?.role;
    const appRole = (authUser.app_metadata as Record<string, unknown> | null)?.role;
    const candidate = metadataRole ?? appRole;
    return isUserRole(candidate) ? candidate : null;
  }, []);

  const createProfileFallback = useCallback((authUser: User): Profile => {
    const metadata = authUser.user_metadata as Record<string, unknown> | null;
    const fullName = typeof metadata?.full_name === 'string'
      ? metadata.full_name
      : authUser.email?.split('@')[0] || 'User';
    const phone = typeof metadata?.phone === 'string' ? metadata.phone : '';
    const clientType = typeof metadata?.client_type === 'string' ? metadata.client_type : null;

    return {
      id: authUser.id,
      email: authUser.email || '',
      full_name: fullName,
      phone,
      client_type: clientType as Profile['client_type'],
      role: resolveRoleFromUser(authUser) || 'client',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }, [resolveRoleFromUser]);

  // Fetch user profile from database
  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }
      
      return data as Profile;
    } catch (error) {
      console.error('Error in fetchProfile:', error);
      return null;
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        ensureSupabaseConfigured();
        // Get current session
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (supabaseConfigError) {
      console.error(supabaseConfigError);
      setIsLoading(false);
      return;
    }

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (!session?.user) {
          setProfile(null);
        }

        setIsLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Load profile in background after user is established.
  useEffect(() => {
    let isActive = true;

    const loadProfile = async () => {
      if (!user) {
        setProfile(null);
        return;
      }

      const profileData = await fetchProfile(user.id);
      if (!isActive) return;

      if (profileData) {
        setProfile(profileData);
      } else {
        // Fallback keeps session usable even if profile row is missing/blocked.
        setProfile(createProfileFallback(user));
      }
    };

    void loadProfile();

    return () => {
      isActive = false;
    };
  }, [user, fetchProfile, createProfileFallback]);

  const signUp = async (
    email: string,
    password: string,
    userData: { full_name: string; phone: string; role: 'client' | 'technician' }
  ) => {
    ensureSupabaseConfigured();
    const { error } = await supabase.auth.signUp({
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
  };

  const signIn = async (email: string, password: string) => {
    ensureSupabaseConfigured();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
  };

  const signOut = async () => {
    ensureSupabaseConfigured();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const resetPassword = async (email: string) => {
    ensureSupabaseConfigured();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    ensureSupabaseConfigured();
    if (!user) throw new Error('No user logged in');
    
    const { error } = await supabase
      .from('profiles')
      .update(updates as any)
      .eq('id', user.id);
    
    if (error) throw error;
    
    // Refresh profile after update
    await refreshProfile();
  };

  const refreshProfile = async () => {
    ensureSupabaseConfigured();
    if (!user) return;
    const profileData = await fetchProfile(user.id);
    setProfile(profileData || createProfileFallback(user));
  };

  const value: AuthContextType = {
    user,
    session,
    profile,
    role: profile?.role ?? resolveRoleFromUser(user),
    isLoading,
    isAuthenticated: !!user,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updateProfile,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Role-based hooks
export function useIsClient() {
  const { role } = useAuth();
  return role === 'client';
}

export function useIsTechnician() {
  const { role } = useAuth();
  return role === 'technician';
}

export function useIsAdmin() {
  const { role } = useAuth();
  return role === 'admin' || role === 'support';
}
