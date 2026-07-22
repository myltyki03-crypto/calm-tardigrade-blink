import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Plus, Users } from 'lucide-react';
import { useRooms } from '@/context/RoomContext';

interface MobileBottomNavProps {
  onOpenCreateModal: () => void;
  onOpenFriendsDrawer: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  onOpenCreateModal,
  onOpenFriendsDrawer,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, friendRequests } = useRooms();

  const isHome = location.pathname === '/';
  const isProfile = location.pathname === '/profile';

  const myId = currentUser.id;
  const myName = currentUser.username.toLowerCase();

  const pendingCount = friendRequests.filter(
    (r) =>
      r.status === 'pending' &&
      ((r.receiver_id && r.receiver_id === myId) ||
       (r.receiver_name && r.receiver_name.toLowerCase() === myName)) &&
      r.sender_id !== myId &&
      r.sender_name.toLowerCase() !== myName
  ).length;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-slate-950/95 backdrop-blur-lg border-t border-purple-900/40 px-3 py-2 flex items-center justify-around">
      <button
        onClick={() => navigate('/')}
        className={`flex flex-col items-center gap-1 text-[10px] font-medium transition-colors ${
          isHome ? 'text-pink-400 font-bold' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Home className={`h-5 w-5 ${isHome ? 'text-pink-400' : ''}`} />
        <span>Лента</span>
      </button>

      <button
        onClick={onOpenFriendsDrawer}
        className="flex flex-col items-center gap-1 text-[10px] font-medium text-slate-400 hover:text-slate-200 relative"
      >
        <Users className="h-5 w-5 text-purple-400" />
        <span>Друзья</span>
        {pendingCount > 0 ? (
          <span className="absolute -top-1 -right-2 h-4 w-4 rounded-full bg-pink-600 text-white font-black text-[9px] flex items-center justify-center animate-bounce shadow-md">
            {pendingCount}
          </span>
        ) : (
          <span className="absolute top-0 right-1 h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
        )}
      </button>

      {/* Кнопка создания по центру */}
      <button
        onClick={onOpenCreateModal}
        className="flex items-center justify-center h-12 w-12 rounded-full bg-gradient-to-tr from-purple-600 via-pink-600 to-pink-500 text-white shadow-lg shadow-pink-500/40 -mt-5 ring-4 ring-slate-950 hover:scale-105 active:scale-95 transition-all"
      >
        <Plus className="h-6 w-6 stroke-[2.5]" />
      </button>

      <button
        onClick={() => navigate('/profile')}
        className={`flex flex-col items-center gap-1 text-[10px] font-medium transition-colors ${
          isProfile ? 'text-pink-400 font-bold' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <div className={`h-5 w-5 rounded-full overflow-hidden ring-1 ${isProfile ? 'ring-pink-400' : 'ring-purple-900'}`}>
          <img
            src={currentUser.avatar_url}
            alt={currentUser.username}
            className="h-full w-full object-cover"
          />
        </div>
        <span>Профиль</span>
      </button>
    </nav>
  );
};