import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Share2, MessageSquare, ListMusic, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

export const RoomPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getRoomById, messagesByRoom, sendMessage, queueByRoom, addQueueItem, voteQueueItem } = useRooms();

  const room = id ? getRoomById(id) : undefined;

  const [activeMobileTab, setActiveMobileTab] = useState<MobileTab>('chat');
  const [floatingReactions, setFloatingReactions] = useState<{ id: string; emoji: string; x: number }[]>([]);
  const [isFriendsDrawerOpen, setIsFriendsDrawerOpen] = useState(false);
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

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
    const newItem: QueueItem = {
      id: `q-${Date.now()}`,
      room_id: room.id,
      title: 'Requested Video Track',
      url: url,
      duration_seconds: 200,
      added_by_name: CURRENT_USER.username,
      votes: 1,
      created_at: new Date().toISOString(),
    };
    addQueueItem(room.id, newItem);
  };

  const handleVoteItem = (itemId: string) => {
    voteQueueItem(room.id, itemId);
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
              isHost={isHost}
            />
          </div>
        </div>
      </main>

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