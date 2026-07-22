import React, { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { RoomCard } from '@/components/RoomCard';
import { CreateRoomModal } from '@/components/CreateRoomModal';
import { FriendsDrawer } from '@/components/FriendsDrawer';
import { SqlSchemaDialog } from '@/components/SqlSchemaDialog';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { CategoryType } from '@/types/rave';
import { useRooms } from '@/context/RoomContext';
import { isSupabaseConfigured } from '@/lib/supabase';
import { Sparkles, Radio, Music, Film, Gamepad2, PlayCircle, Search, WifiOff, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const Index = () => {
  const { rooms, refreshRooms } = useRooms();
  const [activeCategory, setActiveCategory] = useState<CategoryType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isFriendsDrawerOpen, setIsFriendsDrawerOpen] = useState(false);
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);

  const categories: { id: CategoryType; label: string; icon: any }[] = [
    { id: 'all', label: 'All Rooms', icon: Sparkles },
    { id: 'music', label: 'Music & DJ', icon: Music },
    { id: 'movies', label: 'Movies & Cinema', icon: Film },
    { id: 'youtube', label: 'YouTube', icon: PlayCircle },
    { id: 'gaming', label: 'Gaming', icon: Gamepad2 },
    { id: 'livestream', label: 'Live Streams', icon: Radio },
  ];

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await refreshRooms();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const filteredRooms = rooms.filter((r) => {
    const matchesCategory = activeCategory === 'all' || r.category === activeCategory;
    const matchesSearch =
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.host_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-16 md:pb-0">
      <Navbar
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
        onOpenFriendsDrawer={() => setIsFriendsDrawerOpen(true)}
        onOpenSqlModal={() => setIsSqlModalOpen(true)}
      />

      {/* Offline Alert Banner if Supabase is not connected */}
      {!isSupabaseConfigured && (
        <div className="bg-amber-950/80 border-b border-amber-500/40 px-4 py-2 text-center text-xs text-amber-200 flex items-center justify-center gap-2">
          <WifiOff className="h-4 w-4 text-amber-400 shrink-0" />
          <span>
            <strong>Локальный режим:</strong> Подключите базу данных Supabase, чтобы комнаты синхронизировались между вашим ПК и телефоном.
          </span>
          <Button
            onClick={() => setIsSqlModalOpen(true)}
            size="sm"
            variant="outline"
            className="h-6 text-[11px] px-2 border-amber-400 text-amber-300 hover:bg-amber-900/60"
          >
            Инструкция
          </Button>
        </div>
      )}

      {/* Hero Banner Section */}
      <section className="relative overflow-hidden border-b border-purple-900/30 bg-gradient-to-b from-purple-950/40 via-slate-950 to-slate-950 py-6 md:py-10 px-4">
        <div className="container mx-auto text-center max-w-3xl relative z-10">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-pink-500/30 bg-pink-950/40 px-3 py-1 text-[11px] text-pink-300 mb-3 backdrop-blur-md">
            <Radio className="h-3 w-3 text-pink-400 animate-pulse" />
            <span>Synchronized Watch Parties & Music Rooms</span>
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Watch, Listen & Chat in Perfect{' '}
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
              Real-Time Sync
            </span>
          </h1>

          <p className="mt-2 text-xs md:text-base text-slate-400 max-w-xl mx-auto">
            Join public watch rooms, stream YouTube videos, anime or live DJ mixes with friends worldwide.
          </p>

          {/* Search Bar & Refresh */}
          <div className="mt-4 md:mt-6 max-w-md mx-auto flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-purple-400" />
              <Input
                placeholder="Search party rooms or host..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-9 md:h-10 text-xs md:text-sm rounded-full bg-slate-900/90 border-purple-800/60 text-slate-100 focus:border-pink-500"
              />
            </div>
            <Button
              onClick={handleManualRefresh}
              size="icon"
              variant="outline"
              className="h-9 w-9 rounded-full border-purple-800 text-purple-300 hover:bg-purple-900/50 shrink-0"
              title="Обновить список комнат"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-pink-400' : ''}`} />
            </Button>
          </div>
        </div>
      </section>

      {/* Main Catalog Feed */}
      <main className="container mx-auto flex-1 px-3 md:px-4 py-4 md:py-8">
        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] md:text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/20 scale-105'
                    : 'bg-slate-900 border border-purple-950 text-slate-400 hover:text-white hover:border-purple-800'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Room Grid */}
        <div className="mt-4 md:mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {filteredRooms.map((room) => (
            <RoomCard key={room.id} room={room} />
          ))}
        </div>
      </main>

      <MobileBottomNav
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
        onOpenFriendsDrawer={() => setIsFriendsDrawerOpen(true)}
      />

      {/* Modals & Drawers */}
      <CreateRoomModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
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

export default Index;