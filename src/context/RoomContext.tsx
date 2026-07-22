import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Room, ChatMessage, QueueItem, UserProfile, RoomMember, RegisteredAccount, FriendRequest, DirectMessage } from '@/types/rave';
import { INITIAL_ROOMS, INITIAL_MESSAGES, INITIAL_QUEUE } from '@/data/mockRaveData';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { showSuccess, showError } from '@/utils/toast';
import { parseMediaUrl } from '@/utils/mediaUtils';

interface RoomContextType {
  currentUser: UserProfile;
  isLoggedIn: boolean;
  registerUser: (username: string, password_hash: string, avatar_url?: string) => Promise<boolean>;
  loginUser: (username: string, password_hash: string) => Promise<boolean>;
  logoutUser: () => void;
  updateUserProfile: (updated: Partial<UserProfile>) => Promise<boolean>;
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
  voteToSkip: (roomId: string) => void;
  transferHostRole: (roomId: string, newHostId: string, newHostName: string, newHostAvatar?: string) => void;
  // Система друзей
  friendRequests: FriendRequest[];
  friendsList: UserProfile[];
  sendFriendRequest: (targetUsername: string) => Promise<boolean>;
  acceptFriendRequest: (requestId: string) => Promise<void>;
  rejectFriendRequest: (requestId: string) => Promise<void>;
  removeFriend: (friendId: string) => Promise<void>;
  // Личные сообщения
  directMessages: DirectMessage[];
  sendDirectMessage: (receiverId: string, receiverName: string, text: string) => Promise<boolean>;
  markDirectMessagesAsRead: (friendId: string, friendName: string) => Promise<void>;
  unreadDirectCount: number;
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

  const [messagesByRoom, setMessagesByRoom] = useState<Record<string, ChatMessage[]>>(() => {
    const saved = localStorage.getItem('pulserave_messages');
    return saved ? JSON.parse(saved) : { 'room-1': INITIAL_MESSAGES };
  });

  const [queueByRoom, setQueueByRoom] = useState<Record<string, QueueItem[]>>(() => {
    const saved = localStorage.getItem('pulserave_queue');
    return saved ? JSON.parse(saved) : { 'room-1': INITIAL_QUEUE };
  });

  const [activeMembersByRoom, setActiveMembersByRoom] = useState<Record<string, RoomMember[]>>({});
  const [unlockedRoomIds, setUnlockedRoomIds] = useState<string[]>([]);

  // Состояния для друзей и заявок
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>(() => {
    const saved = localStorage.getItem('pulserave_friend_requests');
    return saved ? JSON.parse(saved) : [];
  });

  // Состояние личных сообщений
  const [directMessages, setDirectMessages] = useState<DirectMessage[]>(() => {
    const saved = localStorage.getItem('pulserave_direct_messages');
    return saved ? JSON.parse(saved) : [];
  });

  const markRoomUnlocked = (roomId: string) => {
    setUnlockedRoomIds((prev) => (prev.includes(roomId) ? prev : [...prev, roomId]));
  };

  useEffect(() => {
    localStorage.setItem('pulserave_accounts', JSON.stringify(accounts));
  }, [accounts]);

  useEffect(() => {
    localStorage.setItem('pulserave_messages', JSON.stringify(messagesByRoom));
  }, [messagesByRoom]);

  useEffect(() => {
    localStorage.setItem('pulserave_queue', JSON.stringify(queueByRoom));
  }, [queueByRoom]);

  useEffect(() => {
    localStorage.setItem('pulserave_friend_requests', JSON.stringify(friendRequests));
  }, [friendRequests]);

  useEffect(() => {
    localStorage.setItem('pulserave_direct_messages', JSON.stringify(directMessages));
  }, [directMessages]);

