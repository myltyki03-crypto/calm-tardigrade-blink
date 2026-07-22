import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Share2, MessageSquare, ListMusic, Info, Video, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Navbar } from '@/components/Navbar';
import { MediaPlayer } from '@/components/MediaPlayer';
import { RoomChat } from '@/components/RoomChat';
import { RoomQueue } from '@/components/RoomQueue';
import { FriendsDrawer } from '@/components/FriendsDrawer';
import { SqlSchemaDialog } from '@/components/SqlSchemaDialog';
import { CreateRoomModal } from '@/components/CreateRoomModal';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { CURRENT_USER } from '@/data/mockRaveData';
import { ChatMessage, QueueItem } from '@/types/rave';
import { useRooms } from '@/context/RoomContext';
import { showSuccess } from '@/utils/toast';

type MobileTab = 'chat' | 'queue' | 'info';

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
  const {
    getRoomById,
    messagesByRoom,
    sendMessage,
    queueByRoom,
    addQueueItem,
    voteQueueItem,
    changeRoomMedia,
    removeQueueItem,
    deleteRoom,
  } = useRooms();

  const room = id ? getRoomById(id) : undefined;

  const [activeMobileTab, setActiveMobileTab] = useState<MobileTab>('chat');
  const [floatingReactions, setFloatingReactions] = useState<{ id: string; emoji: string; x: number }[]>([]);
  const [isFriendsDrawerOpen, setIsFriendsDrawerOpen] = useState(false);
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Switch video modal
  const [isChangeMediaOpen, setIsChangeMediaOpen] = useState(false);
  const [newMediaUrl, setNewMediaUrl] = useState('');

  if (!room) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
        <h2 className="text-xl font-bold mb-2">Room not found</h2>
        <p className="text-slate-400 text-xs mb-4">The party room you are looking for does not exist or has ended.</p>
        <Button onClick={() => navigate('/')} className="bg-purple-600 hover:bg-purple-500 text-xs">
          Back to Party List
        </Button>
      </div>
    );
  }

  const isHost = room.host_id === CURRENT_USER.id;
  const roomMessages = messagesByRoom[room.id] || [];
  const roomQueue = queueByRoom[room.id] || [];

  const handleDeleteRoomConfirm = () => {
    deleteRoom(room.id);
    showSuccess('Party Room Deleted');
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
      id: `msg-${Date.now()}`,
      room_id: room.id,
      user_id: CURRENT_USER.id,
      user_name: CURRENT_USER.username,
      user_avatar: CURRENT_USER.avatar_url,
      message: text,
      type: 'chat',
      created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    sendMessage(room.id, newMsg);
  };

  const handleAddQueueItem = (url: string) => {
    const ytDetails = extractYouTubeDetails(url);
    const newItem: QueueItem = {
      id: `q-${Date.now()}`,
      room_id: room.id,
      title: `YouTube Video (${ytDetails.videoId})`,
      url: url,
      thumbnail_url: ytDetails.thumbnail,
      duration_seconds: 240,
      added_by_name: CURRENT_USER.username,
      votes: 1,
      created_at: new Date().toISOString(),
    };
    addQueueItem(room.id, newItem);
  };

  const handleVoteItem = (itemId: string) => {
    voteQueueItem(room.id, itemId);
  };

  const handlePlayQueueItem = (item: QueueItem) => {
    const ytDetails = extractYouTubeDetails(item.url);
    changeRoomMedia(room.id, item.url, item.title, ytDetails.thumbnail);
    removeQueueItem(room.id, item.id);
    showSuccess(`Now playing: ${item.title}`);
  };

  const handleChangeMediaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMediaUrl.trim()) return;
    const ytDetails = extractYouTubeDetails(newMediaUrl);
    changeRoomMedia(room.id, newMediaUrl.trim(), `YouTube Video (${ytDetails.videoId})`, ytDetails.thumbnail);
    setNewMediaUrl('');
    setIsChangeMediaOpen(false);
    showSuccess('Video switched successfully!');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-16 md:pb-0">
      <Navbar
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
        onOpenFriendsDrawer={() => setIsFriendsDrawerOpen(true)}
        onOpenSqlModal={() => setIsSqlModalOpen(true)}
      />

      <main className="container mx-auto flex-1 p-2 md:p-4 grid grid-cols-1 lg:grid-cols-12 gap-3 md:gap-4">
        {/* Left Column: Player & Room Info */}
        <div className="lg:col-span-8 flex flex-col gap-2 md:gap-4">
          <div className="flex items-center justify-between px-1">
            <Button
              onClick={() => navigate('/')}
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-white gap-1 text-xs px-2 h-7"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </Button>

            <div className="flex items-center gap-1.5">
              <Button
                onClick={() => setIsChangeMediaOpen(true)}
                size="sm"
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-[11px] h-7 gap-1"
              >
                <Video className="h-3.5 w-3.5" /> Change Video
              </Button>

              <Button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  showSuccess('Room link copied!');
                }}
                size="sm"
                variant="outline"
                className="border-purple-800 text-purple-300 hover:bg-purple-950 text-[11px] h-7 gap-1"
              >
                <Share2 className="h-3 w-3 text-pink-400" /> Share
              </Button>

              {/* Delete Room Button (Host Only) */}
              {isHost && (
                <Button
                  onClick={() => setIsDeleteDialogOpen(true)}
                  size="sm"
                  variant="destructive"
                  className="bg-red-600/80 hover:bg-red-600 text-white text-[11px] h-7 gap-1"
                  title="Delete Room"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </Button>
              )}
            </div>
          </div>

          {/* Synchronized Player Sticky Container for Mobile */}
          <div className="sticky top-14 z-30 lg:relative lg:top-0 bg-slate-950 rounded-2xl">
            <MediaPlayer
              room={room}
              isHost={isHost}
              onSendReaction={handleSendReaction}
            />
          </div>

          {/* Desktop Info Box */}
          <div className="hidden lg:flex p-4 rounded-2xl border border-purple-900/40 bg-slate-900/80 items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-100">{room.title}</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Hosted by <span className="text-pink-400 font-medium">{room.host_name}</span> {room.description ? `• ${room.description}` : ''}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs bg-purple-950/80 border border-purple-800/40 text-purple-300 px-3 py-1 rounded-full">
                <Users className="h-3.5 w-3.5 text-cyan-400" /> {room.member_count} Listening
              </span>
            </div>
          </div>
        </div>

        {/* Mobile View Tab Selector */}
        <div className="lg:hidden flex border-b border-purple-900/40 bg-slate-900/80 rounded-xl p-1 gap-1 my-1">
          <button
            onClick={() => setActiveMobileTab('chat')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeMobileTab === 'chat'
                ? 'bg-purple-700 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Chat ({roomMessages.length})</span>
          </button>

          <button
            onClick={() => setActiveMobileTab('queue')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeMobileTab === 'queue'
                ? 'bg-purple-700 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ListMusic className="h-3.5 w-3.5" />
            <span>Queue ({roomQueue.length})</span>
          </button>

          <button
            onClick={() => setActiveMobileTab('info')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeMobileTab === 'info'
                ? 'bg-purple-700 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Info className="h-3.5 w-3.5" />
            <span>Info</span>
          </button>
        </div>

        {/* Right Column / Mobile Active Tab View */}
        <div className="lg:col-span-4 flex flex-col gap-3 h-[420px] lg:h-auto">
          {/* Mobile Info View */}
          {activeMobileTab === 'info' && (
            <div className="lg:hidden p-4 rounded-2xl border border-purple-900/40 bg-slate-900/90 space-y-3">
              <div>
                <h3 className="font-bold text-sm text-slate-100">{room.title}</h3>
                <p className="text-xs text-slate-400 mt-1">{room.description || 'No description provided.'}</p>
              </div>
              <div className="pt-2 border-t border-purple-950 flex items-center justify-between text-xs text-purple-300">
                <span className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-cyan-400" /> {room.member_count} active listeners
                </span>
                <span className="text-pink-400 font-medium">Host: {room.host_name}</span>
              </div>
            </div>
          )}

          {/* Chat Panel */}
          <div className={`h-full flex-1 ${activeMobileTab !== 'chat' ? 'hidden lg:flex' : 'flex'}`}>
            <RoomChat
              messages={roomMessages}
              onSendMessage={handleSendMessage}
              floatingReactions={floatingReactions}
            />
          </div>

          {/* Queue Panel */}
          <div className={`h-full flex-1 ${activeMobileTab !== 'queue' ? 'hidden lg:flex' : 'flex'}`}>
            <RoomQueue
              queue={roomQueue}
              onAddQueueItem={handleAddQueueItem}
              onVoteItem={handleVoteItem}
              onPlayNow={handlePlayQueueItem}
              isHost={isHost}
            />
          </div>
        </div>
      </main>

      {/* Change Video Dialog */}
      <Dialog open={isChangeMediaOpen} onOpenChange={setIsChangeMediaOpen}>
        <DialogContent className="bg-slate-900 text-slate-100 border-purple-900/60 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
              Change Currently Playing Video
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleChangeMediaSubmit} className="space-y-4 py-2">
            <Input
              placeholder="Paste new YouTube video URL..."
              value={newMediaUrl}
              onChange={(e) => setNewMediaUrl(e.target.value)}
              className="bg-slate-950 border-purple-900 text-xs text-slate-100"
              required
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsChangeMediaOpen(false)} className="border-slate-800 text-slate-300">
                Cancel
              </Button>
              <Button type="submit" className="bg-pink-600 hover:bg-pink-500 text-white font-semibold">
                Play Video
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Room Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="bg-slate-900 text-slate-100 border-purple-900/60 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-red-400 flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> Delete Watch Party
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs mt-1">
              Are you sure you want to delete <span className="font-semibold text-slate-200">"{room.title}"</span>? This will close the room for all active listeners and remove it from the room list.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-4 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              className="border-slate-800 text-slate-300 hover:bg-slate-800 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleDeleteRoomConfirm}
              className="bg-red-600 hover:bg-red-500 text-white font-semibold text-xs"
            >
              Delete Room
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

Также добавим иконку удаления непосредственно на карточку комнаты в каталоге (`RoomCard.tsx`):

<dyad-write path="src/components/RoomCard.tsx" description="Добавление кнопки быстрого удаления на карточку комнаты для создателя">
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Play, Shield, Volume2, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Room } from '@/types/rave';
import { CURRENT_USER } from '@/data/mockRaveData';
import { useRooms } from '@/context/RoomContext';
import { showSuccess } from '@/utils/toast';

