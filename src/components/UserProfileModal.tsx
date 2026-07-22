import React, { useState } from 'react';
import { Crown, Clock, Radio, UserPlus, MessageSquare, Check, Clock3, UserX } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UserProfile } from '@/types/rave';
import { useRooms } from '@/context/RoomContext';
import { DirectMessagesModal } from '@/components/DirectMessagesModal';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser: UserProfile | null;
  isOwner?: boolean;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  targetUser,
  isOwner = false,
}) => {
  const { currentUser, sendFriendRequest, getFriendStatusWith, removeFriend } = useRooms();
  const [isDmOpen, setIsDmOpen] = useState(false);

  if (!targetUser) return null;

  const isMe = targetUser.id === currentUser.id || targetUser.username.toLowerCase() === currentUser.username.toLowerCase();

  const defaultAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(targetUser.username || 'user')}`;
  const displayAvatar = targetUser.avatar_url || defaultAvatar;

  const friendStatus = getFriendStatusWith(targetUser.id, targetUser.username);

  const handleOpenDm = () => {
    onClose();
    setIsDmOpen(true);
  };

  const handleRemoveFriend = () => {
    if (window.confirm(`Вы уверены, что хотите удалить ${targetUser.username} из друзей?`)) {
      removeFriend(targetUser.id);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="bg-slate-900 text-slate-100 border-purple-900/60 sm:max-w-md p-6 overflow-hidden">
          <DialogHeader className="text-center pb-2">
            <DialogTitle className="text-sm font-bold text-slate-400 uppercase tracking-wider">
              Карточка профиля
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col items-center text-center space-y-3 py-1">
            {/* Аватар с индикатором онлайна */}
            <div className="relative">
              <div className="h-20 w-20 rounded-full ring-4 ring-pink-500/50 overflow-hidden shadow-xl bg-slate-950">
                <img
                  src={displayAvatar}
                  alt={targetUser.username}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = defaultAvatar;
                  }}
                />
              </div>
              <span className="absolute bottom-1 right-1 h-4 w-4 rounded-full bg-emerald-500 ring-2 ring-slate-900 shadow-md" />
            </div>

            {/* Имя и бейджи */}
            <div>
              <div className="flex items-center justify-center gap-2">
                <h3 className="text-xl font-black text-white">{targetUser.username}</h3>
                {isOwner ? (
                  <Badge className="bg-gradient-to-r from-pink-500 to-purple-600 text-white text-[10px] gap-1 font-bold">
                    <Crown className="h-3 w-3 text-amber-300 fill-amber-300" /> Владелец
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-purple-800 text-purple-300 text-[10px]">
                    Зритель
                  </Badge>
                )}
              </div>
              <p className="text-xs text-purple-300 mt-1">
                {targetUser.status_message || 'В ритме вечеринки 🎧'}
              </p>
            </div>

            {/* Кнопки взаимодействия (Добавить в друзья / Удалить из друзей / Написать ЛС) */}
            {!isMe && (
              <div className="flex flex-col gap-2 pt-2 w-full">
                <div className="flex items-center gap-2 w-full">
                  {friendStatus === 'none' && (
                    <Button
                      onClick={() => sendFriendRequest(targetUser)}
                      size="sm"
                      className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 to-pink-500 text-white font-bold text-xs h-9 rounded-xl gap-1.5 shadow-md"
                    >
                      <UserPlus className="h-3.5 w-3.5" /> В друзья
                    </Button>
                  )}

                  {friendStatus === 'pending_sent' && (
                    <Button
                      disabled
                      size="sm"
                      className="flex-1 bg-slate-800 text-amber-300 font-bold text-xs h-9 rounded-xl gap-1.5 opacity-90"
                    >
                      <Clock3 className="h-3.5 w-3.5 animate-spin" /> Заявка отправлена
                    </Button>
                  )}

                  {friendStatus === 'accepted' && (
                    <Button
                      onClick={handleRemoveFriend}
                      size="sm"
                      variant="outline"
                      className="flex-1 border-red-500/50 text-red-300 hover:bg-red-950/40 hover:text-red-200 font-bold text-xs h-9 rounded-xl gap-1.5"
                    >
                      <UserX className="h-3.5 w-3.5 text-red-400" /> Удалить из друзей
                    </Button>
                  )}

                  <Button
                    onClick={handleOpenDm}
                    size="sm"
                    variant="outline"
                    className="flex-1 border-purple-800 text-purple-200 hover:bg-purple-900/60 font-bold text-xs h-9 rounded-xl gap-1.5"
                  >
                    <MessageSquare className="h-3.5 w-3.5 text-pink-400" /> Написать ЛС
                  </Button>
                </div>
              </div>
            )}

            {/* Статистика */}
            <div className="w-full grid grid-cols-2 gap-2 pt-2 text-xs">
              <div className="p-2.5 rounded-2xl bg-slate-950/70 border border-purple-950 flex flex-col items-center">
                <Clock className="h-4 w-4 text-cyan-400 mb-1" />
                <span className="font-bold text-slate-200">{targetUser.watch_time_minutes || 0} мин</span>
                <span className="text-[10px] text-slate-500">В эфире</span>
              </div>

              <div className="p-2.5 rounded-2xl bg-slate-950/70 border border-purple-950 flex flex-col items-center">
                <Radio className="h-4 w-4 text-pink-400 mb-1" />
                <span className="font-bold text-slate-200">{targetUser.parties_hosted || 0}</span>
                <span className="text-[10px] text-slate-500">Вечеринок</span>
              </div>
            </div>

            {isMe && (
              <div className="pt-2 text-xs text-slate-500 font-medium">
                Это ваш профиль
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <DirectMessagesModal
        isOpen={isDmOpen}
        onClose={() => setIsDmOpen(false)}
        initialTargetUser={targetUser}
      />
    </>
  );
};