import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Users, Share2, MessageSquare, ListMusic, Info, Trash2, Loader2, Lock, KeyRound } from 'lucide-react';
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

type MobileTab = 'chat' | 'queue' | 'members' | 'info';

const RAVE_REACTIONS = ['❤️', '🔥', '😂', '🎉', '💩', '😮'];

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
  
  // Состояния для вкладок
  const [activeMobileTab, setActiveMobileTab] = useState<MobileTab>('chat');
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

  // Непрерывный Heartbeat присутствия пользователя в комнате каждые 8 секунд
  useEffect(() => {
    if (room?.id && isUnlocked) {
      joinRoomPresence(room.id);
      const heartbeatTimer = setInterval(() => {
        joinRoomPresence(room.id);
      }, 8000);

      return () => {
        clearInterval(heartbeatTimer);
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
    }, 2200);
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
              floatingReactions={floatingReactions}
            />
          </div>

          {/* ПАНЕЛЬ ЭМОДЗИ РЕАКЦИЙ ПОД ВИДЕО */}
          <div className="flex items-center justify-center gap-2 p-2 rounded-2xl bg-slate-900/90 border border-purple-900/40 shadow-lg w-full my-0.5">
            <span className="text-[10px] text-purple-300/70 font-semibold uppercase tracking-wider hidden sm:inline mr-1">
              Реакции:
            </span>
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-0.5">
              {RAVE_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleSendReaction(emoji)}
                  className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-slate-950 border border-purple-800/60 hover:bg-pink-600 hover:border-pink-400 hover:scale-125 active:scale-95 text-base sm:text-lg flex items-center justify-center transition-all duration-150 shadow shrink-0"
                  title={`Отправить реакцию ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Панель информации о комнате для ПК */}
          <div className="hidden lg:flex p-3 md:p-4 rounded-2xl border border-purple-900/40 bg-slate-900/80 items-center justify-between gap-3 w-full">
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

        {/* 📱 МОБИЛЬНЫЙ ИНТЕРФЕЙС (Переключатель 4 вкладок) */}
        <div className="lg:hidden flex border-b border-purple-900/40 bg-slate-900/80 rounded-xl p-1 gap-1 my-1 w-full">
          <button
            onClick={() => setActiveMobileTab('chat')}
            className={`flex-1 py-2 text-[11px] font-semibold rounded-lg flex items-center justify-center gap-1 transition-all ${
              activeMobileTab === 'chat'
                ? 'bg-purple-700 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Чат ({roomMessages.length})</span>
          </button>

          <button
            onClick={() => setActiveMobileTab('queue')}
            className={`flex-1 py-2 text-[11px] font-semibold rounded-lg flex items-center justify-center gap-1 transition-all ${
              activeMobileTab === 'queue'
                ? 'bg-purple-700 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ListMusic className="h-3.5 w-3.5" />
            <span>Очередь ({roomQueue.length})</span>
          </button>

          <button
            onClick={() => setActiveMobileTab('members')}
            className={`flex-1 py-2 text-[11px] font-semibold rounded-lg flex items-center justify-center gap-1 transition-all ${
              activeMobileTab === 'members'
                ? 'bg-purple-700 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="h-3.5 w-3.5 text-cyan-400" />
            <span>Люди ({roomMembers.length})</span>
          </button>

          <button
            onClick={() => setActiveMobileTab('info')}
            className={`flex-1 py-2 text-[11px] font-semibold rounded-lg flex items-center justify-center gap-1 transition-all ${
              activeMobileTab === 'info'
                ? 'bg-purple-700 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Info className="h-3.5 w-3.5" />
            <span>Инфо</span>
          </button>
        </div>

        {/* 📱 МОБИЛЬНЫЙ КОНТЕНТ ВКЛАДОК */}
        <div className="lg:hidden flex flex-col h-[480px] w-full">
          {activeMobileTab === 'chat' && (
            <RoomChat
              messages={roomMessages}
              onSendMessage={handleSendMessage}
              floatingReactions={floatingReactions}
            />
          )}

          {activeMobileTab === 'queue' && (
            <RoomQueue
              queue={roomQueue}
              currentMediaUrl={room.current_media_url}
              onAddQueueItem={handleAddQueueItem}
              onVoteItem={handleVoteItem}
              onPlayNow={handlePlayQueueItem}
              isHost={isHost}
            />
          )}

          {activeMobileTab === 'members' && (
            <RoomMembersList members={roomMembers} hostId={room.host_id} />
          )}

          {activeMobileTab === 'info' && (
            <div className="p-4 rounded-2xl border border-purple-900/40 bg-slate-900/90 space-y-3 w-full">
              <div>
                <h3 className="font-bold text-sm text-slate-100">{room.title}</h3>
                <p className="text-xs text-slate-400 mt-1">{room.description || 'Описание отсутствует.'}</p>
              </div>
              <div className="pt-2 border-t border-purple-950 flex items-center justify-between text-xs text-purple-300">
                <span className="flex items-center gap-1.5 font-bold">
                  <Users className="h-3.5 w-3.5 text-cyan-400" /> {roomMembers.length} зрителей онлайн
                </span>
                <span className="text-pink-400 font-medium">Владелец: {room.host_name}</span>
              </div>
            </div>
          )}
        </div>

        {/* 💻 ИНТЕРФЕЙС ТОЛЬКО ДЛЯ ПК (Правая боковая панель) */}
        <div className="hidden lg:flex lg:col-span-5 xl:col-span-4 flex-col h-[600px] w-full rounded-2xl border border-purple-900/40 bg-slate-900/95 overflow-hidden shadow-2xl">
          <Tabs value={sidebarTab} onValueChange={(val: any) => setSidebarTab(val)} className="flex flex-col h-full w-full min-h-0">
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

            <TabsContent
              value="chat"
              className="m-0 p-0 focus-visible:outline-none flex-1 min-h-0 h-full data-[state=active]:flex data-[state=active]:flex-col"
            >
              <RoomChat
                messages={roomMessages}
                onSendMessage={handleSendMessage}
                floatingReactions={floatingReactions}
              />
            </TabsContent>

            <TabsContent
              value="queue"
              className="m-0 p-0 focus-visible:outline-none flex-1 min-h-0 h-full data-[state=active]:flex data-[state=active]:flex-col"
            >
              <RoomQueue
                queue={roomQueue}
                currentMediaUrl={room.current_media_url}
                onAddQueueItem={handleAddQueueItem}
                onVoteItem={handleVoteItem}
                onPlayNow={handlePlayQueueItem}
                isHost={isHost}
              />
            </TabsContent>

            <TabsContent
              value="members"
              className="m-0 p-0 focus-visible:outline-none flex-1 min-h-0 h-full data-[state=active]:flex data-[state=active]:flex-col"
            >
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
</dyad-file>

<dyad-write path="src/components/FriendsDrawer.tsx" description="Улучшено отображение списков заявок и разделение взаимных заявок">
import React, { useState } from 'react';
import { Users, UserPlus, Send, Check, X, Trash2, Clock, WifiOff, MessageSquare } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRooms } from '@/context/RoomContext';
import { isSupabaseConfigured } from '@/lib/supabase';
import { showSuccess } from '@/utils/toast';
import { DirectChatModal } from '@/components/DirectChatModal';
import { UserProfile } from '@/types/rave';

interface FriendsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FriendsDrawer: React.FC<FriendsDrawerProps> = ({ isOpen, onClose }) => {
  const {
    currentUser,
    friendsList,
    friendRequests,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
  } = useRooms();

  const [targetUsername, setTargetUsername] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [chatFriend, setChatFriend] = useState<UserProfile | null>(null);
  const [isDirectChatOpen, setIsDirectChatOpen] = useState(false);

  const myId = currentUser.id || '';
  const myName = (currentUser.username || '').toLowerCase();

  // Исключаем из списков заявок уже добавленных друзей
  const acceptedFriendNames = new Set(friendsList.map((f) => f.username.toLowerCase()));

  // Фильтруем входящие заявки
  const incomingRequests = friendRequests.filter((r) => {
    if (!r || r.status !== 'pending') return false;
    const rId = r.receiver_id || '';
    const rName = (r.receiver_name || '').toLowerCase();
    const sId = r.sender_id || '';
    const sName = (r.sender_name || '').toLowerCase();

    if (acceptedFriendNames.has(sName)) return false;

    const isForMe = (myId && rId === myId) || (myName && rName === myName);
    const isFromMe = (myId && sId === myId) || (myName && sName === myName);

    return isForMe && !isFromMe;
  });

  // Фильтруем исходящие заявки
  const outgoingRequests = friendRequests.filter((r) => {
    if (!r || r.status !== 'pending') return false;
    const sId = r.sender_id || '';
    const sName = (r.sender_name || '').toLowerCase();
    const rName = (r.receiver_name || '').toLowerCase();

    if (acceptedFriendNames.has(rName)) return false;

    const isFromMe = (myId && sId === myId) || (myName && sName === myName);
    return isFromMe;
  });

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUsername.trim()) return;

    setIsSending(true);
    const success = await sendFriendRequest(targetUsername.trim());
    setIsSending(false);

    if (success) {
      setTargetUsername('');
    }
  };

  const handleOpenChatWithFriend = (friend: UserProfile) => {
    setChatFriend(friend);
    setIsDirectChatOpen(true);
  };

  const handleShareLink = () => {
    navigator.clipboard.writeText(window.location.origin);
    showSuccess('Ссылка на PULSERAVE скопирована в буфер обмена!');
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent className="bg-slate-900 text-slate-100 border-purple-900/60 w-full sm:max-w-sm flex flex-col p-4">
          <SheetHeader className="pb-3 border-b border-purple-900/40 shrink-0">
            <SheetTitle className="text-base font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 flex items-center gap-2">
              <Users className="h-4 w-4 text-pink-500" /> Друзья и заявки
            </SheetTitle>
            <SheetDescription className="text-slate-400 text-xs">
              Добавляйте друзей по нику и отправляйте им личные сообщения.
            </SheetDescription>
          </SheetHeader>

          {!isSupabaseConfigured && (
            <div className="bg-amber-950/60 border border-amber-500/40 p-2 rounded-xl text-[11px] text-amber-200 mt-2 flex items-center gap-2">
              <WifiOff className="h-4 w-4 text-amber-400 shrink-0" />
              <span>Для синхронизации между ПК и телефоном подключите Supabase.</span>
            </div>
          )}

          {/* Форма отправки заявки по нику */}
          <form onSubmit={handleAddSubmit} className="pt-3 pb-2 border-b border-purple-900/30 flex gap-2 shrink-0">
            <Input
              placeholder="Никнейм пользователя..."
              value={targetUsername}
              onChange={(e) => setTargetUsername(e.target.value)}
              className="bg-slate-950 border-purple-900/60 text-xs text-slate-100 placeholder:text-slate-500 h-9 rounded-xl focus:border-pink-500"
            />
            <Button
              type="submit"
              disabled={isSending}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 to-pink-500 text-white text-xs h-9 px-3 rounded-xl font-bold shrink-0 gap-1"
            >
              <UserPlus className="h-3.5 w-3.5" /> Добавить
            </Button>
          </form>

          <ScrollArea className="flex-1 pr-1 py-2">
            <div className="space-y-4">
              {/* Секция: Входящие заявки */}
              {incomingRequests.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-pink-400 flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> Входящие заявки ({incomingRequests.length})
                  </span>

                  <div className="space-y-2">
                    {incomingRequests.map((req) => (
                      <div
                        key={req.id}
                        className="p-3 rounded-2xl bg-purple-950/80 border-2 border-pink-500/60 flex flex-col gap-2.5 shadow-xl shadow-pink-500/10"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={req.sender_avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(req.sender_name)}`}
                            alt={req.sender_name}
                            className="h-9 w-9 rounded-full object-cover shrink-0 ring-2 ring-pink-500"
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-white truncate">{req.sender_name}</p>
                            <p className="text-[10px] text-pink-300 font-medium">Хочет добавиться в друзья</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-1 border-t border-purple-900/50">
                          <Button
                            onClick={() => acceptFriendRequest(req.id)}
                            size="sm"
                            className="flex-1 h-8 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl gap-1.5 shadow-md shadow-emerald-600/30"
                          >
                            <Check className="h-4 w-4 stroke-[3]" />
                            <span>Принять</span>
                          </Button>
                          <Button
                            onClick={() => rejectFriendRequest(req.id)}
                            size="sm"
                            variant="ghost"
                            className="h-8 px-3 text-slate-400 hover:text-red-400 hover:bg-red-950/50 text-xs rounded-xl gap-1"
                          >
                            <X className="h-3.5 w-3.5" />
                            <span>Отклонить</span>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Секция: Исходящие заявки */}
              {outgoingRequests.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Отправленные заявки ({outgoingRequests.length})
                  </span>
                  {outgoingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-2 rounded-lg bg-slate-950/40 border border-purple-950 flex items-center justify-between text-xs text-slate-400"
                    >
                      <span>Заявка для <strong className="text-slate-200">{req.receiver_name}</strong></span>
                      <span className="text-[10px] text-amber-400 font-medium">Ожидает ответа</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Секция: Список друзей */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase text-slate-300 tracking-wider">
                    Мои друзья ({friendsList.length})
                  </span>
                  <Button
                    onClick={handleShareLink}
                    size="sm"
                    variant="ghost"
                    className="h-6 text-[10px] text-purple-300 hover:bg-purple-950 px-2"
                  >
                    Ссылка
                  </Button>
                </div>

                {friendsList.length === 0 ? (
                  <div className="text-center py-8 px-2 space-y-2 bg-slate-950/50 rounded-2xl border border-purple-950">
                    <Users className="h-7 w-7 text-purple-500/40 mx-auto" />
                    <p className="text-xs text-slate-300 font-medium">У вас пока нет друзей</p>
                    <p className="text-[11px] text-slate-500">
                      Введите логин друга в поле выше, чтобы отправить заявку!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {friendsList.map((friend) => (
                      <div
                        key={friend.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/70 border border-purple-950 hover:border-purple-800/40 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="relative shrink-0">
                            <img
                              src={friend.avatar_url}
                              alt={friend.username}
                              className="h-8 w-8 rounded-full object-cover"
                            />
                            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-950" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-200 truncate">{friend.username}</p>
                            <p className="text-[10px] text-emerald-400 font-mono">В сети</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            onClick={() => handleOpenChatWithFriend(friend)}
                            size="sm"
                            className="h-7 text-[11px] px-2 bg-purple-700 hover:bg-purple-600 text-white rounded-lg gap-1 font-semibold"
                            title="Открыть личные сообщения"
                          >
                            <MessageSquare className="h-3 w-3" /> ЛС
                          </Button>
                          <Button
                            onClick={() => removeFriend(friend.id)}
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-slate-500 hover:text-red-400 hover:bg-red-950/30 rounded-lg"
                            title="Удалить из друзей"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <DirectChatModal
        isOpen={isDirectChatOpen}
        onClose={() => setIsDirectChatOpen(false)}
        selectedFriend={chatFriend}
      />
    </>
  );
};