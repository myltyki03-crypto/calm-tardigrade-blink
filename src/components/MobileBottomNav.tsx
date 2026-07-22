import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, MessageSquare, Plus, Shuffle } from 'lucide-react';
import { useRooms } from '@/context/RoomContext';
import { DirectMessagesModal } from '@/components/DirectMessagesModal';
import { showSuccess, showError } from '@/utils/toast';

interface MobileBottomNavProps {
  onOpenCreateModal: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  onOpenCreateModal,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, friendRequests, rooms, unlockedRoomIds, unreadDmCount } = useRooms();
  const [isDmModalOpen, setIsDmModalOpen] = useState(false);

  const isHome = location.pathname === '/';
  const isProfile = location.pathname === '/profile';

  // Непрочитанные заявки и сообщения
  const pendingCount = friendRequests.filter(
    (r) => r.receiver_id === currentUser.id && r.status === 'pending'
  ).length;

  const totalNotifications = unreadDmCount + pendingCount;

  // Быстрый случайный вход в комнату
  const handleRandomRoom = () => {
    const availableRooms = rooms.filter((r) => !r.is_private || unlockedRoomIds.includes(r.id));
    if (availableRooms.length === 0) {
      showError('Нет доступных публичных комнат!');
      return;
    }
    const randomRoom = availableRooms[Math.floor(Math.random() * availableRooms.length)];
    showSuccess(`🎲 Переход в случайную комнату: ${randomRoom.title}`);
    navigate(`/room/${randomRoom.id}`, { state: { unlocked: true } });
  };

  return (
    <>
      <nav className="fixed bottom-3 left-3 right-3 z-50 md:hidden bg-slate-950/90 backdrop-blur-2xl border border-purple-500/30 px-3 py-2 rounded-3xl flex items-center justify-around shadow-[0_10px_35px_rgba(0,0,0,0.85)] ring-1 ring-white/10">
        {/* 1. Лента */}
        <button
          onClick={() => navigate('/')}
          className={`relative flex flex-col items-center gap-0.5 transition-transform active:scale-90 ${
            isHome ? 'text-pink-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Home className={`h-5 w-5 ${isHome ? 'text-pink-400 drop-shadow-[0_0_10px_rgba(236,72,153,0.8)]' : ''}`} />
          <span className="text-[9px] tracking-tight">Лента</span>
          {isHome && (
            <span className="absolute -bottom-1 h-1 w-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.9)]" />
          )}
        </button>

        {/* 2. ЛС / Чаты */}
        <button
          onClick={() => setIsDmModalOpen(true)}
          className="relative flex flex-col items-center gap-0.5 transition-transform active:scale-90 text-slate-400 hover:text-slate-200"
        >
          <div className="relative">
            <MessageSquare className="h-5 w-5 text-purple-300" />
            {totalNotifications > 0 && (
              <span className="absolute -top-1 -right-1 bg-pink-500 text-white text-[8px] font-bold h-3.5 w-3.5 rounded-full flex items-center justify-center border border-slate-950 animate-pulse">
                {totalNotifications}
              </span>
            )}
          </div>
          <span className="text-[9px] tracking-tight">Чаты</span>
        </button>

        {/* 3. Центральная кнопка "+" */}
        <button
          onClick={onOpenCreateModal}
          className="relative group -mt-6 flex items-center justify-center h-12 w-12 rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-600 to-pink-500 text-white shadow-[0_6px_22px_rgba(236,72,153,0.6)] ring-4 ring-slate-950 active:scale-95 transition-all duration-200"
          title="Создать комнату"
        >
          <Plus className="h-6 w-6 stroke-[2.5]" />
          <span className="absolute inset-0 rounded-2xl bg-pink-400/30 blur-md -z-10 group-active:opacity-100 transition-opacity" />
        </button>

        {/* 4. Микс / Случайная комната */}
        <button
          onClick={handleRandomRoom}
          className="relative flex flex-col items-center gap-0.5 transition-transform active:scale-90 text-slate-400 hover:text-cyan-300"
          title="Войти в случайный эфир"
        >
          <Shuffle className="h-5 w-5 text-cyan-400" />
          <span className="text-[9px] tracking-tight">Микс</span>
        </button>

        {/* 5. Профиль */}
        <button
          onClick={() => navigate('/profile')}
          className={`relative flex flex-col items-center gap-0.5 transition-transform active:scale-90 ${
            isProfile ? 'text-pink-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div
            className={`h-5 w-5 rounded-full overflow-hidden ring-2 transition-all ${
              isProfile
                ? 'ring-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.8)] scale-105'
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

      <DirectMessagesModal
        isOpen={isDmModalOpen}
        onClose={() => setIsDmModalOpen(false)}
      />
    </>
  );
};