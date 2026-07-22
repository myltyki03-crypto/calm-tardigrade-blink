import React, { createContext, useContext, useState, useEffect } from 'react';
import { Room, ChatMessage, QueueItem, UserProfile } from '@/types/rave';
import { INITIAL_ROOMS, INITIAL_MESSAGES, INITIAL_QUEUE, CURRENT_USER } from '@/data/mockRaveData';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { showSuccess, showError } from '@/utils/toast';

interface RoomContextType {
  currentUser: UserProfile;
  updateUserProfile: (updated: Partial<UserProfile>) => void;
  rooms: Room[];
  isRoomsLoaded: boolean;
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
}

const RoomContext = createContext<RoomContextType | undefined>(undefined);

export const RoomProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('pulserave_user');
    return saved ? JSON.parse(saved) : CURRENT_USER;
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

  // Загрузка данных из Supabase и подписка на Realtime изменения
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setIsRoomsLoaded(true);
      return;
    }

    const fetchRooms = async () => {
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
    };

    const fetchMessages = async () => {
      const { data } = await supabase.from('chat_messages').select('*').order('created_at', { ascending: true });
      if (data) {
        const grouped: Record<string, ChatMessage[]> = {};
        data.forEach((msg: any) => {
          if (!grouped[msg.room_id]) grouped[msg.room_id] = [];
          grouped[msg.room_id].push(msg as ChatMessage);
        });
        setMessagesByRoom((prev) => ({ ...prev, ...grouped }));
      }
    };

    const fetchQueue = async () => {
      const { data } = await supabase.from('queue_items').select('*').order('votes', { ascending: false });
      if (data) {
        const grouped: Record<string, QueueItem[]> = {};
        data.forEach((item: any) => {
          if (!grouped[item.room_id]) grouped[item.room_id] = [];
          grouped[item.room_id].push(item as QueueItem);
        });
        setQueueByRoom((prev) => ({ ...prev, ...grouped }));
      }
    };

    fetchRooms();
    fetchMessages();
    fetchQueue();

    // Realtime подписки
    const roomsChannel = supabase
      .channel('realtime:rooms')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const inserted = payload.new as Room;
          setRooms((prev) => [inserted, ...prev.filter((r) => r.id !== inserted.id)]);
        } else if (payload.eventType === 'UPDATE') {
          const updated = payload.new as Room;
          setRooms((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));
        } else if (payload.eventType === 'DELETE') {
          const deleted = payload.old as Room;
          setRooms((prev) => prev.filter((r) => r.id !== deleted.id));
        }
      })
      .subscribe();

    const chatChannel = supabase
      .channel('realtime:chat_messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload) => {
        const newMsg = payload.new as ChatMessage;
        setMessagesByRoom((prev) => ({
          ...prev,
          [newMsg.room_id]: [...(prev[newMsg.room_id] || []), newMsg],
        }));
      })
      .subscribe();

    const queueChannel = supabase
      .channel('realtime:queue_items')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_items' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newItem = payload.new as QueueItem;
          setQueueByRoom((prev) => ({
            ...prev,
            [newItem.room_id]: [...(prev[newItem.room_id] || []), newItem],
          }));
        } else if (payload.eventType === 'UPDATE') {
          const updated = payload.new as QueueItem;
          setQueueByRoom((prev) => ({
            ...prev,
            [updated.room_id]: (prev[updated.room_id] || []).map((item) =>
              item.id === updated.id ? updated : item
            ),
          }));
        } else if (payload.eventType === 'DELETE') {
          const deleted = payload.old as QueueItem;
          setQueueByRoom((prev) => ({
            ...prev,
            [deleted.room_id]: (prev[deleted.room_id] || []).filter((item) => item.id !== deleted.id),
          }));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(roomsChannel);
      supabase.removeChannel(chatChannel);
      supabase.removeChannel(queueChannel);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('pulserave_user', JSON.stringify(currentUser));
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('pulserave_rooms', JSON.stringify(rooms));
  }, [rooms]);

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

    if (isSupabaseConfigured && supabase) {
      await supabase.from('profiles').upsert([
        {
          id: newProfile.id,
          username: newProfile.username,
          avatar_url: newProfile.avatar_url,
          status_message: newProfile.status_message,
          watch_time_minutes: newProfile.watch_time_minutes || 0,
          parties_hosted: newProfile.parties_hosted || 0,
        },
      ]);
    }
  };

  const addRoom = async (newRoom: Room) => {
    setRooms((prev) => [newRoom, ...prev]);

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('rooms').insert([newRoom]);
      if (error) {
        console.error('Ошибка добавления комнаты в Supabase:', error);
        showError(`Ошибка базы данных: ${error.message}`);
      } else {
        showSuccess('Комната синхронизирована с сервером!');
      }
    }
  };

  const deleteRoom = async (roomId: string) => {
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
      if (error) console.error('Ошибка отправки сообщения в Supabase:', error);
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
      current_media_title: title || 'Playing video',
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
        updateUserProfile,
        rooms,
        isRoomsLoaded,
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