import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Play, Plus, Users, Database, Sparkles, User, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CURRENT_USER } from '@/data/mockRaveData';

interface NavbarProps {
  onOpenCreateModal: () => void;
  onOpenFriendsDrawer: () => void;
  onOpenSqlModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenCreateModal,
  onOpenFriendsDrawer,
  onOpenSqlModal,
}) => {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-purple-900/40 bg-slate-950/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Brand logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 via-pink-500 to-cyan-400 p-0.5 shadow-lg shadow-purple-500/20 group-hover:scale-105 transition-transform">
            <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-slate-950">
              <Play className="h-5 w-5 fill-pink-500 text-pink-500 ml-0.5 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-black tracking-wider bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-300 bg-clip-text text-transparent">
                PULSERAVE
              </span>
              <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-pink-500/50 text-pink-400 bg-pink-950/30">
                PRO
              </Badge>
            </div>
            <p className="text-[10px] text-purple-300/70 tracking-tight font-medium">Watch & Party Together</p>
          </div>
        </Link>

        {/* Action Controls */}
        <div className="flex items-center gap-2 md:gap-3">
          <Button
            onClick={onOpenSqlModal}
            variant="outline"
            size="sm"
            className="hidden sm:flex border-purple-800/50 bg-purple-950/20 text-purple-300 hover:bg-purple-900/40 hover:text-white gap-1.5"
          >
            <Database className="h-4 w-4 text-cyan-400" />
            <span className="text-xs">SQL Schema</span>
          </Button>

          <Button
            onClick={onOpenFriendsDrawer}
            variant="ghost"
            size="sm"
            className="text-slate-300 hover:text-white hover:bg-slate-800/60 relative"
          >
            <Users className="h-4 w-4 text-purple-400" />
            <span className="hidden md:inline ml-1 text-xs">Friends</span>
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
            </span>
          </Button>

          <Button
            onClick={onOpenCreateModal}
            size="sm"
            className="bg-gradient-to-r from-purple-600 via-pink-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white shadow-md shadow-pink-500/20 gap-1.5 font-semibold"
          >
            <Plus className="h-4 w-4" />
            <span>Create Party</span>
          </Button>

          {/* User profile dropdown button */}
          <Button
            onClick={() => navigate('/profile')}
            variant="ghost"
            className="p-1 h-9 w-9 rounded-full ring-2 ring-purple-500/40 hover:ring-purple-400 transition-all overflow-hidden"
          >
            <img
              src={CURRENT_USER.avatar_url}
              alt={CURRENT_USER.username}
              className="h-full w-full object-cover rounded-full"
            />
          </Button>
        </div>
      </div>
    </header>
  );
};