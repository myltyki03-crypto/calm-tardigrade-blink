import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Room, ChatMessage, QueueItem, UserProfile, RoomMember, RegisteredAccount } from '@/types/rave';
import { INITIAL_ROOMS, INITIAL_MESSAGES, INITIAL_QUEUE } from '@/data/mockRaveData';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { showSuccess, showError } from '@/utils/toast';

interface RoomContextType {
  currentUser: UserProfile;
  isLoggedIn: boolean;
  registerUser: (username: string, password_hash: string, avatar_url?: string) => boolean;
  loginUser: (username: string, password_hash: string) => boolean;
  logoutUser: () => void;
  updateUserProfile: (updated: Partial<UserProfile>) => void;
  rooms: Room[];
  isRoomsLoaded: boolean;
  refreshRooms: () => Promise<void>;
  addRoom: (room: Room) => void;
  deleteRoom: (roomId: string) => void;
  getRoomById: (id: string) => Room | undefined;
  fetchRoomDirectly: (id: string) => Promise<Room | null>;
  messagesByRoom: Record<string, ChatMessage[]>;
  sendMessage: (roomId: string, message: ChatMessage) => void;
  queueByRoom: Record<string, QueueItem[]>;
  addQueueItem: (roomId: string, item: QueueItem) => void;
  voteQueueItem: (roomId: string, itemId: string) => void;
  changeRoomMedia: (roomId: string, url: string, title?: string, thumbnail?: string) => void;
  updateRoomProgress: (roomId: string, seconds: number, isPlaying?: boolean) => void;
  removeQueueItem: (roomId: string, itemId: string) => void;
  activeMembersByRoom: Record<string, RoomMember[]>;
  joinRoomPresence: (roomId: string) => Promise<void>;
  leaveRoomPresence: (roomId: string) => Promise<void>;
  unlockedRoomIds: string[];
  markRoomUnlocked: (roomId: string) => void;
}

const RoomContext = createContext<RoomContextType | undefined>(undefined);

