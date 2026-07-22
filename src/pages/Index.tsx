import React, { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { RoomCard } from '@/components/RoomCard';
import { CreateRoomModal } from '@/components/CreateRoomModal';
import { FriendsDrawer } from '@/components/FriendsDrawer';
import { SqlSchemaDialog } from '@/components/SqlSchemaDialog';
import { CategoryType, Room } from '@/types/rave';
import { INITIAL_ROOMS } from '@/data/mockRaveData';
import { Sparkles, Radio, Music, Film, Tv, Gamepad2, PlayCircle, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

const Index = () => {
  const [rooms, setRooms] = useState<Room[]>(INITIAL_ROOMS);
  const [activeCategory, setActiveCategory] = useState<CategoryType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
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

  const handleRoomCreated = (newRoom: Room) => {
    setRooms([newRoom, ...rooms]);
  };

  const filteredRooms = rooms.filter((r) => {
    const matchesCategory = activeCategory === 'all' || r.category === activeCategory;
    const matchesSearch =
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.host_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
        onOpenFriendsDrawer={() => setIsFriendsDrawerOpen(true)}
        onOpenSqlModal={() => setIsSqlModalOpen(true)}
      />

      {/* Hero Banner Section */}
      <section className="relative overflow-hidden border-b border-purple-900/30 bg-gradient-to-b from-purple-950/40 via-slate-950 to-slate-950 py-10 px-4">
        <div className="container mx-auto text-center max-w-3xl relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-pink-500/30 bg-pink-950/40 px-3.5 py-1.5 text-xs text-pink-300 mb-4 backdrop-blur-md">
            <Radio className="h-3.5 w-3.5 text-pink-400 animate-pulse" />
            <span>Synchronized Rave Watch Parties & Music Rooms</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Watch, Listen & Chat in Perfect{' '}
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
              Real-Time Sync
            </span>
          </h1>

          <p className="mt-3 text-sm md:text-base text-slate-400 max-w-xl mx-auto">
            Join public watch rooms, stream YouTube videos, anime or live DJ mixes with friends worldwide.
          </p>

          {/* Search Bar */}
          <div className="mt-6 max-w-md mx-auto relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-purple-400" />
            <Input
              placeholder="Search party rooms or host..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 rounded-full bg-slate-900/90 border-purple-800/60 text-slate-100 focus:border-pink-500"
            />
          </div>
        </div>
      </section>

      {/* Main Catalog Feed */}
      <main className="container mx-auto flex-1 px-4 py-8">
        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-none">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold whitespace-nowrap transition-all ${
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
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredRooms.map((room) => (
            <RoomCard key={room.id} room={room} />
          ))}
        </div>
      </main>

      {/* Modals & Drawers */}
      <CreateRoomModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onRoomCreated={handleRoomCreated}
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