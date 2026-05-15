import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';
import { ensureSupabaseConfigured, supabase, supabaseConfigError } from '@/lib/supabase';
import type { Notification } from '@/types/database';

interface NotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, role } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsUnavailable, setNotificationsUnavailable] = useState(false);
  const consecutiveFetchErrorsRef = useRef(0);
  const isAdminView = role === 'admin' || role === 'support';

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) {
      setNotifications([]);
      return;
    }

    try {
      ensureSupabaseConfigured();
      let query = supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (!isAdminView) {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setNotifications((data as Notification[]) || []);
      consecutiveFetchErrorsRef.current = 0;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      consecutiveFetchErrorsRef.current += 1;
      if (consecutiveFetchErrorsRef.current >= 3) {
        setNotificationsUnavailable(true);
        setNotifications([]);
      }
    }
  }, [user?.id, isAdminView]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id || supabaseConfigError || notificationsUnavailable) {
      setNotifications([]);
      return;
    }

    void fetchNotifications();

    const realtimeConfig: {
      event: '*';
      schema: 'public';
      table: 'notifications';
      filter?: string;
    } = {
      event: '*',
      schema: 'public',
      table: 'notifications',
    };

    if (!isAdminView) {
      realtimeConfig.filter = `user_id=eq.${user.id}`;
    }

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        realtimeConfig,
        () => {
          void fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [isAuthenticated, user?.id, isAdminView, fetchNotifications, notificationsUnavailable]);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
    );

    if (!user?.id || supabaseConfigError) return;

    let query = supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    if (!isAdminView) {
      query = query.eq('user_id', user.id);
    }

    void query;
  }, [user?.id, isAdminView]);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));

    if (!user?.id || supabaseConfigError) return;

    let query = supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('is_read', false);

    if (!isAdminView) {
      query = query.eq('user_id', user.id);
    }

    void query;
  }, [user?.id, isAdminView]);

  const deleteNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        deleteNotification,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
}