export const RoomProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accounts, setAccounts] = useState<RegisteredAccount[]>(() => {
    const saved = localStorage.getItem('pulserave_accounts');
    return saved ? JSON.parse(saved) : [];
  });

  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('pulserave_logged_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse logged user:', e);
      }
    }
    return {
      id: '',
      username: 'Гость',
      avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=guest',
    };
  });

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return Boolean(localStorage.getItem('pulserave_logged_user'));
  });

  const [rooms, setRooms] = useState<Room[]>(() => {
    const saved = localStorage.getItem('pulserave_rooms');
    return saved ? JSON.parse(saved) : INITIAL_ROOMS;
  });

  const [isRoomsLoaded, setIsRoomsLoaded] = useState<boolean>(!isSupabaseConfigured);

  const [messagesByRoom, setMessagesByRoom] = useState<Record<string, ChatMessage[]>>({
    'room-1': INITIAL_MESSAGES,
  });

  const [queueByRoom, setQueueByRoom] = useState<Record<string, QueueItem[]>>(() => {
    const saved = localStorage.getItem('pulserave_queue');
    return saved ? JSON.parse(saved) : { 'room-1': INITIAL_QUEUE };
  });

  const [activeMembersByRoom, setActiveMembersByRoom] = useState<Record<string, RoomMember[]>>({});
  
  const [unlockedRoomIds, setUnlockedRoomIds] = useState<string[]>([]);

  const markRoomUnlocked = (roomId: string) => {
    setUnlockedRoomIds((prev) => (prev.includes(roomId) ? prev : [...prev, roomId]));
  };

  useEffect(() => {
    localStorage.setItem('pulserave_accounts', JSON.stringify(accounts));
  }, [accounts]);

  useEffect(() => {
    if (isLoggedIn && currentUser.id) {
      localStorage.setItem('pulserave_logged_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('pulserave_logged_user');
    }
  }, [currentUser, isLoggedIn]);

  const registerUser = (username: string, password_hash: string, avatar_url?: string): boolean => {
    const cleanName = username.trim();
    const existing = accounts.find((a) => a.username.toLowerCase() === cleanName.toLowerCase());

    if (existing) {
      showError('Пользователь с таким логином уже существует');
      return false;
    }

    const userId = 'usr_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
    const newAcc: RegisteredAccount = {
      id: userId,
      username: cleanName,
      password_hash: password_hash,
      avatar_url: avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanName)}`,
      is_online: true,
      status_message: 'В ритме вечеринки 🎧',
      is_vip: false,
      watch_time_minutes: 0,
      parties_hosted: 0,
      created_at: new Date().toISOString(),
    };

    setAccounts((prev) => [...prev, newAcc]);
    setCurrentUser(newAcc);
    setIsLoggedIn(true);

    if (isSupabaseConfigured && supabase) {
      supabase.from('profiles').upsert([
        {
          id: newAcc.id,
          username: newAcc.username,
          avatar_url: newAcc.avatar_url,
          status_message: newAcc.status_message,
        },
      ]);
    }

    showSuccess(`Аккаунт ${cleanName} успешно зарегистрирован!`);
    return true;
  };

  const loginUser = (username: string, password_hash: string): boolean => {
    const cleanName = username.trim();
    const found = accounts.find(
      (a) => a.username.toLowerCase() === cleanName.toLowerCase() && a.password_hash === password_hash
    );

    if (!found) {
      showError('Неверный логин или пароль');
      return false;
    }

    setCurrentUser(found);
    setIsLoggedIn(true);
    showSuccess(`Добро пожаловать, ${found.username}!`);
    return true;
  };

  const logoutUser = () => {
    setIsLoggedIn(false);
    setCurrentUser({
      id: '',
      username: 'Гость',
      avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=guest',
    });
    localStorage.removeItem('pulserave_logged_user');
    showSuccess('Вы вышли из аккаунта');
  };

  const fetchRooms = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      const { data, error } = await supabase.from('rooms').select('*').order('created_at', { ascending: false });
      if (error) {
        console.error('Error fetching rooms:', error);
      } else if (data && data.length > 0) {
        setRooms(data as Room[]);
      } else if (data && data.length === 0) {
        const { error: seedErr } = await supabase.from('rooms').insert(INITIAL_ROOMS);
        if (!seedErr) {
          setRooms(INITIAL_ROOMS);
          await supabase.from('chat_messages').insert(INITIAL_MESSAGES);
          await supabase.from('queue_items').insert(INITIAL_QUEUE);
        }
      }
    } finally {
      setIsRoomsLoaded(true);
    }
  }, []);

  const fetchMessages = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return;
    const { data } = await supabase.from('chat_messages').select('*').order('created_at', { ascending: true });
    if (data) {
      const grouped: Record<string, ChatMessage[]> = {};
      data.forEach((msg: any) => {
        if (!grouped[msg.room_id]) grouped[msg.room_id] = [];
        grouped[msg.room_id].push(msg as ChatMessage);
      });
      setMessagesByRoom((prev) => ({ ...prev, ...grouped }));
    }
  }, []);

  const fetchQueue = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return;
    const { data } = await supabase.from('queue_items').select('*').order('votes', { ascending: false });
    if (data) {
      const grouped: Record<string, QueueItem[]> = {};
      data.forEach((item: any) => {
        if (!grouped[item.room_id]) grouped[item.room_id] = [];
        grouped[item.room_id].push(item as QueueItem);
      });
      setQueueByRoom((prev) => ({ ...prev, ...grouped }));
    }
  }, []);

  const fetchMembers = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return;
    const { data } = await supabase.from('room_members').select('*');
    if (data) {
      const now = Date.now();
      const grouped: Record<string, RoomMember[]> = {};

      data.forEach((m: any) => {
        const lastActive = m.joined_at ? new Date(m.joined_at).getTime() : 0;
        const isRecent = now - lastActive < 15000;

        if (isRecent) {
          if (!grouped[m.room_id]) grouped[m.room_id] = [];
          if (!grouped[m.room_id].some((existing) => existing.user_id === m.user_id)) {
            grouped[m.room_id].push(m as RoomMember);
          }
        }
      });

      setActiveMembersByRoom(grouped);

      setRooms((prev) =>
        prev.map((r) => {
          const count = grouped[r.id]?.length || 1;
          return r.member_count !== count ? { ...r, member_count: count } : r;
        })
      );
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setIsRoomsLoaded(true);
      return;
    }

    fetchRooms();
    fetchMessages();
    fetchQueue();
    fetchMembers();

    // Supabase Realtime канал для мгновенной передачи изменений мотки между устройствами
    const channel = supabase
      .channel('rooms_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms' },
        (payload: any) => {
          if (payload.new && payload.new.id) {
            const updatedRoom = payload.new as Room;
            setRooms((prev) =>
              prev.map((r) => (r.id === updatedRoom.id ? { ...r, ...updatedRoom } : r))
            );
          }
        }
      )
      .subscribe();

    const interval = setInterval(() => {
      fetchRooms();
      fetchMessages();
      fetchQueue();
      fetchMembers();
    }, 1500);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchRooms();
        fetchMessages();
        fetchQueue();
        fetchMembers();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      if (supabase) supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchRooms, fetchMessages, fetchQueue, fetchMembers]);

  useEffect(() => {
    localStorage.setItem('pulserave_rooms', JSON.stringify(rooms));
  }, [rooms]);

  const joinRoomPresence = async (roomId: string) => {
    if (!currentUser.id) return;
    const targetRoom = rooms.find((r) => r.id === roomId);
    const isOwner = targetRoom?.host_id === currentUser.id;

    const memberObj: RoomMember = {
      id: `mem-${currentUser.id}-${roomId}`,
      room_id: roomId,
      user_id: currentUser.id,
      user_name: currentUser.username,
      user_avatar: currentUser.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(currentUser.username)}`,
      role: isOwner ? 'host' : 'listener',
      joined_at: new Date().toISOString(),
    };

    setActiveMembersByRoom((prev) => {
      const list = prev[roomId] || [];
      const filtered = list.filter((m) => m.user_id !== currentUser.id);
      return { ...prev, [roomId]: [...filtered, memberObj] };
    });

    if (isSupabaseConfigured && supabase) {
      await supabase.from('room_members').upsert([memberObj]);
    }
  };

  const leaveRoomPresence = async (roomId: string) => {
    if (!currentUser.id) return;
    setActiveMembersByRoom((prev) => ({
      ...prev,
      [roomId]: (prev[roomId] || []).filter((m) => m.user_id !== currentUser.id),
    }));

    if (isSupabaseConfigured && supabase) {
      await supabase
        .from('room_members')
        .delete()
        .eq('room_id', roomId)
        .eq('user_id', currentUser.id);
    }
  };

  const fetchRoomDirectly = async (id: string): Promise<Room | null> => {
    if (!isSupabaseConfigured || !supabase) return null;
    const { data } = await supabase.from('rooms').select('*').eq('id', id).single();
    if (data) {
      const fetched = data as Room;
      setRooms((prev) => [fetched, ...prev.filter((r) => r.id !== fetched.id)]);
      return fetched;
    }
    return null;
  };

  const updateUserProfile = async (updated: Partial<UserProfile>) => {
    const newProfile = { ...currentUser, ...updated };
    setCurrentUser(newProfile);

    setAccounts((prev) =>
      prev.map((acc) => (acc.id === newProfile.id ? { ...acc, ...updated } : acc))
    );

    if (updated.avatar_url || updated.username) {
      setRooms((prev) =>
        prev.map((r) =>
          r.host_id === newProfile.id
            ? {
                ...r,
                ...(updated.avatar_url && { host_avatar: updated.avatar_url }),
                ...(updated.username && { host_name: updated.username }),
              }
            : r
        )
      );
    }

    if (isSupabaseConfigured && supabase) {
      await supabase.from('profiles').upsert([
        {
          id: newProfile.id,
          username: newProfile.username,
          avatar_url: newProfile.avatar_url,
          status_message: newProfile.status_message,
        },
      ]);

      if (updated.avatar_url || updated.username) {
        await supabase
          .from('rooms')
          .update({
            ...(updated.avatar_url && { host_avatar: updated.avatar_url }),
            ...(updated.username && { host_name: updated.username }),
          })
          .eq('host_id', newProfile.id);
      }
    }
  };

  const addRoom = async (newRoom: Room) => {
    const roomWithTimestamp = {
      ...newRoom,
      last_updated_at: new Date().toISOString(),
    };

    setRooms((prev) => [roomWithTimestamp, ...prev]);
    markRoomUnlocked(newRoom.id);

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('rooms').insert([roomWithTimestamp]);
      if (error) {
        console.error('Ошибка добавления комнаты в Supabase:', error);
        showError(`Ошибка базы данных: ${error.message}`);
      } else {
        showSuccess('Комната создана!');
      }
    }
  };

  const deleteRoom = async (roomId: string) => {
    const targetRoom = rooms.find((r) => r.id === roomId);
    if (targetRoom && targetRoom.host_id !== currentUser.id) {
      showError('Только владелец комнаты может ее удалить!');
      return;
    }

    setRooms((prev) => prev.filter((r) => r.id !== roomId));

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('rooms').delete().eq('id', roomId);
      if (error) console.error('Ошибка удаления из Supabase:', error);
    }
  };

  const getRoomById = (id: string) => {
    return rooms.find((r) => r.id === id);
  };

  const sendMessage = async (roomId: string, message: ChatMessage) => {
    setMessagesByRoom((prev) => ({
      ...prev,
      [roomId]: [...(prev[roomId] || []), message],
    }));

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('chat_messages').insert([message]);
      if (error) {
        console.error('Ошибка отправки сообщения в Supabase:', error);
        showError('Не удалось отправить сообщение в чат');
      }
    }
  };

  const addQueueItem = async (roomId: string, item: QueueItem) => {
    setQueueByRoom((prev) => ({
      ...prev,
      [roomId]: [...(prev[roomId] || []), item],
    }));

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('queue_items').insert([item]);
      if (error) console.error('Ошибка очереди в Supabase:', error);
    }
  };

  const voteQueueItem = async (roomId: string, itemId: string) => {
    const currentItem = (queueByRoom[roomId] || []).find((i) => i.id === itemId);
    const newVotes = (currentItem?.votes || 0) + 1;

    setQueueByRoom((prev) => ({
      ...prev,
      [roomId]: (prev[roomId] || []).map((item) =>
        item.id === itemId ? { ...item, votes: newVotes } : item
      ),
    }));

    if (isSupabaseConfigured && supabase) {
      await supabase.from('queue_items').update({ votes: newVotes }).eq('id', itemId);
    }
  };

  const changeRoomMedia = async (roomId: string, url: string, title?: string, thumbnail?: string) => {
    const updatePayload = {
      current_media_url: url,
      current_media_title: title || 'Воспроизведение видео',
      current_media_thumbnail: thumbnail,
      playback_position_seconds: 0,
      last_updated_at: new Date().toISOString(),
      is_playing: true,
    };

    setRooms((prev) =>
      prev.map((r) => (r.id === roomId ? { ...r, ...updatePayload } : r))
    );

    if (isSupabaseConfigured && supabase) {
      await supabase.from('rooms').update(updatePayload).eq('id', roomId);
    }
  };

  const updateRoomProgress = async (roomId: string, seconds: number, isPlaying?: boolean) => {
    const updatePayload = {
      playback_position_seconds: seconds,
      last_updated_at: new Date().toISOString(),
      ...(isPlaying !== undefined && { is_playing: isPlaying }),
    };

    setRooms((prev) =>
      prev.map((r) => (r.id === roomId ? { ...r, ...updatePayload } : r))
    );

    if (isSupabaseConfigured && supabase) {
      await supabase.from('rooms').update(updatePayload).eq('id', roomId);
    }
  };

  const removeQueueItem = async (roomId: string, itemId: string) => {
    setQueueByRoom((prev) => ({
      ...prev,
      [roomId]: (prev[roomId] || []).filter((item) => item.id !== itemId),
    }));

    if (isSupabaseConfigured && supabase) {
      await supabase.from('queue_items').delete().eq('id', itemId);
    }
  };

  return (
    <RoomContext.Provider
      value={{
        currentUser,
        isLoggedIn,
        registerUser,
        loginUser,
        logoutUser,
        updateUserProfile,
        rooms,
        isRoomsLoaded,
        refreshRooms: fetchRooms,
        addRoom,
        deleteRoom,
        getRoomById,
        fetchRoomDirectly,
        messagesByRoom,
        sendMessage,
        queueByRoom,
        addQueueItem,
        voteQueueItem,
        changeRoomMedia,
        updateRoomProgress,
        removeQueueItem,
        activeMembersByRoom,
        joinRoomPresence,
        leaveRoomPresence,
        unlockedRoomIds,
        markRoomUnlocked,
      }}
    >
      {children}
    </RoomContext.Provider>
  );
};

export const useRooms = () => {
  const context = useContext(RoomContext);
  if (!context) {
    throw new Error('useRooms must be used within a RoomProvider');
  }
  return context;
};