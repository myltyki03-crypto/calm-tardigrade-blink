import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Share2, MessageSquare, ListMusic, Info, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Navbar } from '@/components/Navbar';
import { MediaPlayer } from '@/components/MediaPlayer';
import { RoomChat } from '@/components/RoomChat';
import { RoomQueue } from '@/components/RoomQueue';
import { FriendsDrawer } from '@/components/FriendsDrawer';
import { SqlSchemaDialog } from '@/components/SqlSchemaDialog';
import { CreateRoomModal } from '@/components/CreateRoomModal';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { ChatMessage, QueueItem, Room } from '@/types/rave';
import { useRooms } from '@/context/RoomContext';
import { showSuccess, showError } from '@/utils/toast';

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
  } = useRooms();

  const [directRoom, setDirectRoom] = useState<Room | null>(null);
  const [isFetchingDirect, setIsFetchingDirect] = useState<boolean>(true);

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

  const [activeMobileTab, setActiveMobileTab] = useState<MobileTab>('chat');
  const [floatingReactions, setFloatingReactions] = useState<{ id: string; emoji: string; x: number }[]>([]);
  const [isFriendsDrawerOpen, setIsFriendsDrawerOpen] = useState(false);
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  if (!isRoomsLoaded || isFetchingDirect) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 space-y-3">
        <Loader2 className="h-8 w-8 text-pink-500 animate-spin" />
        <p className="text-slate-400 text-xs font-medium">Connecting to watch party room...</p>
      </div>
    );
  }

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

  const isHost = room.host_id === currentUser.id;
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
      user_id: currentUser.id,
      user_name: currentUser.username,
      user_avatar: currentUser.avatar_url,
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
      showError('Only the room creator can switch videos.');
      return;
    }
    const ytDetails = extractYouTubeDetails(item.url);
    changeRoomMedia(room.id, item.url, item.title, ytDetails.thumbnail);
    showSuccess(`Now playing: ${item.title}`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-20 md:pb-0 w-full overflow-x-hidden">
      <Navbar
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
        onOpenFriendsDrawer={() => setIsFriendsDrawerOpen(true)}
        onOpenSqlModal={() => setIsSqlModalOpen(true)}
      />

      <main className="w-full flex-1 p-2 md:p-4 grid grid-cols-1 lg:grid-cols-12 gap-3 md:gap-4 max-w-7xl mx-auto">
        {/* Left Column: Player & Room Info */}
        <div className="lg:col-span-8 flex flex-col gap-2 md:gap-4 w-full">
          <div className="flex items-center justify-between px-1 w-full">
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
          <div className="sticky top-14 z-30 lg:relative lg:top-0 bg-slate-950 rounded-2xl w-full">
            <MediaPlayer
              room={room}
              isHost={isHost}
              onSendReaction={handleSendReaction}
            />
          </div>

          {/* Desktop Info Box */}
          <div className="hidden lg:flex p-4 rounded-2xl border border-purple-900/40 bg-slate-900/80 items-center justify-between gap-3 w-full">
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
        <div className="lg:hidden flex border-b border-purple-900/40 bg-slate-900/80 rounded-xl p-1 gap-1 my-1 w-full">
          <button
            onClick={() => setActiveMobileTab('chat')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
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
            className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
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
            className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
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
        <div className="lg:col-span-4 flex flex-col gap-3 h-[480px] lg:h-auto w-full">
          {/* Mobile Info View */}
          {activeMobileTab === 'info' && (
            <div className="lg:hidden p-4 rounded-2xl border border-purple-900/40 bg-slate-900/90 space-y-3 w-full">
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
          <div className={`h-full w-full flex-1 ${activeMobileTab !== 'chat' ? 'hidden lg:flex' : 'flex'}`}>
            <RoomChat
              messages={roomMessages}
              onSendMessage={handleSendMessage}
              floatingReactions={floatingReactions}
            />
          </div>

          {/* Queue Panel */}
          <div className={`h-full w-full flex-1 ${activeMobileTab !== 'queue' ? 'hidden lg:flex' : 'flex'}`}>
            <RoomQueue
              queue={roomQueue}
              currentMediaUrl={room.current_media_url}
              onAddQueueItem={handleAddQueueItem}
              onVoteItem={handleVoteItem}
              onPlayNow={handlePlayQueueItem}
              isHost={isHost}
            />
          </div>
        </div>
      </main>

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