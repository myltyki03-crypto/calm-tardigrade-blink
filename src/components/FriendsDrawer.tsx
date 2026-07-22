import React, { useState } from 'react';
import { Users, UserPlus, Send, Check, X, Trash2, Clock, WifiOff, MessageSquare } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRooms } from '@/context/RoomContext';
import { isSupabaseConfigured } from '@/lib/supabase';
import { showSuccess } from '@/utils/toast';
import { DirectChatModal } from '@/components/DirectChatModal';
import { UserProfile } from '@/types/rave';

interface FriendsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FriendsDrawer: React.FC<FriendsDrawerProps> = ({ isOpen, onClose }) => {
  const {
    currentUser,
    friendsList,
    friendRequests,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
  } = useRooms();

  const [targetUsername, setTargetUsername] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [chatFriend, setChatFriend] = useState<UserProfile | null>(null);
  const [isDirectChatOpen, setIsDirectChatOpen] = useState(false);

  const myId = currentUser.id || '';
  const myName = (currentUser.username || '').toLowerCase();

  // Гибкая и точная фильтрация входящих заявок
  const incomingRequests = friendRequests.filter((r) => {
    if (!r || r.status !== 'pending') return false;
    const rId = r.receiver_id || '';
    const rName = (r.receiver_name || '').toLowerCase();
    const sId = r.sender_id || '';
    const sName = (r.sender_name || '').toLowerCase();

    const isForMe = (myId && rId === myId) || (myName && rName === myName);
    const isFromMe = (myId && sId === myId) || (myName && sName === myName);

    return isForMe && !isFromMe;
  });

