import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Plus, User } from 'lucide-react';
import { useRooms } from '@/context/RoomContext';

interface MobileBottomNavProps {
  onOpenCreateModal: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  onOpenCreateModal,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useRooms();

  const isHome = location.pathname === '/';
  const isProfile = location.pathname === '/profile';

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-slate-950/80 backdrop-blur-2xl border-t border-purple-900/30 px-8 py-2 flex items-center justify-between shadow-[0_-10px_30px_rgba(0,0,0,0.8)]">
      {/* Кнопка "Лента" */}
      <button
        onClick={() => navigate('/')}
        className={`relative flex flex-col items-center gap-1 transition-all duration-200 active:scale-90 ${
          isHome ? 'text-pink-400 font-bold' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Home className={`h-5 w-5 ${isHome ? 'text-pink-400 drop-shadow-[0_0_8px_rgba(236,72,153,0.6)]' : ''}`} />
        <span className="text-[10px] tracking-wide">Лента</span>
        {isHome && (
          <span className="absolute -bottom-1 h-1 w-5 rounded-full bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.8)]" />
        )}
      </button>

      {/* Центральная кнопка "+" */}
      <button
        onClick={onOpenCreateModal}
        className="relative group -mt-6 flex items-center justify-center h-13 w-13 rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-600 to-pink-500 text-white shadow-[0_8px_25px_rgba(236,72,153,0.5)] ring-4 ring-slate-950 active:scale-95 transition-all duration-200"
      >
        <Plus className="h-6 w-6 stroke-[2.5]" />
        <span className="absolute inset-0 rounded-2xl bg-pink-400/20 blur-md -z-10 group-hover:opacity-100 opacity-60 transition-opacity" />
      </button>

      {/* Кнопка "Профиль" */}
      <button
        onClick={() => navigate('/profile')}
        className={`relative flex flex-col items-center gap-1 transition-all duration-200 active:scale-90 ${
          isProfile ? 'text-pink-400 font-bold' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <div
          className={`h-5 w-5 rounded-full overflow-hidden ring-2 transition-all ${
            isProfile
              ? 'ring-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.8)] scale-105'
              : 'ring-purple-900/60'
          }`}
        >
          <img
            src={currentUser.avatar_url}
            alt={currentUser.username}
            className="h-full w-full object-cover"
          />
        </div>
        <span className="text-[10px] tracking-wide">Профиль</span>
        {isProfile && (
          <span className="absolute -bottom-1 h-1 w-5 rounded-full bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.8)]" />
        )}
      </button>
    </nav>
  );
};