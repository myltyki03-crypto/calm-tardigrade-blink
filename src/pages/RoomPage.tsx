import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Users, Share2, MessageSquare, ListMusic, Trash2, Loader2, Lock, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Navbar } from '@/components/Navbar';
import { MediaPlayer } from '@/components/MediaPlayer';
import { RoomChat } from '@/components/RoomChat';
import { RoomQueue } from '@/components/RoomQueue';
import { RoomMembersList } from '@/components/RoomMembersList';
import { FriendsDrawer } from '@/components/FriendsDrawer';
import { SqlSchemaDialog } from '@/components/SqlSchemaDialog';
import { CreateRoomModal } from '@/components/CreateRoomModal';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { ChatMessage, QueueItem, Room, RoomMember } from '@/types/rave';
import { useRooms } from '@/context/RoomContext';
import { showSuccess, showError } from '@/utils/toast';

const extractYouTubeDetails = (url: string) => {
  let videoId = '4xDzrJKXOOY';
  if (url.includes('youtube.com/watch?v=')) {
    videoId = url.split('v=')[1]?.split('&')[0] || videoId;
  } else if (url.includes('youtu.be/')) {
    videoId = url.split('youtu.be/')[1]?.split('?')[0] || videoId;
  }
  return {
    videoId,
    thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
  };
};

