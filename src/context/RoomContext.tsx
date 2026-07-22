import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Room, ChatMessage, QueueItem, UserProfile, RoomMember, RegisteredAccount, FriendRequest, DirectMessage } from '@/types/rave';
import { INITIAL_ROOMS, INITIAL_MESSAGES, INITIAL_QUEUE } from '@/data/mockRaveData';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { showSuccess, showError } from '@/utils/toast';

interface RoomContextType {
  currentUser: UserProfile;
  isLoggedIn: boolean;
  registerUser: (username: string, password_hash: string, avatar_url?: string) => Promise<boolean>;
  loginUser: (username: string, password_hash: string) => Promise<boolean>;
  logoutUser: () => void;
  updateUserProfile: (updated: Partial<UserProfile>) => Promise<boolean>;
  clearAllAccountsAndData: () => Promise<void>;
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
  
  // Друзья и ЛС
  friendsList: UserProfile[];
  friendRequests: FriendRequest[];
  directMessages: DirectMessage[];
  sendFriendRequest: (targetUsername: string) => Promise<boolean>;
  acceptFriendRequest: (requestId: string) => Promise<void>;
  rejectFriendRequest: (requestId: string) => Promise<void>;
  sendDirectMessage: (receiverId: string, receiverName: string, text: string) => Promise<void>;
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

  // Друзья и ЛС состояния
  const [friendsList, setFriendsList] = useState<UserProfile[]>(() => {
    const saved = localStorage.getItem('pulserave_friends');
    return saved ? JSON.parse(saved) : [];
  });

  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>(() => {
    const saved = localStorage.getItem('pulserave_friend_reqs');
    return saved ? JSON.parse(saved) : [];
  });

  const [directMessages, setDirectMessages] = useState<DirectMessage[]>(() => {
    const saved = localStorage.getItem('pulserave_direct_msgs');
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
    localStorage.setItem('pulserave_friends', JSON.stringify(friendsList));
  }, [friendsList]);

  useEffect(() => {
    localStorage.setItem('pulserave_friend_reqs', JSON.stringify(friendRequests));
  }, [friendRequests]);

  useEffect(() => {
    localStorage.setItem('pulserave_direct_msgs', JSON.stringify(directMessages));
  }, [directMessages]);

  useEffect(() => {
    if (isLoggedIn && currentUser.username && currentUser.username !== 'Гость') {
      localStorage.setItem('pulserave_logged_user', JSON.stringify(currentUser));
      if (isSupabaseConfigured && supabase) {
        const payload = {
          id: currentUser.id || `usr_${currentUser.username}`,
          username: currentUser.username,
          avatar_url: currentUser.avatar_url,
          status_message: currentUser.status_message || 'В ритме вечеринки 🎧',
        };
        supabase.from('profiles').upsert([payload]).then(({ error }) => {
          if (error) console.error('Profile upsert error:', error);
        });
      }
    } else {
      localStorage.removeItem('pulserave_logged_user');
    }
  }, [currentUser, isLoggedIn]);

