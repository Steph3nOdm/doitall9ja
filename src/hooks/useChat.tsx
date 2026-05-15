import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import type { Message, ChatRoom } from '@/types/database';

// Hook for job-specific chat (client-technician communication)
export function useJobChat(jobId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchMessages = useCallback(async () => {
    if (!jobId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      setMessages(data as Message[] || []);
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setIsLoading(false);
    }
  }, [jobId]);

  const sendMessage = async (content: string, attachments?: string[]) => {
    if (!user || !jobId) throw new Error('Not authenticated or no job selected');
    
    const { error } = await supabase
      .from('messages')
      .insert({
        job_id: jobId,
        sender_id: user.id,
        content,
        attachments,
        type: 'text',
        is_read: false,
      } as any);
    
    if (error) throw error;
    await fetchMessages();
  };

  const markAsRead = async (messageIds: string[]) => {
    const { error } = await supabase
      .from('messages')
      .update({ is_read: true } as any)
      .in('id', messageIds);
    
    if (error) throw error;
  };

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Real-time subscription
  useEffect(() => {
    if (!jobId) return;

    const subscription = supabase
      .channel(`job-chat-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `job_id=eq.${jobId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [jobId]);

  return {
    messages,
    isLoading,
    sendMessage,
    markAsRead,
    fetchMessages,
  };
}

// Hook for support chat
export function useSupportChat() {
  const { user } = useAuth();
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch user's chat rooms
  const fetchChatRooms = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('chat_rooms')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setChatRooms(data as ChatRoom[] || []);
    } catch (err) {
      console.error('Error fetching chat rooms:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Create a new support chat room
  const createChatRoom = async (subject: string) => {
    if (!user) throw new Error('Not authenticated');
    
    const { data, error } = await supabase
      .from('chat_rooms')
      .insert({
        user_id: user.id,
        subject,
        status: 'open',
      } as any)
      .select()
      .single();
    
    if (error) throw error;
    await fetchChatRooms();
    return data as ChatRoom;
  };

  // Fetch messages for active room
  const fetchMessages = useCallback(async (roomId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_room_id', roomId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      setMessages(data as Message[] || []);
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Send message in support chat
  const sendMessage = async (roomId: string, content: string) => {
    if (!user) throw new Error('Not authenticated');
    
    const { error } = await supabase
      .from('messages')
      .insert({
        chat_room_id: roomId,
        sender_id: user.id,
        content,
        type: 'text',
        is_read: false,
      } as any);
    
    if (error) throw error;
    
    // Update room's last message time
    await supabase
      .from('chat_rooms')
      .update({ last_message_at: new Date().toISOString() } as any)
      .eq('id', roomId);
    
    await fetchMessages(roomId);
  };

  // Close chat room
  const closeChatRoom = async (roomId: string) => {
    const { error } = await supabase
      .from('chat_rooms')
      .update({ status: 'closed' } as any)
      .eq('id', roomId);
    
    if (error) throw error;
    await fetchChatRooms();
  };

  useEffect(() => {
    fetchChatRooms();
  }, [fetchChatRooms]);

  // Subscribe to new messages in active room
  useEffect(() => {
    if (!activeRoom) return;

    const subscription = supabase
      .channel(`support-chat-${activeRoom.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_room_id=eq.${activeRoom.id}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [activeRoom]);

  return {
    chatRooms,
    activeRoom,
    messages,
    isLoading,
    setActiveRoom,
    createChatRoom,
    sendMessage,
    closeChatRoom,
    fetchChatRooms,
    fetchMessages,
  };
}

// Admin/Support hook for managing all support chats
export function useAdminSupport() {
  const { user } = useAuth();
  const [openChats, setOpenChats] = useState<ChatRoom[]>([]);
  const [assignedChats, setAssignedChats] = useState<ChatRoom[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchOpenChats = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('chat_rooms')
        .select('*')
        .eq('status', 'open')
        .is('support_id', null)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setOpenChats(data as ChatRoom[] || []);
    } catch (err) {
      console.error('Error fetching open chats:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchAssignedChats = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('chat_rooms')
        .select('*')
        .eq('support_id', user.id)
        .eq('status', 'open')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setAssignedChats(data as ChatRoom[] || []);
    } catch (err) {
      console.error('Error fetching assigned chats:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const assignChat = async (chatRoomId: string) => {
    if (!user) throw new Error('Not authenticated');
    
    const { error } = await supabase
      .from('chat_rooms')
      .update({ support_id: user.id } as any)
      .eq('id', chatRoomId);
    
    if (error) throw error;
    await Promise.all([fetchOpenChats(), fetchAssignedChats()]);
  };

  useEffect(() => {
    fetchOpenChats();
    fetchAssignedChats();
  }, [fetchOpenChats, fetchAssignedChats]);

  return {
    openChats,
    assignedChats,
    isLoading,
    fetchOpenChats,
    fetchAssignedChats,
    assignChat,
  };
}