export const RoomPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    currentUser,
    getRoomById,
    fetchRoomDirectly,
    isRoomsLoaded,
    messagesByRoom,
    sendMessage,
    queueByRoom,
    addQueueItem,
    voteQueueItem,
    changeRoomMedia,
    deleteRoom,
    activeMembersByRoom,
    joinRoomPresence,
    leaveRoomPresence,
    unlockedRoomIds,
    markRoomUnlocked,
  } = useRooms();

  const [directRoom, setDirectRoom] = useState<Room | null>(null);
  const [isFetchingDirect, setIsFetchingDirect] = useState<boolean>(true);
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [directPassword, setDirectPassword] = useState('');
  const [sidebarTab, setSidebarTab] = useState<'chat' | 'queue' | 'members'>('chat');

  const room = (id ? getRoomById(id) : undefined) || directRoom || undefined;

  useEffect(() => {
    let isMounted = true;
    if (id && !getRoomById(id)) {
      setIsFetchingDirect(true);
      fetchRoomDirectly(id).then((found) => {
        if (isMounted) {
          if (found) setDirectRoom(found);
          setIsFetchingDirect(false);
        }
      });
    } else {
      setIsFetchingDirect(false);
    }
    return () => {
      isMounted = false;
    };
  }, [id, isRoomsLoaded]);

  const isHost = room?.host_id === currentUser.id;
  const isNavUnlocked = location.state?.unlocked || (room ? unlockedRoomIds.includes(room.id) : false);

  useEffect(() => {
    if (room) {
      if (!room.is_private || !room.access_code || isHost || isNavUnlocked) {
        setIsUnlocked(true);
      }
    }
  }, [room, isHost, isNavUnlocked]);

  useEffect(() => {
    if (room?.id && isUnlocked) {
      joinRoomPresence(room.id);
      return () => {
        leaveRoomPresence(room.id);
      };
    }
  }, [room?.id, isUnlocked]);

  const [floatingReactions, setFloatingReactions] = useState<{ id: string; emoji: string; x: number }[]>([]);
  const [isFriendsDrawerOpen, setIsFriendsDrawerOpen] = useState(false);
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  if (!isRoomsLoaded || isFetchingDirect) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 space-y-3">
        <Loader2 className="h-8 w-8 text-pink-500 animate-spin" />
        <p className="text-slate-400 text-xs font-medium">Подключение к комнате просмотра...</p>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 text-center">
        <Lock className="h-10 w-10 text-amber-400 mb-2" />
        <h2 className="text-xl font-bold mb-1">Комната не найдена</h2>
        <p className="text-slate-400 text-xs mb-4 max-w-sm">
          Запрошенная комната не существует или была удалена.
        </p>
        <Button onClick={() => navigate('/')} className="bg-purple-600 hover:bg-purple-500 text-xs">
          Вернуться на главную
        </Button>
      </div>
    );
  }

  if (room.is_private && room.access_code && !isHost && !isUnlocked) {
    const handleDirectPassSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (directPassword.trim() === room.access_code?.trim()) {
        showSuccess('Пароль верный!');
        markRoomUnlocked(room.id);
        setIsUnlocked(true);
      } else {
        showError('Неверный пароль!');
      }
    };

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-amber-500/40 p-6 rounded-3xl shadow-2xl space-y-4 text-center">
          <div className="h-12 w-12 rounded-2xl bg-amber-950/80 border border-amber-500/40 flex items-center justify-center mx-auto text-amber-400">
            <Lock className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-white">Приватная комната</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Комната <strong className="text-slate-200">"{room.title}"</strong> защищена паролем.
          </p>

          <form onSubmit={handleDirectPassSubmit} className="space-y-3 pt-2 text-left" autoComplete="off">
            <div>
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1 mb-1">
                <KeyRound className="h-3.5 w-3.5 text-amber-400" /> Введите пароль
              </label>
              <Input
                type="text"
                name="direct_room_pass"
                autoComplete="off"
                data-lpignore="true"
                placeholder="Пароль..."
                value={directPassword}
                onChange={(e) => setDirectPassword(e.target.value)}
                className="bg-slate-950 border-amber-500/40 text-amber-200 text-xs font-mono [text-security:disc] [-webkit-text-security:disc]"
                required
                autoFocus
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs h-9 rounded-xl"
            >
              Войти в комнату
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate('/')}
              className="w-full text-slate-400 text-xs h-8"
            >
              Вернуться назад
            </Button>
          </form>
        </div>
      </div>
    );
  }

  const roomMessages = messagesByRoom[room.id] || [];
  const roomQueue = queueByRoom[room.id] || [];
  
  const rawMembers = activeMembersByRoom[room.id] || [];
  const hasMe = rawMembers.some((m) => m.user_id === currentUser.id);
  const meMember: RoomMember = {
    id: `mem-${currentUser.id}-${room.id}`,
    room_id: room.id,
    user_id: currentUser.id,
    user_name: currentUser.username,
    user_avatar: currentUser.avatar_url,
    role: currentUser.id === room.host_id ? 'host' : 'listener',
    joined_at: new Date().toISOString(),
  };

  let combined = hasMe ? [...rawMembers] : [meMember, ...rawMembers];

  const hasHost = combined.some((m) => m.user_id === room.host_id);
  if (!hasHost) {
    const hostMember: RoomMember = {
      id: `mem-${room.host_id}-${room.id}`,
      room_id: room.id,
      user_id: room.host_id,
      user_name: room.host_name,
      user_avatar: room.host_avatar,
      role: 'host',
      joined_at: new Date().toISOString(),
    };
    combined.unshift(hostMember);
  }

  const roomMembers = combined
    .map((m) => {
      if (m.user_id === room.host_id) {
        return {
          ...m,
          user_name: room.host_name || m.user_name,
          user_avatar: room.host_avatar || m.user_avatar,
          role: 'host' as const,
        };
      }
      if (m.user_id === currentUser.id) {
        return {
          ...m,
          user_name: currentUser.username || m.user_name,
          user_avatar: currentUser.avatar_url || m.user_avatar,
        };
      }
      return m;
    })
    .sort((a, b) => {
      if (a.user_id === room.host_id) return -1;
      if (b.user_id === room.host_id) return 1;
      return 0;
    });

  const handleDeleteRoomConfirm = () => {
    if (!isHost) {
      showError('Только владелец комнаты может ее удалить!');
      return;
    }
    deleteRoom(room.id);
    showSuccess('Комната удалена');
    navigate('/');
  };

  const handleSendReaction = (emoji: string) => {
    const reactionObj = {
      id: Math.random().toString(),
      emoji,
      x: Math.floor(Math.random() * 80) + 10,
    };
    setFloatingReactions((prev) => [...prev, reactionObj]);
    setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((r) => r.id !== reactionObj.id));
    }, 2000);
  };

  const handleSendMessage = (text: string) => {
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      room_id: room.id,
      user_id: currentUser.id,
      user_name: currentUser.username,
      user_avatar: currentUser.avatar_url,
      message: text,
      type: 'chat',
      created_at: new Date().toISOString(),
    };
    sendMessage(room.id, newMsg);
  };

  const handleAddQueueItem = (url: string) => {
    const ytDetails = extractYouTubeDetails(url);
    const newItem: QueueItem = {
      id: `q-${Date.now()}`,
      room_id: room.id,
      title: `YouTube Видео (${ytDetails.videoId})`,
      url: url,
      thumbnail_url: ytDetails.thumbnail,
      duration_seconds: 240,
      added_by_name: currentUser.username,
      votes: 1,
      created_at: new Date().toISOString(),
    };
    addQueueItem(room.id, newItem);
  };

  const handleVoteItem = (itemId: string) => {
    voteQueueItem(room.id, itemId);
  };

  const handlePlayQueueItem = (item: QueueItem) => {
    if (!isHost) {
      showError('Только владелец комнаты может переключать видео');
      return;
    }
    const ytDetails = extractYouTubeDetails(item.url);
    changeRoomMedia(room.id, item.url, item.title, ytDetails.thumbnail);
    showSuccess(`Играет: ${item.title}`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-20 md:pb-0 w-full overflow-x-hidden">
      <Navbar
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
        onOpenFriendsDrawer={() => setIsFriendsDrawerOpen(true)}
        onOpenSqlModal={() => setIsSqlModalOpen(true)}
      />

      <main className="w-full flex-1 p-2 md:p-4 grid grid-cols-1 lg:grid-cols-12 gap-3 md:gap-4 max-w-7xl mx-auto">
        {/* Левая колонка - Видео и Инфо о комнате */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-2 md:gap-3 w-full">
          <div className="flex items-center justify-between px-1 w-full">
            <Button
              onClick={() => navigate('/')}
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-white gap-1 text-xs px-2 h-7"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> На главную
            </Button>

            <div className="flex items-center gap-1.5">
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  showSuccess('Ссылка на комнату скопирована!');
                }}
                size="sm"
                variant="outline"
                className="border-purple-800 text-purple-300 hover:bg-purple-950 text-[11px] h-7 gap-1"
              >
                <Share2 className="h-3 w-3 text-pink-400" /> Ссылка
              </Button>

              {isHost && (
                <Button
                  onClick={() => setIsDeleteDialogOpen(true)}
                  size="sm"
                  variant="destructive"
                  className="bg-red-600/80 hover:bg-red-600 text-white text-[11px] h-7 gap-1 font-semibold"
                  title="Удалить комнату"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Удалить
                </Button>
              )}
            </div>
          </div>

          <div className="bg-slate-950 rounded-2xl w-full">
            <MediaPlayer
              room={room}
              isHost={isHost}
              onSendReaction={handleSendReaction}
            />
          </div>

          <div className="p-3 md:p-4 rounded-2xl border border-purple-900/40 bg-slate-900/80 flex items-center justify-between gap-3 w-full">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base md:text-lg font-bold text-slate-100">{room.title}</h2>
                {room.is_private && (
                  <span className="bg-amber-950/80 text-amber-300 border border-amber-500/40 text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold">
                    <Lock className="h-3 w-3" /> По паролю
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Владелец: <span className="text-pink-400 font-medium">{room.host_name}</span> {room.description ? `• ${room.description}` : ''}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="flex items-center gap-1.5 text-xs bg-purple-950/80 border border-purple-800/40 text-purple-300 px-3 py-1 rounded-full font-bold">
                <Users className="h-3.5 w-3.5 text-cyan-400" /> {roomMembers.length} зрителей
              </span>
            </div>
          </div>
        </div>

        {/* Правая колонка - Боковая панель со вкладками (Чат / Очередь / Участники) */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col h-[520px] lg:h-[600px] w-full rounded-2xl border border-purple-900/40 bg-slate-900/95 overflow-hidden shadow-2xl">
          <Tabs value={sidebarTab} onValueChange={(val: any) => setSidebarTab(val)} className="flex flex-col h-full w-full">
            <TabsList className="grid grid-cols-3 bg-slate-950 p-1 border-b border-purple-900/40 rounded-none shrink-0 h-11">
              <TabsTrigger
                value="chat"
                className="text-xs font-semibold data-[state=active]:bg-purple-800 data-[state=active]:text-white rounded-lg flex items-center gap-1"
              >
                <MessageSquare className="h-3.5 w-3.5 text-pink-400" /> Чат ({roomMessages.length})
              </TabsTrigger>
              <TabsTrigger
                value="queue"
                className="text-xs font-semibold data-[state=active]:bg-purple-800 data-[state=active]:text-white rounded-lg flex items-center gap-1"
              >
                <ListMusic className="h-3.5 w-3.5 text-purple-300" /> Очередь
              </TabsTrigger>
              <TabsTrigger
                value="members"
                className="text-xs font-semibold data-[state=active]:bg-purple-800 data-[state=active]:text-white rounded-lg flex items-center gap-1"
              >
                <Users className="h-3.5 w-3.5 text-cyan-400" /> Люди ({roomMembers.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="chat" className="flex-1 min-h-0 m-0 p-0 focus-visible:outline-none flex flex-col">
              <RoomChat
                messages={roomMessages}
                onSendMessage={handleSendMessage}
                floatingReactions={floatingReactions}
              />
            </TabsContent>

            <TabsContent value="queue" className="flex-1 min-h-0 m-0 p-0 focus-visible:outline-none flex flex-col">
              <RoomQueue
                queue={roomQueue}
                currentMediaUrl={room.current_media_url}
                onAddQueueItem={handleAddQueueItem}
                onVoteItem={handleVoteItem}
                onPlayNow={handlePlayQueueItem}
                isHost={isHost}
              />
            </TabsContent>

            <TabsContent value="members" className="flex-1 min-h-0 m-0 p-0 focus-visible:outline-none flex flex-col">
              <RoomMembersList members={roomMembers} hostId={room.host_id} />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="bg-slate-900 text-slate-100 border-purple-900/60 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-red-400 flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> Удалить эту комнату?
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs mt-1">
              Вы владелец этой комнаты. Если вы удалите её, трансляция и чат будут закрыты для всех зрителей.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-4 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              className="border-slate-800 text-slate-300 hover:bg-slate-800 text-xs"
            >
              Отмена
            </Button>
            <Button
              type="button"
              onClick={handleDeleteRoomConfirm}
              className="bg-red-600 hover:bg-red-500 text-white font-semibold text-xs"
            >
              Да, удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MobileBottomNav
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
        onOpenFriendsDrawer={() => setIsFriendsDrawerOpen(true)}
      />

      <FriendsDrawer
        isOpen={isFriendsDrawerOpen}
        onClose={() => setIsFriendsDrawerOpen(false)}
      />
      <SqlSchemaDialog
        isOpen={isSqlModalOpen}
        onClose={() => setIsSqlModalOpen(false)}
      />
      <CreateRoomModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
};