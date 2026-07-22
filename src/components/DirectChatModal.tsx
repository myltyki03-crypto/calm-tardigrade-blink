import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, ArrowLeft, User, Sparkles, Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRooms } from '@/context/RoomContext';
import { UserProfile } from '@/types/rave';

interface DirectChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedFriend?: UserProfile | null;
}

const formatTime = (timeStr?: string) => {
  if (!timeStr) return '';
  try {
    const d = new Date(timeStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

export const DirectChatModal: React.FC<DirectChatModalProps> = ({
  isOpen,
  onClose,
  selectedFriend: initialSelectedFriend,
}) => {
  const { currentUser, friendsList, directMessages, sendDirectMessage } = useRooms();
  
  const [activeFriend, setActiveFriend] = useState<UserProfile | null>(initialSelectedFriend || null);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialSelectedFriend) {
      setActiveFriend(initialSelectedFriend);
    } else if (!activeFriend && friendsList.length > 0) {
      setActiveFriend(friendsList[0]);
    }
  }, [initialSelectedFriend, friendsList]);

  const myId = currentUser.id;
  const myName = currentUser.username.toLowerCase();

  // Фильтруем личные сообщения с выбранным другом
  const conversation = directMessages.filter((m) => {
    if (!activeFriend) return false;
    const friendId = activeFriend.id;
    const friendName = activeFriend.username.toLowerCase();

    const isMeSender = m.sender_id === myId || m.sender_name.toLowerCase() === myName;
    const isFriendSender = m.sender_id === friendId || m.sender_name.toLowerCase() === friendName;

    const isMeReceiver = m.receiver_id === myId || m.receiver_name.toLowerCase() === myName;
    const isFriendReceiver = m.receiver_id === friendId || m.receiver_name.toLowerCase() === friendName;

    return (isMeSender && isFriendReceiver) || (isFriendSender && isMeReceiver);
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation.length, activeFriend]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeFriend) return;

    const text = inputText.trim();
    setInputText('');

    await sendDirectMessage(activeFriend.id, activeFriend.username, text);
  };

  const filteredFriends = friendsList.filter((f) =>
    f.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-slate-900 text-slate-100 border-purple-900/60 sm:max-w-3xl h-[85vh] max-h-[650px] p-0 overflow-hidden flex flex-col">
        {/* Шапка модального окна */}
        <DialogHeader className="p-3 border-b border-purple-900/40 bg-slate-950/80 flex flex-row items-center justify-between shrink-0">
          <DialogTitle className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-300 flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-pink-500" /> Личные сообщения
          </DialogTitle>
        </DialogHeader>

        {/* Тело модального окна */}
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 w-full">
          {/* Левая боковая панель со списком собеседников */}
          <div className={`md:col-span-5 lg:col-span-4 border-r border-purple-900/40 bg-slate-950/60 flex flex-col h-full ${activeFriend ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-2 border-b border-purple-900/30">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
                <Input
                  placeholder="Поиск друга..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 bg-slate-900 border-purple-900/50 text-xs text-slate-100 h-8 rounded-xl"
                />
              </div>
            </div>

            <ScrollArea className="flex-1 p-2">
              <div className="space-y-1">
                {filteredFriends.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-500">
                    У вас пока нет друзей для чата
                  </div>
                ) : (
                  filteredFriends.map((friend) => {
                    const isSelected = activeFriend?.id === friend.id || activeFriend?.username.toLowerCase() === friend.username.toLowerCase();

                    return (
                      <button
                        key={friend.id}
                        onClick={() => setActiveFriend(friend)}
                        className={`w-full flex items-center gap-2.5 p-2 rounded-xl text-left transition-all ${
                          isSelected
                            ? 'bg-gradient-to-r from-purple-800/80 to-pink-700/80 text-white font-semibold shadow-md'
                            : 'hover:bg-purple-950/40 text-slate-300'
                        }`}
                      >
                        <div className="relative shrink-0">
                          <img
                            src={friend.avatar_url}
                            alt={friend.username}
                            className="h-9 w-9 rounded-full object-cover ring-1 ring-purple-500/40"
                          />
                          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-950" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold truncate">{friend.username}</p>
                          <p className="text-[10px] text-slate-400 truncate">В сети</p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Правая панель с окном переписки */}
          <div className={`md:col-span-7 lg:col-span-8 flex flex-col h-full bg-slate-900/95 ${!activeFriend ? 'hidden md:flex' : 'flex'}`}>
            {activeFriend ? (
              <>
                {/* Подшапка переписки */}
                <div className="p-2.5 border-b border-purple-900/40 bg-slate-950/60 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => setActiveFriend(null)}
                      variant="ghost"
                      size="sm"
                      className="md:hidden text-slate-400 p-1 h-7 w-7"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <img
                      src={activeFriend.avatar_url}
                      alt={activeFriend.username}
                      className="h-8 w-8 rounded-full object-cover ring-2 ring-pink-500/50"
                    />
                    <div>
                      <p className="text-xs font-bold text-white">{activeFriend.username}</p>
                      <p className="text-[10px] text-emerald-400 font-mono">Онлайн</p>
                    </div>
                  </div>
                </div>

                {/* Сообщения диалога */}
                <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2.5">
                  {conversation.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 text-xs">
                      Нет сообщений. Напишите первым!
                    </div>
                  ) : (
                    conversation.map((msg) => {
                      const isMe = msg.sender_id === myId || msg.sender_name.toLowerCase() === myName;

                      return (
                        <div
                          key={msg.id}
                          className={`flex gap-2 text-xs ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                        >
                          {!isMe && (
                            <img
                              src={msg.sender_avatar || activeFriend.avatar_url}
                              alt={msg.sender_name}
                              className="h-6 w-6 rounded-full object-cover shrink-0 ring-1 ring-purple-500/30"
                            />
                          )}
                          <div
                            className={`max-w-[78%] rounded-2xl px-3 py-2 ${
                              isMe
                                ? 'bg-gradient-to-r from-purple-700 to-pink-600 text-white rounded-tr-none shadow-md'
                                : 'bg-slate-950/90 border border-purple-900/50 text-slate-200 rounded-tl-none'
                            }`}
                          >
                            <p className="leading-snug break-words text-xs">{msg.message}</p>
                            <span className="text-[9px] opacity-60 text-slate-300 block text-right mt-1 font-mono">
                              {formatTime(msg.created_at)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Форма ввода сообщения */}
                <form
                  onSubmit={handleSend}
                  className="p-2.5 border-t border-purple-900/40 bg-slate-950 flex items-center gap-2 shrink-0"
                >
                  <Input
                    placeholder={`Сообщение для ${activeFriend.username}...`}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    className="bg-slate-900 border-purple-900/50 text-xs text-slate-100 placeholder:text-slate-500 flex-1 h-9 rounded-xl focus:border-pink-500"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className="h-9 w-9 bg-pink-600 hover:bg-pink-500 text-white shrink-0 rounded-xl shadow-md"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-500 text-xs">
                <MessageSquare className="h-10 w-10 text-purple-500/30 mb-2" />
                <span>Выберите друга слева, чтобы начать личную переписку</span>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};