  const clearAllAccountsAndData = async () => {
    setAccounts([]);
    setFriendsList([]);
    setFriendRequests([]);
    setDirectMessages([]);
    setIsLoggedIn(false);
    setCurrentUser({
      id: '',
      username: 'Гость',
      avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=guest',
    });

    localStorage.removeItem('pulserave_accounts');
    localStorage.removeItem('pulserave_logged_user');
    localStorage.removeItem('pulserave_friends');
    localStorage.removeItem('pulserave_friend_reqs');
    localStorage.removeItem('pulserave_direct_msgs');

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('profiles').delete().neq('id', 'keep_none');
      } catch (e) {
        console.error('Supabase cleanup error:', e);
      }
    }

    showSuccess('Все аккаунты сброшены!');
  };

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
        showError('Пользователь с таким логином уже зарегистрирован!');
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
        },
      ]);
    }

    showSuccess(`Аккаунт ${cleanName} зарегистрирован!`);
    return true;
  };

  const loginUser = async (username: string, password_hash: string): Promise<boolean> => {
    const cleanName = username.trim();

    let found = accounts.find(
      (a) => a.username.toLowerCase() === cleanName.toLowerCase() && a.password_hash === password_hash
    );

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike('username', cleanName)
        .maybeSingle();

      if (data && !error) {
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
          const idx = prev.findIndex((a) => a.username.toLowerCase() === cleanName.toLowerCase());
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = found!;
            return updated;
          }
          return [...prev, found!];
        });
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
        const isRecent = now - lastActive < 60000;

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

  // Получение друзей, заявок и ЛС с сервера
  const fetchFriendsAndDMs = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase || !currentUser.id) return;

    try {
      // 1. Заявки в друзья
      const myId = currentUser.id;
      const myName = currentUser.username.toLowerCase();

      const { data: reqs } = await supabase
        .from('friend_requests')
        .select('*');

      if (reqs) {
        const relevantReqs = reqs.filter(
          (r: any) =>
            r.sender_id === myId ||
            r.receiver_id === myId ||
            r.sender_name?.toLowerCase() === myName ||
            r.receiver_name?.toLowerCase() === myName
        );
        setFriendRequests(relevantReqs as FriendRequest[]);

        // Собираем список друзей из принятых заявок
        const accepted = relevantReqs.filter((r: any) => r.status === 'accepted');
        const friendUsernames = new Set<string>();

        accepted.forEach((r: any) => {
          if (r.sender_name?.toLowerCase() === myName) {
            friendUsernames.add(r.receiver_name);
          } else {
            friendUsernames.add(r.sender_name);
          }
        });

        if (friendUsernames.size > 0) {
          const { data: profs } = await supabase
            .from('profiles')
            .select('*')
            .in('username', Array.from(friendUsernames));

          if (profs) {
            setFriendsList(profs as UserProfile[]);
          }
        }
      }

      // 2. Личные сообщения
      const { data: dms } = await supabase
        .from('direct_messages')
        .select('*')
        .order('created_at', { ascending: true });

      if (dms) {
        const relevantDMs = dms.filter(
          (m: any) =>
            m.sender_id === myId ||
            m.receiver_id === myId ||
            m.sender_name?.toLowerCase() === myName ||
            m.receiver_name?.toLowerCase() === myName
        );
        setDirectMessages(relevantDMs as DirectMessage[]);
      }
    } catch (err) {
      console.error('Error fetching friends/DMs:', err);
    }
  }, [currentUser.id, currentUser.username]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setIsRoomsLoaded(true);
      return;
    }

    fetchRooms();
    fetchMessages();
    fetchQueue();
    fetchMembers();
    fetchFriendsAndDMs();

    const interval = setInterval(() => {
      fetchRooms();
      fetchMessages();
      fetchQueue();
      fetchMembers();
      fetchFriendsAndDMs();
    }, 1000);

    const channel = supabase
      .channel('pulserave_realtime_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, () => {
        fetchMessages();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_members' }, () => {
        fetchMembers();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, () => {
        fetchRooms();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friend_requests' }, () => {
        fetchFriendsAndDMs();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'direct_messages' }, () => {
        fetchFriendsAndDMs();
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      if (supabase) supabase.removeChannel(channel);
    };
  }, [fetchRooms, fetchMessages, fetchQueue, fetchMembers, fetchFriendsAndDMs]);

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
        changeRoomMedia(roomId, nextItem.url, nextItem.title, nextItem.thumbnail_url);
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

  // Методы управления друзьями
  const sendFriendRequest = async (targetUsername: string): Promise<boolean> => {
    const cleanTarget = targetUsername.trim();
    if (!cleanTarget) return false;

    if (cleanTarget.toLowerCase() === currentUser.username.toLowerCase()) {
      showError('Нельзя добавить самого себя в друзья!');
      return false;
    }

    const isAlready = friendsList.some((f) => f.username.toLowerCase() === cleanTarget.toLowerCase());
    if (isAlready) {
      showError('Этот пользователь уже у вас в друзьях!');
      return false;
    }

    const reqObj: FriendRequest = {
      id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sender_id: currentUser.id,
      sender_name: currentUser.username,
      sender_avatar: currentUser.avatar_url,
      receiver_id: `usr_${cleanTarget}`,
      receiver_name: cleanTarget,
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    setFriendRequests((prev) => [...prev, reqObj]);

    if (isSupabaseConfigured && supabase) {
      await supabase.from('friend_requests').insert([reqObj]);
    }

    showSuccess(`Заявка в друзья отправлена пользователю ${cleanTarget}!`);
    return true;
  };

  const acceptFriendRequest = async (requestId: string) => {
    const req = friendRequests.find((r) => r.id === requestId);
    if (!req) return;

    setFriendRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, status: 'accepted' } : r))
    );

    const friendProfile: UserProfile = {
      id: req.sender_id,
      username: req.sender_name,
      avatar_url: req.sender_avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(req.sender_name)}`,
      is_online: true,
    };

    setFriendsList((prev) => {
      if (prev.some((f) => f.username.toLowerCase() === req.sender_name.toLowerCase())) return prev;
      return [...prev, friendProfile];
    });

    if (isSupabaseConfigured && supabase) {
      await supabase.from('friend_requests').update({ status: 'accepted' }).eq('id', requestId);
    }

    showSuccess(`Заявка от ${req.sender_name} принята!`);
  };

  const rejectFriendRequest = async (requestId: string) => {
    setFriendRequests((prev) => prev.filter((r) => r.id !== requestId));

    if (isSupabaseConfigured && supabase) {
      await supabase.from('friend_requests').delete().eq('id', requestId);
    }

    showSuccess('Заявка отклонена');
  };

  const sendDirectMessage = async (receiverId: string, receiverName: string, text: string) => {
    const dmObj: DirectMessage = {
      id: `dm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sender_id: currentUser.id,
      sender_name: currentUser.username,
      sender_avatar: currentUser.avatar_url,
      receiver_id: receiverId,
      receiver_name: receiverName,
      message: text,
      created_at: new Date().toISOString(),
    };

    setDirectMessages((prev) => [...prev, dmObj]);

    if (isSupabaseConfigured && supabase) {
      await supabase.from('direct_messages').insert([dmObj]);
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
        clearAllAccountsAndData,
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

        friendsList,
        friendRequests,
        directMessages,
        sendFriendRequest,
        acceptFriendRequest,
        rejectFriendRequest,
        sendDirectMessage,
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