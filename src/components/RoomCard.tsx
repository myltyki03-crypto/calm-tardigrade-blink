import React from 'react';
import { Users, Play, Volume2, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Room } from '@/types/rave';

interface RoomCardProps {
  room: Room;
  currentUserId?: string;
  onClick?: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  all: 'ВСЕ',
  music: 'МУЗЫКА',
  movies: 'КИНО',
  youtube: 'YOUTUBE',
  gaming: 'ИГРЫ',
  anime: 'АНИМЕ',
  livestream: 'СТРИМ',
};

export const RoomCard: React.FC<RoomCardProps> = ({ room, onClick }) => {
  return (
    <div
      onClick={onClick}
      className="group relative cursor-pointer overflow-hidden rounded-2xl border border-purple-900/30 bg-slate-900/90 hover:border-pink-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/10 hover:-translate-y-1 flex flex-col justify-between"
    >
      {/* Превью медиа */}
      <div className="relative aspect-video w-full overflow-hidden bg-slate-950">
        <img
          src={room.current_media_thumbnail || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80'}
          alt={room.title}
          className="h-full w-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

        {/* Индикатор эфира */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-slate-950/80 backdrop-blur-md px-2.5 py-1 text-[11px] font-semibold text-white border border-purple-500/30">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-pink-500"></span>
          </span>
          <span className="uppercase tracking-wider text-pink-400 text-[10px]">ЭФИР</span>
        </div>

        {/* Правый блок: Количество зрителей */}
        <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-purple-950/80 backdrop-blur-md px-2.5 py-1 text-xs font-medium text-purple-200 border border-purple-700/40">
          <Users className="h-3.5 w-3.5 text-cyan-400" />
          <span>{room.member_count}</span>
        </div>

        {/* Кнопка Play при наведении */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-purple-950/40 backdrop-blur-[2px]">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-pink-500 text-white shadow-lg shadow-pink-500/50 scale-90 group-hover:scale-100 transition-transform">
            {room.is_private ? <Lock className="h-5 w-5 fill-white" /> : <Play className="h-6 w-6 fill-white ml-0.5" />}
          </div>
        </div>

        {/* Категория */}
        <div className="absolute bottom-2 left-3">
          <Badge className="bg-purple-900/80 text-purple-200 hover:bg-purple-900 border-none text-[10px] uppercase font-bold tracking-wider">
            {CATEGORY_LABELS[room.category] || room.category}
          </Badge>
        </div>
      </div>

      {/* Текст карточки */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="line-clamp-1 text-base font-bold text-slate-100 group-hover:text-pink-400 transition-colors">
            {room.title}
          </h3>
          <p className="mt-1 line-clamp-1 text-xs text-slate-400 flex items-center gap-1.5">
            <Volume2 className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
            <span>{room.current_media_title || 'Играет медиа...'}</span>
          </p>
        </div>

        {/* Автор комнаты */}
        <div className="mt-4 flex items-center justify-between border-t border-purple-950/60 pt-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <img
              src={room.host_avatar}
              alt={room.host_name}
              className="h-6 w-6 rounded-full object-cover ring-1 ring-purple-500/50"
            />
            <span className="font-medium text-slate-300">{room.host_name}</span>
          </div>
          {room.is_private && (
            <span className="flex items-center gap-1 text-[11px] text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-800/40 font-semibold">
              <Lock className="h-3 w-3" /> По паролю
            </span>
          )}
        </div>
      </div>
    </div>
  );
};