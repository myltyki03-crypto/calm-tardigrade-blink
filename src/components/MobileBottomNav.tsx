import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Search, Plus, Radio, User } from 'lucide-react';
import { useRooms } from '@/context/RoomContext';

interface MobileBottomNavProps {
  onOpenCreateModal: () => void;
  onSearchFocus?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  onOpenCreateModal,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, rooms } = useRooms();

  const isHome = location.pathname === '/';
  const isProfile = location.pathname === '/profile';
  const activeRoomsCount = rooms.length;

  const handleSearchClick = () => {
    if (!isHome) {
      navigate('/');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <nav className="fixed bottom-2 left-3 right-3 z-50 md:hidden bg-slate-950/90 backdrop-blur-2xl border border-purple-500/30 px-3 py-2 rounded-3xl flex items-center justify-between shadow-[0_10px_35px_rgba(0,0,0,0.9)] ring-1 ring-white/10">
      {/* 1. Лента */}
      <button
        onClick={() => navigate('/')}
        className={`relative flex-1 flex flex-col items-center gap-0.5 transition-transform active:scale-90 ${
          isHome ? 'text-pink-400 font-bold' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Home className={`h-4 w-4 ${isHome ? 'text-pink-400 drop-shadow-[0_0_8px_rgba(236,72,153,0.8)]' : ''}`} />
        <span className="text-[9px] tracking-tight">Лента</span>
        {isHome && (
          <span className="absolute -bottom-1 h-1 w-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.9)]" />
        )}
      </button>

      {/* 2. Обзор / Поиск */}
      <button
        onClick={handleSearchClick}
        className="relative flex-1 flex flex-col items-center gap-0.5 text-slate-400 hover:text-slate-200 transition-transform active:scale-90"
      >
        <Search className="h-4 w-4" />
        <span className="text-[9px] tracking-tight">Поиск</span>
      </button>

      {/* 3. Центральная неоновая кнопка "+" */}
      <div className="relative flex-1 flex justify-center">
        <button
          onClick={onOpenCreateModal}
          className="relative group -mt-6 flex items-center justify-center h-11 w-11 rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-600 to-pink-500 text-white shadow-[0_6px_20px_rgba(236,72,153,0.6)] ring-4 ring-slate-950 active:scale-95 transition-all duration-200"
        >
          <Plus className="h-5 w-5 stroke-[2.5]" />
          <span className="absolute inset-0 rounded-2xl bg-pink-400/30 blur-md -z-10 group-active:opacity-100 transition-opacity" />
        </button>
      </div>

      {/* 4. В эфире */}
      <button
        onClick={() => navigate('/')}
        className="relative flex-1 flex flex-col items-center gap-0.5 text-slate-400 hover:text-slate-200 transition-transform active:scale-90"
      >
        <div className="relative">
          <Radio className="h-4 w-4 text-emerald-400" />
          <span className="absolute -top-1 -right-2 bg-pink-600 text-white text-[8px] font-bold px-1 rounded-full leading-none min-w-3 text-center">
            {activeRoomsCount}
          </span>
        </div>
        <span className="text-[9px] tracking-tight">Эфиры</span>
      </button>

      {/* 5. Профиль */}
      <button
        onClick={() => navigate('/profile')}
        className={`relative flex-1 flex flex-col items-center gap-0.5 transition-transform active:scale-90 ${
          isProfile ? 'text-pink-400 font-bold' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <div
          className={`h-4 w-4 rounded-full overflow-hidden ring-2 transition-all ${
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
        <span className="text-[9px] tracking-tight">Профиль</span>
        {isProfile && (
          <span className="absolute -bottom-1 h-1 w-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.9)]" />
        )}
      </button>
    </nav>
  );
};