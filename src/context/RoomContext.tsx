import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Room, ChatMessage, QueueItem, UserProfile, RoomMember, RegisteredAccount, FriendRequest } from '@/types/rave';
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
    if (isLoggedIn && currentUser.id) {
      localStorage.setItem('pulserave_logged_user', JSON.stringify(currentUser));
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

    const interval = setInterval(() => {
      fetchRooms();
      fetchMessages();
      fetchQueue();
      fetchMembers();
      fetchFriendRequests();
    }, 2000);

    return () => clearInterval(interval);
  }, [fetchRooms, fetchMessages, fetchQueue, fetchMembers, fetchFriendRequests]);

  useEffect(() => {
    localStorage.setItem('pulserave_rooms', JSON.stringify(rooms));
  }, [rooms]);

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

    // Ищем профиль получателя
    let targetUser: { id: string; username: string; avatar_url?: string } | null = null;

    const localFound = accounts.find((a) => a.username.toLowerCase() === cleanTarget.toLowerCase());
    if (localFound) {
      targetUser = localFound;
    }

    if (!targetUser && isSupabaseConfigured && supabase) {
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
      showError(`Пользователь "${cleanTarget}" не найден`);
      return false;
    }

    // Проверяем, есть ли уже принятая связь или активная заявка
    const existingReq = friendRequests.find(
      (r) =>
        ((r.sender_id === currentUser.id && r.receiver_id === targetUser!.id) ||
         (r.sender_id === targetUser!.id && r.receiver_id === currentUser.id)) &&
        r.status !== 'rejected'
    );

    if (existingReq) {
      if (existingReq.status === 'accepted') {
        showError(`Вы уже дружите с ${targetUser.username}`);
      } else {
        showError(`Заявка пользователю ${targetUser.username} уже отправлена`);
      }
      return false;
    }

    const newReq: FriendRequest = {
      id: `freq-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      sender_id: currentUser.id,
      sender_name: currentUser.username,
      sender_avatar: currentUser.avatar_url,
      receiver_id: targetUser.id,
      receiver_name: targetUser.username,
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    setFriendRequests((prev) => [...prev, newReq]);

    if (isSupabaseConfigured && supabase) {
      await supabase.from('friend_requests').insert([newReq]);
    }

    showSuccess(`Заявка в друзья отправлена пользователю ${targetUser.username}!`);
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

  // Вычисление списка активных друзей пользователя
  const friendsList: UserProfile[] = friendRequests
    .filter((r) => r.status === 'accepted' && (r.sender_id === currentUser.id || r.receiver_id === currentUser.id))
    .map((r) => {
      const friendId = r.sender_id === currentUser.id ? r.receiver_id : r.sender_id;
      const friendName = r.sender_id === currentUser.id ? r.receiver_name : r.sender_name;
      const friendAvatar =
        (r.sender_id === currentUser.id ? undefined : r.sender_avatar) ||
        `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(friendName)}`;

      return {
        id: friendId,
        username: friendName,
        avatar_url: friendAvatar,
        is_online: true,
        status_message: 'В сети',
      };
    });

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
        // Проверка в локальных аккаунтах
        const isTakenLocal = accounts.some(
          (acc) => acc.id !== currentUser.id && acc.username.toLowerCase() === cleanName.toLowerCase()
        );
        if (isTakenLocal) {
          showError('Имя пользователя уже занято!');
          return false;
        }

        // Проверка в базе Supabase
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