interface RoomCardProps {
  room: Room;
}

export const RoomCard: React.FC<RoomCardProps> = ({ room }) => {
  const navigate = useNavigate();
  const { deleteRoom } = useRooms();

  const isHost = room.host_id === CURRENT_USER.id;

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteRoom(room.id);
    showSuccess('Room deleted');
  };

  return (
    <div
      onClick={() => navigate(`/room/${room.id}`)}
      className="group relative cursor-pointer overflow-hidden rounded-2xl border border-purple-900/30 bg-slate-900/90 hover:border-pink-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/10 hover:-translate-y-1 flex flex-col justify-between"
    >
      {/* Thumbnail Header */}
      <div className="relative aspect-video w-full overflow-hidden bg-slate-950">
        <img
          src={room.current_media_thumbnail || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80'}
          alt={room.title}
          className="h-full w-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

        {/* Live Indicator Pill */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-slate-950/80 backdrop-blur-md px-2.5 py-1 text-[11px] font-semibold text-white border border-purple-500/30">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-pink-500"></span>
          </span>
          <span className="uppercase tracking-wider text-pink-400 text-[10px]">LIVE</span>
        </div>

        {/* Listeners Badge & Trash button for Host */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          {isHost && (
            <button
              onClick={handleDelete}
              className="p-1 rounded-full bg-red-950/80 hover:bg-red-600 text-red-300 hover:text-white backdrop-blur-md border border-red-800/50 transition-all"
              title="Delete Room"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}

          <div className="flex items-center gap-1 rounded-full bg-purple-950/80 backdrop-blur-md px-2.5 py-1 text-xs font-medium text-purple-200 border border-purple-700/40">
            <Users className="h-3.5 w-3.5 text-cyan-400" />
            <span>{room.member_count}</span>
          </div>
        </div>

        {/* Hover Play Button Overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-purple-950/40 backdrop-blur-[2px]">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-pink-500 text-white shadow-lg shadow-pink-500/50 scale-90 group-hover:scale-100 transition-transform">
            <Play className="h-6 w-6 fill-white ml-0.5" />
          </div>
        </div>

        {/* Category Pill */}
        <div className="absolute bottom-2 left-3">
          <Badge className="bg-purple-900/80 text-purple-200 hover:bg-purple-900 border-none text-[10px] uppercase font-bold tracking-wider">
            {room.category}
          </Badge>
        </div>
      </div>

      {/* Card Content Body */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="line-clamp-1 text-base font-bold text-slate-100 group-hover:text-pink-400 transition-colors">
            {room.title}
          </h3>
          <p className="mt-1 line-clamp-1 text-xs text-slate-400 flex items-center gap-1.5">
            <Volume2 className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
            <span>{room.current_media_title || 'Playing media...'}</span>
          </p>
        </div>

        {/* Host Info Footer */}
        <div className="mt-4 flex items-center justify-between border-t border-purple-950/60 pt-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <img
              src={room.host_avatar}
              alt={room.host_name}
              className="h-6 w-6 rounded-full object-cover ring-1 ring-purple-500/50"
            />
            <span className="font-medium text-slate-300">{room.host_name}</span>
          </div>
          {room.is_private && (
            <span className="flex items-center gap-1 text-[11px] text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-800/40">
              <Shield className="h-3 w-3" /> Private
            </span>
          )}
        </div>
      </div>
    </div>
  );
};