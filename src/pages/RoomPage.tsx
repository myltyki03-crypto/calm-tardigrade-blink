import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Shield, Share2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/Navbar';
import { MediaPlayer } from '@/components/MediaPlayer';
import { RoomChat } from '@/components/RoomChat';
import { RoomQueue } from '@/components/RoomQueue';
import { FriendsDrawer } from '@/components/FriendsDrawer';
import { SqlSchemaDialog } from '@/components/SqlSchemaDialog';
import { INITIAL_ROOMS, INITIAL_MESSAGES, INITIAL_QUEUE, CURRENT_USER } from '@/data/mockRaveData';
import { ChatMessage, QueueItem } from '@/types/rave';
import { showSuccess } from '@/utils/toast';

export const RoomPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const room = INITIAL_ROOMS.find((r) => r.id === id) || INITIAL_ROOMS[0];
  const isHost = room.host_id === CURRENT_USER.id;

  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [queue, setQueue] = useState<QueueItem[]>(INITIAL_QUEUE);
  const [floatingReactions, setFloatingReactions] = useState<{ id: string; emoji: string; x: number }[]>([]);

  // Modals state
  const [isFriendsDrawerOpen, setIsFriendsDrawerOpen] = useState(false);
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);

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
    setMessages((prev) => [...prev, newMsg]);
  };

  const handleAddQueueItem = (url: string) => {
    const newItem: QueueItem = {
      id: `q-${Date.now()}`,
      room_id: room.id,
      title: 'Requested Video Track',
      url: url,
      added_by_name: CURRENT_USER.username,
      votes: 1,
      created_at: new Date().toISOString(),
    };
    setQueue((prev) => [...prev, newItem]);
  };

  const handleVoteItem = (itemId: string) => {
    setQueue((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, votes: item.votes + 1 } : item))
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar
        onOpenCreateModal={() => {}}
        onOpenFriendsDrawer={() => setIsFriendsDrawerOpen(true)}
        onOpenSqlModal={() => setIsSqlModalOpen(true)}
      />

      <main className="container mx-auto flex-1 p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Player & Room Info Header */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <Button
              onClick={() => navigate('/')}
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-white gap-1.5"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Parties
            </Button>

            <Button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                showSuccess('Room link copied!');
              }}
              size="sm"
              variant="outline"
              className="border-purple-800 text-purple-300 hover:bg-purple-950 text-xs gap-1.5"
            >
              <Share2 className="h-3.5 w-3.5 text-pink-400" /> Share Party
            </Button>
          </div>

          {/* Synchronized Player */}
          <MediaPlayer
            room={room}
            isHost={isHost}
            onSendReaction={handleSendReaction}
          />

          {/* Room Title Info */}
          <div className="p-4 rounded-2xl border border-purple-900/40 bg-slate-900/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-100">{room.title}</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Hosted by <span className="text-pink-400 font-medium">{room.host_name}</span> • {room.description}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs bg-purple-950/80 border border-purple-800/40 text-purple-300 px-3 py-1 rounded-full">
                <Users className="h-3.5 w-3.5 text-cyan-400" /> {room.member_count} Listening
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Chat & Queue Tabs */}
        <div className="lg:col-span-4 flex flex-col gap-4 h-[650px] lg:h-auto">
          <div className="h-1/2 flex-1">
            <RoomChat
              messages={messages}
              onSendMessage={handleSendMessage}
              floatingReactions={floatingReactions}
            />
          </div>
          <div className="h-1/2 flex-1">
            <RoomQueue
              queue={queue}
              onAddQueueItem={handleAddQueueItem}
              onVoteItem={handleVoteItem}
              isHost={isHost}
            />
          </div>
        </div>
      </main>

      <FriendsDrawer
        isOpen={isFriendsDrawerOpen}
        onClose={() => setIsFriendsDrawerOpen(false)}
      />
      <SqlSchemaDialog
        isOpen={isSqlModalOpen}
        onClose={() => setIsSqlModalOpen(false)}
      />
    </div>
  );
};