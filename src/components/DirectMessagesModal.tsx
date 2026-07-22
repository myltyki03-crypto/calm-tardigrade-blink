import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, UserPlus, Check, X, Send, Users, Sparkles, UserX, ArrowLeft } from 'lucide-react';
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

interface DirectMessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTargetUser?: UserProfile | null;
}

export const DirectMessagesModal: React.FC<DirectMessagesModalProps> = ({
  isOpen,
  onClose,
  initialTargetUser = null,
}) => {
  const {
    currentUser,
    friendsList,
    friendRequests,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
    directMessages,
    getDirectMessagesWith,
    sendDirectMessage,
    activeDmUserId,
    setActiveDmUserId,
  } = useRooms();

  const [activeTab, setActiveTab] = useState<'chats' | 'requests'>('chats');
  const [inputText, setInputText] = useState('');
  const [mobileShowChat, setMobileShowChat] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Формируем уникальный список собеседников (из ЛС + друзья + открытый профиль)
  const conversationUsersMap = new Map<string, UserProfile>();

  // 1. Добавляем тех, с кем есть переписка
  directMessages.forEach((msg) => {
    if (msg.sender_id === currentUser.id && msg.receiver_id) {
      conversationUsersMap.set(msg.receiver_id, {
        id: msg.receiver_id,
        username: msg.receiver_name || 'Пользователь',
        avatar_url: msg.receiver_avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(msg.receiver_name || 'user')}`,
        is_online: true,
      });
    } else if (msg.receiver_id === currentUser.id && msg.sender_id) {
      conversationUsersMap.set(msg.sender_id, {
        id: msg.sender_id,
        username: msg.sender_name || 'Пользователь',
        avatar_url: msg.sender_avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(msg.sender_name || 'user')}`,
        is_online: true,
      });
    }
  });

  // 2. Добавляем принятых друзей
  friendsList.forEach((f) => {
    if (!conversationUsersMap.has(f.id)) {
      conversationUsersMap.set(f.id, f);
    }
  });

  // 3. Если перешли из карточки профиля конкретного юзера
  if (initialTargetUser && initialTargetUser.id !== currentUser.id) {
    conversationUsersMap.set(initialTargetUser.id, initialTargetUser);
  }

  const allConversations = Array.from(conversationUsersMap.values());

  // Определяем текущего выбранного собеседника
  const selectedUser =
    allConversations.find((u) => u.id === activeDmUserId) ||
    initialTargetUser ||
    allConversations[0] ||
    null;

  useEffect(() => {
    if (initialTargetUser) {
      setActiveDmUserId(initialTargetUser.id);
      setMobileShowChat(true);
    }
  }, [initialTargetUser]);

  const activeMessages = selectedUser ? getDirectMessagesWith(selectedUser.id) : [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages.length, mobileShowChat]);

  const handleSelectUser = (user: UserProfile) => {
    setActiveDmUserId(user.id);
    setMobileShowChat(true);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !inputText.trim()) return;
    sendDirectMessage(selectedUser, inputText.trim());
    setInputText('');
  };

  const pendingRequests = friendRequests.filter(
    (r) => r.receiver_id === currentUser.id && r.status === 'pending'
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-slate-900 text-slate-100 border-purple-900/60 sm:max-w-2xl h-[85vh] sm:h-[600px] p-0 flex flex-col overflow-hidden">
        <DialogHeader className="p-3 border-b border-purple-900/40 bg-slate-950 flex flex-row items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            {/* Кнопка Назад на мобильных при открытом чате */}
            {mobileShowChat && (
              <Button
                onClick={() => setMobileShowChat(false)}
                size="sm"
                variant="ghost"
                className="sm:hidden p-1 h-7 w-7 text-slate-300 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <DialogTitle className="text-xs sm:text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-300 flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4 text-pink-400" /> Сообщения и друзья
            </DialogTitle>
          </div>

          <div className="flex items-center gap-1.5 mr-6">
            <button
              onClick={() => {
                setActiveTab('chats');
                setMobileShowChat(false);
              }}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                activeTab === 'chats'
                  ? 'bg-purple-800 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Чаты
            </button>
            <button
              onClick={() => {
                setActiveTab('requests');
                setMobileShowChat(false);
              }}
              className={`relative px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                activeTab === 'requests'
                  ? 'bg-purple-800 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Заявки
              {pendingRequests.length > 0 && (
                <span className="ml-1 bg-pink-500 text-white text-[9px] px-1.5 py-0.2 rounded-full font-bold">
                  {pendingRequests.length}
                </span>
              )}
            </button>
          </div>
        </DialogHeader>

        {activeTab === 'requests' ? (
          <ScrollArea className="flex-1 p-4">
            <h4 className="text-xs font-bold text-purple-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <UserPlus className="h-4 w-4 text-cyan-400" /> Входящие заявки ({pendingRequests.length})
            </h4>

            {pendingRequests.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                Новых заявок в друзья нет
              </div>
            ) : (
              <div className="space-y-2">
                {pendingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/70 border border-purple-900/40"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={req.sender_avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(req.sender_name)}`}
                        alt={req.sender_name}
                        className="h-10 w-10 rounded-full object-cover ring-2 ring-purple-500/30"
                      />
                      <div>
                        <span className="font-bold text-xs text-slate-200">{req.sender_name}</span>
                        <p className="text-[10px] text-slate-400">Хочет добавиться в друзья</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        onClick={() => acceptFriendRequest(req.id)}
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-8 px-3 rounded-xl gap-1 font-bold"
                      >
                        <Check className="h-3.5 w-3.5" /> Принять
                      </Button>
                      <Button
                        onClick={() => rejectFriendRequest(req.id)}
                        size="sm"
                        variant="ghost"
                        className="text-slate-400 hover:text-red-400 hover:bg-red-950/30 text-xs h-8 px-2 rounded-xl"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        ) : (
          <div className="flex-1 flex min-h-0 w-full overflow-hidden">
            {/* Список диалогов (скрываем на мобильных, если открыт чат) */}
            <div
              className={`w-full sm:w-1/3 sm:min-w-[200px] border-r border-purple-900/40 bg-slate-950/50 flex flex-col shrink-0 ${
                mobileShowChat ? 'hidden sm:flex' : 'flex'
              }`}
            >
              <div className="p-2.5 border-b border-purple-900/30 bg-slate-950 text-[10px] uppercase font-bold text-slate-400 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3 text-pink-400" /> Диалоги ({allConversations.length})
                </span>
              </div>

              <ScrollArea className="flex-1">
                {allConversations.length === 0 ? (
                  <div className="p-4 text-center text-[11px] text-slate-500">
                    У вас пока нет переписок. Нажмите «Написать ЛС» в карточке любого участника!
                  </div>
                ) : (
                  allConversations.map((user) => {
                    const isSelected = selectedUser?.id === user.id;
                    const isFriend = friendsList.some((f) => f.id === user.id);
                    const avatar = user.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.username)}`;

                    return (
                      <div
                        key={user.id}
                        onClick={() => handleSelectUser(user)}
                        className={`flex items-center justify-between p-3 border-b border-purple-950/50 cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-purple-950/90 border-pink-500/50'
                            : 'hover:bg-purple-950/30'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={avatar}
                            alt={user.username}
                            className="h-8 w-8 rounded-full object-cover shrink-0 ring-1 ring-purple-500/40"
                          />
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-slate-200 truncate block">
                              {user.username}
                            </span>
                            <span className="text-[9px] text-slate-400">
                              {isFriend ? 'Друг' : 'Диалог'}
                            </span>
                          </div>
                        </div>

                        {isFriend && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm(`Удалить ${user.username} из друзей?`)) {
                                removeFriend(user.id);
                              }
                            }}
                            className="text-slate-600 hover:text-red-400 transition-colors p-1 shrink-0"
                            title="Удалить из друзей"
                          >
                            <UserX className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </ScrollArea>
            </div>

            {/* Окно сообщений (показываем на мобильных только если выбран чат) */}
            <div
              className={`flex-1 flex flex-col bg-slate-900 min-w-0 ${
                !mobileShowChat ? 'hidden sm:flex' : 'flex'
              }`}
            >
              {selectedUser ? (
                <>
                  <div className="p-2.5 px-3 border-b border-purple-900/40 bg-slate-950 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                      <img
                        src={selectedUser.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(selectedUser.username)}`}
                        alt={selectedUser.username}
                        className="h-7 w-7 rounded-full object-cover ring-1 ring-pink-500/50"
                      />
                      <div>
                        <span className="text-xs font-bold text-slate-100 block">{selectedUser.username}</span>
                        <span className="text-[9px] text-emerald-400 flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> В сети
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                    {activeMessages.length === 0 ? (
                      <div className="text-center py-12 text-slate-500 text-xs">
                        Нет сообщений с {selectedUser.username}. Напишите первое сообщение!
                      </div>
                    ) : (
                      activeMessages.map((msg) => {
                        const isMe = msg.sender_id === currentUser.id;
                        return (
                          <div
                            key={msg.id}
                            className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                                isMe
                                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-tr-none shadow-md'
                                  : 'bg-slate-950 border border-purple-900/60 text-slate-200 rounded-tl-none'
                              }`}
                            >
                              <p className="break-words">{msg.message}</p>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  <form onSubmit={handleSendMessage} className="p-2 border-t border-purple-900/40 bg-slate-950 flex items-center gap-2 shrink-0">
                    <Input
                      placeholder={`Сообщение для ${selectedUser.username}...`}
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      className="bg-slate-900 border-purple-900/60 text-xs text-slate-100 h-9 rounded-full px-4 focus:border-pink-500 flex-1"
                    />
                    <Button
                      type="submit"
                      size="icon"
                      className="h-9 w-9 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 to-pink-500 text-white rounded-full shrink-0 shadow-md"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-500 text-xs">
                  <Sparkles className="h-8 w-8 text-purple-500/40 mb-2" />
                  Выберите диалог из списка, чтобы начать переписку
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};