  useEffect(() => {
    if (isLoggedIn && currentUser.id) {
      localStorage.setItem('pulserave_logged_user', JSON.stringify(currentUser));
      if (isSupabaseConfigured && supabase) {
        supabase.from('profiles').upsert([
          {
            id: currentUser.id,
            username: currentUser.username,
            avatar_url: currentUser.avatar_url,
            status_message: currentUser.status_message,
          },
        ]).then(({ error }) => {
          if (error) console.error('Failed to sync profile to Supabase:', error);
        });
      }
    } else {
      localStorage.removeItem('pulserave_logged_user');
    }
  }, [currentUser, isLoggedIn]);

  const registerUser = async (username: string, password_hash: string, avatar_url?: string): Promise<boolean> => {
    const cleanName = username.trim();

    const existingLocal = accounts.find((a) => a.username.toLowerCase() === cleanName.toLowerCase());
    if (existingLocal) {
      showError('Пользователь с таким логином уже существует');
      return false;
    }

    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .ilike('username', cleanName)
        .maybeSingle();

      if (data) {
        showError('Пользователь с таким логином уже зарегистрирован в облаке!');
        return false;
      }
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
      await supabase.from('profiles').upsert([
        {
          id: newAcc.id,
          username: newAcc.username,
          avatar_url: newAcc.avatar_url,
          status_message: newAcc.status_message,
          password_hash: newAcc.password_hash,
        },
      ]);
    }

