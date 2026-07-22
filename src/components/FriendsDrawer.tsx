import React, { useState } from 'react';
import { Users, UserPlus, Check, X, MessageSquare, Search, UserCheck } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { UserProfile } from '@/types/rave';
import { useRooms } from '@/context/RoomContext';
import { DirectChatModal } from '@/components/DirectChatModal';

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
  } = useRooms();

  const [addUsername, setAddUsername] = useState('');
  const [selectedFriendForChat, setSelectedFriendForChat] = useState<UserProfile | null>(null);
  const [isDirectChatOpen, setIsDirectChatOpen] = useState(false);

  const pendingIncoming = friendRequests.filter(
    (r) =>
      r.status === 'pending' &&
      ((r.receiver_id && r.receiver_id === currentUser.id) ||
        (r.receiver_name && r.receiver_name.toLowerCase() === currentUser.username.toLowerCase()))
  );

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addUsername.trim()) return;
    const success = await sendFriendRequest(addUsername.trim());
    if (success) {
      setAddUsername('');
    }
  };

  const handleOpenChat = (friend: UserProfile) => {
    setSelectedFriendForChat(friend);
    setIsDirectChatOpen(true);
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent className="bg-slate-900 text-slate-100 border-purple-900/60 w-full sm:max-w-md p-4 flex flex-col">
          <SheetHeader className="pb-3 border-b border-purple-900/40">
            <SheetTitle className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="h-5 w-5 text-pink-400" /> Мои друзья
              </span>
              <Badge variant="outline" className="border-pink-500/40 text-pink-300">
                {friendsList.length}
              </Badge>
            </SheetTitle>
          </SheetHeader>

          {/* Добавление в друзья по логину */}
          <form onSubmit={handleAddSubmit} className="pt-3 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <Input
                placeholder="Поиск или логин друга..."
                value={addUsername}
                onChange={(e) => setAddUsername(e.target.value)}
                className="pl-8 bg-slate-950 border-purple-900/60 text-xs text-slate-100 placeholder:text-slate-500 h-9 rounded-xl"
              />
            </div>
            <Button
              type="submit"
              size="sm"
              className="bg-purple-700 hover:bg-purple-600 text-white text-xs h-9 px-3 rounded-xl gap-1 shrink-0 font-bold"
            >
              <UserPlus className="h-3.5 w-3.5" /> Добавить
            </Button>
          </form>

          {/* Входящие заявки */}
          {pendingIncoming.length > 0 && (
            <div className="mt-3 p-3 rounded-xl bg-purple-950/40 border border-purple-800/40 space-y-2">
              <h4 className="text-xs font-bold text-purple-300 flex items-center gap-1.5 uppercase tracking-wider">
                <UserCheck className="h-3.5 w-3.5 text-cyan-400" /> Входящие заявки ({pendingIncoming.length})
              </h4>
              <div className="space-y-1.5">
                {pendingIncoming.map((req) => {
                  const defaultAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(req.sender_name)}`;
                  return (
                    <div
                      key={req.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-purple-900/50 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <img
                          src={req.sender_avatar || defaultAvatar}
                          alt={req.sender_name}
                          className="h-7 w-7 rounded-full object-cover shrink-0 ring-1 ring-purple-500/40"
                        />
                        <span className="font-semibold text-slate-200 truncate">{req.sender_name}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          onClick={() => acceptFriendRequest(req.id)}
                          size="icon"
                          className="h-7 w-7 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg"
                          title="Принять"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          onClick={() => rejectFriendRequest(req.id)}
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-slate-400 hover:text-red-400 rounded-lg"
                          title="Отклонить"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Список друзей */}
          <ScrollArea className="flex-1 mt-3 pr-1">
            <div className="space-y-2">
              {friendsList.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  У вас пока нет друзей. Добавьте логин выше или найдите их в комнатах!
                </div>
              ) : (
                friendsList.map((friend) => {
                  const defaultAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(friend.username)}`;

                  return (
                    <div
                      key={friend.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/70 border border-purple-900/40 hover:border-purple-700 transition-all text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative shrink-0">
                          <img
                            src={friend.avatar_url || defaultAvatar}
                            alt={friend.username}
                            className="h-9 w-9 rounded-full object-cover ring-2 ring-purple-500/30"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = defaultAvatar;
                            }}
                          />
                          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-950" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-200 truncate">{friend.username}</h4>
                          <span className="text-[10px] text-purple-300 block truncate">
                            {friend.status_message || 'В сети 🎧'}
                          </span>
                        </div>
                      </div>

                      <Button
                        onClick={() => handleOpenChat(friend)}
                        size="sm"
                        className="bg-purple-800 hover:bg-purple-700 text-white text-[11px] h-8 px-2.5 gap-1 rounded-xl shrink-0"
                      >
                        <MessageSquare className="h-3.5 w-3.5 text-pink-400" />
                        <span>Чат</span>
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <DirectChatModal
        isOpen={isDirectChatOpen}
        onClose={() => setIsDirectChatOpen(false)}
        selectedFriend={selectedFriendForChat}
      />
    </>
  );
};