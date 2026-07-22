import React, { createContext, useContext, useState, useEffect } from 'react';
import { Room, ChatMessage, QueueItem, UserProfile } from '@/types/rave';
import { INITIAL_ROOMS, INITIAL_MESSAGES, INITIAL_QUEUE, CURRENT_USER } from '@/data/mockRaveData';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { showSuccess, showError } from '@/utils/toast';

interface RoomContextType {
  currentUser: UserProfile;
  updateUserProfile: (updated: Partial<UserProfile>) => void;
  rooms: Room[];
  addRoom: (room: Room) => void;
  deleteRoom: (roomId: string) => void;
  getRoomById: (id: string) => Room | undefined;
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

  const [messagesByRoom, setMessagesByRoom] = useState<Record<string, ChatMessage[]>>({
    'room-1': INITIAL_MESSAGES,
  });

  const [queueByRoom, setQueueByRoom] = useState<Record<string, QueueItem[]>>(() => {
    const saved = localStorage.getItem('pulserave_queue');
    return saved ? JSON.parse(saved) : { 'room-1': INITIAL_QUEUE };
  });

  // 1. Загрузка данных из Supabase и подписка на Realtime изменения
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      console.log('Supabase не настроен, используется локальное хранилище.');
      return;
    }

    // Загрузка комнат из базы
    const fetchRooms = async () => {
      const { data, error } = await supabase.from('rooms').select('*').order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        setRooms(data as Room[]);
      }
    };

    // Загрузка сообщений из базы
    const fetchMessages = async () => {
      const { data, error } = await supabase.from('chat_messages').select('*').order('created_at', { ascending: true });
      if (!error && data) {
        const grouped: Record<string, ChatMessage[]> = {};
        data.forEach((msg: any) => {
          if (!grouped[msg.room_id]) grouped[msg.room_id] = [];
          grouped[msg.room_id].push(msg as ChatMessage);
        });
        setMessagesByRoom((prev) => ({ ...prev, ...grouped }));
      }
    };

    // Загрузка очереди треков
    const fetchQueue = async () => {
      const { data, error } = await supabase.from('queue_items').select('*').order('votes', { ascending: false });
      if (!error && data) {
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

    // Настройка Realtime канала для комнат
    const roomsSubscription = supabase
      .channel('public:rooms')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setRooms((prev) => [payload.new as Room, ...prev.filter((r) => r.id !== payload.new.id)]);
        } else if (payload.eventType === 'UPDATE') {
          setRooms((prev) => prev.map((r) => (r.id === payload.new.id ? { ...r, ...payload.new } : r)));
        } else if (payload.eventType === 'DELETE') {
          setRooms((prev) => prev.filter((r) => r.id !== payload.old.id));
        }
      })
      .subscribe();

    // Настройка Realtime канала для сообщений чата
    const chatSubscription = supabase
      .channel('public:chat_messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload) => {
        const newMsg = payload.new as ChatMessage;
        setMessagesByRoom((prev) => ({
          ...prev,
          [newMsg.room_id]: [...(prev[newMsg.room_id] || []), newMsg],
        }));
      })
      .subscribe();

    // Настройка Realtime канала для очереди
    const queueSubscription = supabase
      .channel('public:queue_items')
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
      supabase.removeChannel(roomsSubscription);
      supabase.removeChannel(chatSubscription);
      supabase.removeChannel(queueSubscription);
    };
  }, []);

  // Сохранение пользователя локально
  useEffect(() => {
    localStorage.setItem('pulserave_user', JSON.stringify(currentUser));
  }, [currentUser]);

  // Сохранение комнат локально (резервный вариант)
  useEffect(() => {
    localStorage.setItem('pulserave_rooms', JSON.stringify(rooms));
  }, [rooms]);

  const updateUserProfile = (updated: Partial<UserProfile>) => {
    setCurrentUser((prev) => ({ ...prev, ...updated }));
  };

  const addRoom = async (newRoom: Room) => {
    setRooms((prev) => [newRoom, ...prev]);

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('rooms').insert([newRoom]);
      if (error) console.error('Ошибка создания комнаты в Supabase:', error);
    }
  };

  const deleteRoom = async (roomId: string) => {
    setRooms((prev) => prev.filter((r) => r.id !== roomId));

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('rooms').delete().eq('id', roomId);
      if (error) console.error('Ошибка удаления комнаты из Supabase:', error);
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
      if (error) console.error('Ошибка добавления в очередь Supabase:', error);
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
        addRoom,
        deleteRoom,
        getRoomById,
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