    showSuccess(`Аккаунт ${cleanName} успешно зарегистрирован!`);
    return true;
  };

  const loginUser = async (username: string, password_hash: string): Promise<boolean> => {
    const cleanName = username.trim();

    let found = accounts.find(
      (a) => a.username.toLowerCase() === cleanName.toLowerCase() && a.password_hash === password_hash
    );

    if (!found && isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike('username', cleanName)
        .maybeSingle();

      if (data && !error) {
        if (data.password_hash === password_hash || !data.password_hash) {
          found = {
            id: data.id,
            username: data.username,
            password_hash: password_hash,
            avatar_url: data.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(data.username)}`,
            is_online: true,
            status_message: data.status_message || 'В ритме вечеринки 🎧',
            is_vip: Boolean(data.is_vip),
            watch_time_minutes: data.watch_time_minutes || 0,
            parties_hosted: data.parties_hosted || 0,
            created_at: data.created_at || new Date().toISOString(),
          };

          setAccounts((prev) => {
            if (!prev.some((a) => a.id === found!.id)) {
              return [...prev, found!];
            }
            return prev;
          });
        }
      }
    }

    if (!found) {
      showError('Неверный логин или пароль');
      return false;
    }

    setCurrentUser(found);
    setIsLoggedIn(true);

    if (isSupabaseConfigured && supabase) {
      await supabase.from('profiles').upsert([
        {
          id: found.id,
          username: found.username,
          avatar_url: found.avatar_url,
          status_message: found.status_message,
        },
      ]);
    }

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
      if (!error && data && data.length > 0) {
        setRooms(data as Room[]);
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
    }
  }, []);

  const fetchFriendRequests = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return;
    const { data } = await supabase.from('friend_requests').select('*');
    if (data) {
      setFriendRequests(data as FriendRequest[]);
    }
  }, []);

  const fetchDirectMessages = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return;
    const { data } = await supabase
      .from('direct_messages')
      .select('*')
      .order('created_at', { ascending: true });
    if (data) {
      setDirectMessages(data as DirectMessage[]);
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
    fetchFriendRequests();
    fetchDirectMessages();

    const interval = setInterval(() => {
      fetchRooms();
      fetchMessages();
      fetchQueue();
      fetchMembers();
      fetchFriendRequests();
      fetchDirectMessages();
    }, 2000);

    return () => clearInterval(interval);
  }, [fetchRooms, fetchMessages, fetchQueue, fetchMembers, fetchFriendRequests, fetchDirectMessages]);

  useEffect(() => {
    localStorage.setItem('pulserave_rooms', JSON.stringify(rooms));
  }, [rooms]);

  // Метод отправки ЛС
  const sendDirectMessage = async (receiverId: string, receiverName: string, text: string): Promise<boolean> => {
    if (!text.trim()) return false;
    if (!currentUser.id) {
      showError('Войдите в аккаунт для отправки сообщений');
      return false;
    }

    const newDm: DirectMessage = {
      id: `dm-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      sender_id: currentUser.id,
      sender_name: currentUser.username,
      sender_avatar: currentUser.avatar_url,
      receiver_id: receiverId,
      receiver_name: receiverName,
      message: text.trim(),
      created_at: new Date().toISOString(),
      is_read: false,
    };

    setDirectMessages((prev) => [...prev, newDm]);

    if (isSupabaseConfigured && supabase) {
      await supabase.from('direct_messages').insert([newDm]);
    }

    return true;
  };

  // Метод отметки сообщений как прочитанных
  const markDirectMessagesAsRead = async (friendId: string, friendName: string) => {
    if (!currentUser.id) return;
    const myId = currentUser.id;
    const myName = currentUser.username.toLowerCase();
    const friendNameLower = friendName.toLowerCase();

    setDirectMessages((prev) =>
      prev.map((m) => {
        const isForMe = m.receiver_id === myId || m.receiver_name.toLowerCase() === myName;
        const isFromFriend = m.sender_id === friendId || m.sender_name.toLowerCase() === friendNameLower;
        if (isForMe && isFromFriend && !m.is_read) {
          return { ...m, is_read: true };
        }
        return m;
      })
    );

    if (isSupabaseConfigured && supabase) {
      await supabase
        .from('direct_messages')
        .update({ is_read: true })
        .or(`and(receiver_id.eq.${myId},sender_id.eq.${friendId}),and(receiver_name.ilike.${myName},sender_name.ilike.${friendNameLower})`);
    }
  };

  // Метод отправки заявки в друзья по нику
  const sendFriendRequest = async (targetUsername: string): Promise<boolean> => {
    const cleanTarget = targetUsername.trim();
    if (!cleanTarget) {
      showError('Введите никнейм пользователя');
      return false;
    }

    if (!currentUser.id) {
      showError('Войдите в аккаунт, чтобы добавлять друзей');
      return false;
    }

    if (cleanTarget.toLowerCase() === currentUser.username.toLowerCase()) {
      showError('Нельзя отправить заявку самому себе');
      return false;
    }

    let targetUser: { id: string; username: string; avatar_url?: string } | null = null;

    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .ilike('username', cleanTarget)
        .maybeSingle();

      if (data) {
        targetUser = data;
      }
    }

    if (!targetUser) {
      targetUser = accounts.find((a) => a.username.toLowerCase() === cleanTarget.toLowerCase()) || null;
    }

    if (!targetUser) {
      showError(`Пользователь "${cleanTarget}" не найден`);
      return false;
    }

    const targetId = targetUser.id;
    const targetName = targetUser.username;

    const myNameLower = currentUser.username.toLowerCase();
    const targetNameLower = targetName.toLowerCase();

    const existingReq = friendRequests.find(
      (r) =>
        ((r.sender_id === currentUser.id || r.sender_name.toLowerCase() === myNameLower) &&
         (r.receiver_id === targetId || r.receiver_name.toLowerCase() === targetNameLower)) ||
        ((r.sender_id === targetId || r.sender_name.toLowerCase() === targetNameLower) &&
         (r.receiver_id === currentUser.id || r.receiver_name.toLowerCase() === myNameLower))
    );

    if (existingReq && existingReq.status !== 'rejected') {
      if (existingReq.status === 'accepted') {
        showError(`Вы уже дружите с ${targetName}`);
      } else {
        showError(`Заявка пользователю ${targetName} уже отправлена`);
      }
      return false;
    }

    const newReq: FriendRequest = {
      id: `freq-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      sender_id: currentUser.id,
      sender_name: currentUser.username,
      sender_avatar: currentUser.avatar_url,
      receiver_id: targetId,
      receiver_name: targetName,
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    setFriendRequests((prev) => [...prev, newReq]);

    if (isSupabaseConfigured && supabase) {
      await supabase.from('friend_requests').insert([newReq]);
    }

    showSuccess(`Заявка в друзья отправлена пользователю ${targetName}!`);
    return true;
  };

  const acceptFriendRequest = async (requestId: string) => {
    setFriendRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, status: 'accepted' } : r))
    );

    if (isSupabaseConfigured && supabase) {
      await supabase.from('friend_requests').update({ status: 'accepted' }).eq('id', requestId);
    }

    showSuccess('Заявка в друзья принята!');
  };

  const rejectFriendRequest = async (requestId: string) => {
    setFriendRequests((prev) => prev.filter((r) => r.id !== requestId));

    if (isSupabaseConfigured && supabase) {
      await supabase.from('friend_requests').delete().eq('id', requestId);
    }

    showSuccess('Заявка отклонена');
  };

  const removeFriend = async (friendId: string) => {
    setFriendRequests((prev) =>
      prev.filter(
        (r) =>
          !(
            (r.sender_id === currentUser.id && r.receiver_id === friendId) ||
            (r.sender_id === friendId && r.receiver_id === currentUser.id)
          )
      )
    );

    if (isSupabaseConfigured && supabase) {
      await supabase
        .from('friend_requests')
        .delete()
        .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${currentUser.id})`);
    }

    showSuccess('Пользователь удален из друзей');
  };

  // Список друзей
  const myId = currentUser.id;
  const myName = currentUser.username.toLowerCase();

  const friendsList: UserProfile[] = friendRequests
    .filter((r) => {
      if (r.status !== 'accepted') return false;
      const isSender = r.sender_id === myId || r.sender_name.toLowerCase() === myName;
      const isReceiver = r.receiver_id === myId || r.receiver_name.toLowerCase() === myName;
      return isSender || isReceiver;
    })
    .map((r) => {
      const isSender = r.sender_id === myId || r.sender_name.toLowerCase() === myName;
      const friendId = isSender ? r.receiver_id : r.sender_id;
      const friendName = isSender ? r.receiver_name : r.sender_name;
      const friendAvatar =
        (isSender ? undefined : r.sender_avatar) ||
        `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(friendName)}`;

      return {
        id: friendId,
        username: friendName,
        avatar_url: friendAvatar,
        is_online: true,
        status_message: 'В сети',
      };
    });

  // Подсчет непрочитанных личных сообщений
  const unreadDirectCount = directMessages.filter(
    (m) =>
      (m.receiver_id === myId || m.receiver_name.toLowerCase() === myName) &&
      m.sender_id !== myId &&
      !m.is_read
  ).length;

  const joinRoomPresence = async (roomId: string) => {
    if (!currentUser.id) return;
    const targetRoom = rooms.find((r) => r.id === roomId);
    const isOwner = targetRoom?.host_id === currentUser.id;

    const memberObj: RoomMember = {
      id: `mem-${currentUser.id}-${roomId}`,
      room_id: roomId,
      user_id: currentUser.id,
      user_name: currentUser.username,
      user_avatar: currentUser.avatar_url,
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
      await supabase.from('room_members').delete().eq('room_id', roomId).eq('user_id', currentUser.id);
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

  const updateUserProfile = async (updated: Partial<UserProfile>): Promise<boolean> => {
    if (updated.username) {
      const cleanName = updated.username.trim();
      if (cleanName.toLowerCase() !== currentUser.username.toLowerCase()) {
        const isTakenLocal = accounts.some(
          (acc) => acc.id !== currentUser.id && acc.username.toLowerCase() === cleanName.toLowerCase()
        );
        if (isTakenLocal) {
          showError('Имя пользователя уже занято!');
          return false;
        }

        if (isSupabaseConfigured && supabase) {
          const { data } = await supabase
            .from('profiles')
            .select('id, username')
            .ilike('username', cleanName)
            .neq('id', currentUser.id)
            .maybeSingle();

          if (data) {
            showError('Имя пользователя уже занято другим аккаунтом!');
            return false;
          }
        }
      }
    }

    const newProfile = { ...currentUser, ...updated };
    setCurrentUser(newProfile);

    setAccounts((prev) =>
      prev.map((acc) => (acc.id === newProfile.id ? { ...acc, ...updated } : acc))
    );

    if (isSupabaseConfigured && supabase) {
      await supabase.from('profiles').upsert([
        {
          id: newProfile.id,
          username: newProfile.username,
          avatar_url: newProfile.avatar_url,
          status_message: newProfile.status_message,
        },
      ]);
    }

    return true;
  };

  const addRoom = async (newRoom: Room) => {
    const roomWithTimestamp = {
      ...newRoom,
      last_updated_at: new Date().toISOString(),
    };

    setRooms((prev) => [roomWithTimestamp, ...prev]);
    markRoomUnlocked(newRoom.id);

    if (isSupabaseConfigured && supabase) {
      await supabase.from('rooms').insert([roomWithTimestamp]);
    }
  };

  const deleteRoom = async (roomId: string) => {
    setRooms((prev) => prev.filter((r) => r.id !== roomId));

    if (isSupabaseConfigured && supabase) {
      await supabase.from('rooms').delete().eq('id', roomId);
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
      await supabase.from('chat_messages').insert([message]);
    }
  };

  const addQueueItem = async (roomId: string, item: QueueItem) => {
    setQueueByRoom((prev) => ({
      ...prev,
      [roomId]: [...(prev[roomId] || []), item],
    }));

    if (isSupabaseConfigured && supabase) {
      await supabase.from('queue_items').insert([item]);
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
      skip_votes: [],
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

  const voteToSkip = async (roomId: string) => {
    if (!currentUser.id) return;

    const room = rooms.find((r) => r.id === roomId);
    if (!room) return;

    const currentSkipVotes = room.skip_votes || [];
    if (currentSkipVotes.includes(currentUser.id)) {
      showError('Вы уже проголосовали за пропуск!');
      return;
    }

    const updatedVotes = [...currentSkipVotes, currentUser.id];
    const totalMembers = activeMembersByRoom[roomId]?.length || room.member_count || 1;
    const votesNeeded = Math.ceil(totalMembers / 2);

    showSuccess(`Голос за пропуск принят (${updatedVotes.length}/${votesNeeded})`);

    if (updatedVotes.length >= votesNeeded) {
      const roomQueue = queueByRoom[roomId] || [];
      const nextItem = roomQueue.find((i) => i.url !== room.current_media_url);

      if (nextItem) {
        showSuccess(`⏭️ Пропущено большинство! Запуск: ${nextItem.title}`);
        const info = parseMediaUrl(nextItem.url);
        changeRoomMedia(roomId, nextItem.url, nextItem.title, info.thumbnail);
        removeQueueItem(roomId, nextItem.id);
      } else {
        showSuccess('⏭️ Видео пропущено!');
        updateRoomProgress(roomId, 0, false);
      }
    } else {
      setRooms((prev) =>
        prev.map((r) => (r.id === roomId ? { ...r, skip_votes: updatedVotes } : r))
      );
      if (isSupabaseConfigured && supabase) {
        await supabase.from('rooms').update({ skip_votes: updatedVotes }).eq('id', roomId);
      }
    }
  };

  const transferHostRole = async (roomId: string, newHostId: string, newHostName: string, newHostAvatar?: string) => {
    const updatePayload = {
      host_id: newHostId,
      host_name: newHostName,
      ...(newHostAvatar && { host_avatar: newHostAvatar }),
    };

    setRooms((prev) =>
      prev.map((r) => (r.id === roomId ? { ...r, ...updatePayload } : r))
    );

    if (isSupabaseConfigured && supabase) {
      await supabase.from('rooms').update(updatePayload).eq('id', roomId);
    }

    showSuccess(`👑 DJ корона передана пользователю ${newHostName}!`);
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
        voteToSkip,
        transferHostRole,
        friendRequests,
        friendsList,
        sendFriendRequest,
        acceptFriendRequest,
        rejectFriendRequest,
        removeFriend,
        directMessages,
        sendDirectMessage,
        markDirectMessagesAsRead,
        unreadDirectCount,
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