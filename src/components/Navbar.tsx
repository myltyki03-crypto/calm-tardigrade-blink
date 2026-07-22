import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Play, Plus, Users, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRooms } from '@/context/RoomContext';

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
  const { currentUser } = useRooms();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-purple-900/40 bg-slate-950/90 backdrop-blur-md">
      <div className="container mx-auto flex h-14 md:h-16 items-center justify-between px-3 md:px-4">
        {/* Brand logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="relative flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 via-pink-500 to-cyan-400 p-0.5 shadow-lg shadow-purple-500/20">
            <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-slate-950">
              <Play className="h-4 w-4 md:h-5 md:w-5 fill-pink-500 text-pink-500 ml-0.5 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="text-lg md:text-xl font-black tracking-wider bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-300 bg-clip-text text-transparent">
                PULSERAVE
              </span>
              <Badge variant="outline" className="text-[9px] py-0 px-1 border-pink-500/50 text-pink-400 bg-pink-950/30">
                PRO
              </Badge>
            </div>
          </div>
        </Link>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 md:gap-3">
          <Button
            onClick={onOpenSqlModal}
            variant="outline"
            size="sm"
            className="hidden sm:flex border-purple-800/50 bg-purple-950/20 text-purple-300 hover:bg-purple-900/40 hover:text-white gap-1.5 text-xs h-8"
          >
            <Database className="h-3.5 w-3.5 text-cyan-400" />
            <span>SQL</span>
          </Button>

          <Button
            onClick={onOpenFriendsDrawer}
            variant="ghost"
            size="sm"
            className="hidden md:flex text-slate-300 hover:text-white relative text-xs h-8"
          >
            <Users className="h-4 w-4 text-purple-400 mr-1" />
            <span>Friends</span>
          </Button>

          <Button
            onClick={onOpenCreateModal}
            size="sm"
            className="hidden md:flex bg-gradient-to-r from-purple-600 via-pink-600 to-pink-500 text-white text-xs h-8 gap-1 font-semibold"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create Party</span>
          </Button>

          {/* User profile dropdown button */}
          <Button
            onClick={() => navigate('/profile')}
            variant="ghost"
            className="p-0.5 h-8 w-8 md:h-9 md:w-9 rounded-full ring-2 ring-purple-500/40 hover:ring-purple-400 transition-all overflow-hidden"
          >
            <img
              src={currentUser.avatar_url}
              alt={currentUser.username}
              className="h-full w-full object-cover rounded-full"
            />
          </Button>
        </div>
      </div>
    </header>
  );
};