  // Фильтруем исходящие заявки
  const outgoingRequests = friendRequests.filter((r) => {
    if (!r || r.status !== 'pending') return false;
    const sId = r.sender_id || '';
    const sName = (r.sender_name || '').toLowerCase();

    const isFromMe = (myId && sId === myId) || (myName && sName === myName);
    return isFromMe;
  });

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUsername.trim()) return;

    setIsSending(true);
    const success = await sendFriendRequest(targetUsername.trim());
    setIsSending(false);

    if (success) {
      setTargetUsername('');
    }
  };

  const handleOpenChatWithFriend = (friend: UserProfile) => {
    setChatFriend(friend);
    setIsDirectChatOpen(true);
  };

  const handleShareLink = () => {
    navigator.clipboard.writeText(window.location.origin);
    showSuccess('Ссылка на PULSERAVE скопирована в буфер обмена!');
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent className="bg-slate-900 text-slate-100 border-purple-900/60 w-full sm:max-w-sm flex flex-col p-4">
          <SheetHeader className="pb-3 border-b border-purple-900/40 shrink-0">
            <SheetTitle className="text-base font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 flex items-center gap-2">
              <Users className="h-4 w-4 text-pink-500" /> Друзья и заявки
            </SheetTitle>
            <SheetDescription className="text-slate-400 text-xs">
              Добавляйте друзей по нику и отправляйте им личные сообщения.
            </SheetDescription>
          </SheetHeader>

          {!isSupabaseConfigured && (
            <div className="bg-amber-950/60 border border-amber-500/40 p-2 rounded-xl text-[11px] text-amber-200 mt-2 flex items-center gap-2">
              <WifiOff className="h-4 w-4 text-amber-400 shrink-0" />
              <span>Для синхронизации между ПК и телефоном подключите Supabase.</span>
            </div>
          )}

          {/* Форма отправки заявки по нику */}
          <form onSubmit={handleAddSubmit} className="pt-3 pb-2 border-b border-purple-900/30 flex gap-2 shrink-0">
            <Input
              placeholder="Никнейм пользователя..."
              value={targetUsername}
              onChange={(e) => setTargetUsername(e.target.value)}
              className="bg-slate-950 border-purple-900/60 text-xs text-slate-100 placeholder:text-slate-500 h-9 rounded-xl focus:border-pink-500"
            />
            <Button
              type="submit"
              disabled={isSending}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 to-pink-500 text-white text-xs h-9 px-3 rounded-xl font-bold shrink-0 gap-1"
            >
              <UserPlus className="h-3.5 w-3.5" /> Добавить
            </Button>
          </form>

          <ScrollArea className="flex-1 pr-1 py-2">
            <div className="space-y-4">
              {/* Секция: Входящие заявки */}
              {incomingRequests.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-pink-400 flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> Входящие заявки ({incomingRequests.length})
                  </span>

                  <div className="space-y-2">
                    {incomingRequests.map((req) => (
                      <div
                        key={req.id}
                        className="p-3 rounded-2xl bg-purple-950/80 border-2 border-pink-500/60 flex flex-col gap-2.5 shadow-xl shadow-pink-500/10"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={req.sender_avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(req.sender_name)}`}
                            alt={req.sender_name}
                            className="h-9 w-9 rounded-full object-cover shrink-0 ring-2 ring-pink-500"
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-white truncate">{req.sender_name}</p>
                            <p className="text-[10px] text-pink-300 font-medium">Хочет добавиться в друзья</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-1 border-t border-purple-900/50">
                          <Button
                            onClick={() => acceptFriendRequest(req.id)}
                            size="sm"
                            className="flex-1 h-8 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl gap-1.5 shadow-md shadow-emerald-600/30"
                          >
                            <Check className="h-4 w-4 stroke-[3]" />
                            <span>Принять</span>
                          </Button>
                          <Button
                            onClick={() => rejectFriendRequest(req.id)}
                            size="sm"
                            variant="ghost"
                            className="h-8 px-3 text-slate-400 hover:text-red-400 hover:bg-red-950/50 text-xs rounded-xl gap-1"
                          >
                            <X className="h-3.5 w-3.5" />
                            <span>Отклонить</span>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Секция: Исходящие заявки */}
              {outgoingRequests.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Отправленные заявки ({outgoingRequests.length})
                  </span>
                  {outgoingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-2 rounded-lg bg-slate-950/40 border border-purple-950 flex items-center justify-between text-xs text-slate-400"
                    >
                      <span>Заявка для <strong className="text-slate-200">{req.receiver_name}</strong></span>
                      <span className="text-[10px] text-amber-400 font-medium">Ожидает ответа</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Секция: Список друзей */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase text-slate-300 tracking-wider">
                    Мои друзья ({friendsList.length})
                  </span>
                  <Button
                    onClick={handleShareLink}
                    size="sm"
                    variant="ghost"
                    className="h-6 text-[10px] text-purple-300 hover:bg-purple-950 px-2"
                  >
                    Ссылка
                  </Button>
                </div>

                {friendsList.length === 0 ? (
                  <div className="text-center py-8 px-2 space-y-2 bg-slate-950/50 rounded-2xl border border-purple-950">
                    <Users className="h-7 w-7 text-purple-500/40 mx-auto" />
                    <p className="text-xs text-slate-300 font-medium">У вас пока нет друзей</p>
                    <p className="text-[11px] text-slate-500">
                      Введите логин друга в поле выше, чтобы отправить заявку!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {friendsList.map((friend) => (
                      <div
                        key={friend.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/70 border border-purple-950 hover:border-purple-800/40 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="relative shrink-0">
                            <img
                              src={friend.avatar_url}
                              alt={friend.username}
                              className="h-8 w-8 rounded-full object-cover"
                            />
                            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-950" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-200 truncate">{friend.username}</p>
                            <p className="text-[10px] text-emerald-400 font-mono">В сети</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            onClick={() => handleOpenChatWithFriend(friend)}
                            size="sm"
                            className="h-7 text-[11px] px-2 bg-purple-700 hover:bg-purple-600 text-white rounded-lg gap-1 font-semibold"
                            title="Открыть личные сообщения"
                          >
                            <MessageSquare className="h-3 w-3" /> ЛС
                          </Button>
                          <Button
                            onClick={() => removeFriend(friend.id)}
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-slate-500 hover:text-red-400 hover:bg-red-950/30 rounded-lg"
                            title="Удалить из друзей"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <DirectChatModal
        isOpen={isDirectChatOpen}
        onClose={() => setIsDirectChatOpen(false)}
        selectedFriend={chatFriend}
      />
    </>
  );
};