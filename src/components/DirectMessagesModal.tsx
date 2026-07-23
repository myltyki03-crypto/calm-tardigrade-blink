import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  UserPlus,
  Check,
  X,
  Send,
  Users,
  Sparkles,
  UserX,
  ArrowLeft,
  Image as ImageIcon,
  Mic,
  Trash2,
  User,
  Search,
  UserCheck,
} from 'lucide-react';
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
import { VoicePlayer } from '@/components/VoicePlayer';
import { UserProfileModal } from '@/components/UserProfileModal';
import { showError, showSuccess } from '@/utils/toast';

interface DirectMessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTargetUser?: UserProfile | null;
}

const formatMsgTime = (timeStr?: string) => {
  if (!timeStr) return '';
  try {
    const d = new Date(timeStr);
    if (isNaN(d.getTime())) return timeStr;
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return timeStr;
  }
};

const formatDateHeader = (timeStr?: string) => {
  if (!timeStr) return '';
  try {
    const d = new Date(timeStr);
    if (isNaN(d.getTime())) return '';
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const msgDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());

    if (msgDate.getTime() === today.getTime()) {
      return 'Сегодня';
    } else if (msgDate.getTime() === yesterday.getTime()) {
      return 'Вчера';
    } else if (msgDate.getFullYear() === now.getFullYear()) {
      return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
    } else {
      return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
    }
  } catch {
    return '';
  }
};

const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const max = 1000;
        if (width > max || height > max) {
          if (width > height) {
            height = Math.round((height * max) / width);
            width = max;
          } else {
            width = Math.round((width * max) / height);
            height = max;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

export const DirectMessagesModal: React.FC<DirectMessagesModalProps> = ({
  isOpen,
  onClose,
  initialTargetUser = null,
}) => {
  const {
    currentUser,
    friendsList,
    friendRequests,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
    directMessages,
    getDirectMessagesWith,
    sendDirectMessage,
    activeDmUserId,
    setActiveDmUserId,
    markDmAsRead,
    getUnreadCountWith,
  } = useRooms();

  const [activeTab, setActiveTab] = useState<'chats' | 'friends' | 'requests'>('chats');
  const [inputText, setInputText] = useState('');
  const [friendSearchQuery, setFriendSearchQuery] = useState('');
  const [addFriendInput, setAddFriendInput] = useState('');
  const [mobileShowChat, setMobileShowChat] = useState<boolean>(false);
  const [fullImagePreview, setFullImagePreview] = useState<string | null>(null);

  const [selectedProfileUser, setSelectedProfileUser] = useState<UserProfile | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const myName = currentUser.username.toLowerCase();

  const conversationUsersMap = new Map<string, UserProfile>();

  directMessages.forEach((msg) => {
    const sName = msg.sender_name.toLowerCase();
    const rName = msg.receiver_name.toLowerCase();

    if (sName === myName && msg.receiver_name) {
      conversationUsersMap.set(rName, {
        id: msg.receiver_id || rName,
        username: msg.receiver_name,
        avatar_url: msg.receiver_avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(msg.receiver_name)}`,
        is_online: true,
      });
    } else if (rName === myName && msg.sender_name) {
      conversationUsersMap.set(sName, {
        id: msg.sender_id || sName,
        username: msg.sender_name,
        avatar_url: msg.sender_avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(msg.sender_name)}`,
        is_online: true,
      });
    }
  });

  friendsList.forEach((f) => {
    const key = f.username.toLowerCase();
    if (!conversationUsersMap.has(key)) {
      conversationUsersMap.set(key, f);
    }
  });

  if (initialTargetUser && initialTargetUser.username.toLowerCase() !== myName) {
    conversationUsersMap.set(initialTargetUser.username.toLowerCase(), initialTargetUser);
  }

  const allConversations = Array.from(conversationUsersMap.values());

  const selectedUser =
    allConversations.find(
      (u) =>
        u.id === activeDmUserId ||
        u.username.toLowerCase() === (activeDmUserId || '').toLowerCase()
    ) ||
    initialTargetUser ||
    allConversations[0] ||
    null;

  useEffect(() => {
    if (initialTargetUser) {
      setActiveDmUserId(initialTargetUser.id || initialTargetUser.username);
      setMobileShowChat(true);
    }
  }, [initialTargetUser]);

  useEffect(() => {
    if (selectedUser) {
      markDmAsRead(selectedUser.username);
    }
  }, [selectedUser?.username, directMessages.length, isOpen]);

  const activeMessages = selectedUser ? getDirectMessagesWith(selectedUser.id, selectedUser.username) : [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages.length, mobileShowChat, isRecording]);

  const handleSelectUser = (user: UserProfile) => {
    setActiveDmUserId(user.username);
    markDmAsRead(user.username);
    setMobileShowChat(true);
  };

  const handleOpenUserProfile = (user: UserProfile) => {
    setSelectedProfileUser(user);
    setIsProfileModalOpen(true);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !inputText.trim()) return;
    sendDirectMessage(selectedUser, inputText.trim());
    setInputText('');
  };

  const handleAddFriendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = addFriendInput.trim();
    if (!cleanName) {
      showError('Введите логин пользователя');
      return;
    }

    if (cleanName.toLowerCase() === myName) {
      showError('Нельзя добавить самого себя');
      return;
    }

    const targetUser: UserProfile = {
      id: `usr_${cleanName}`,
      username: cleanName,
      avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanName)}`,
      is_online: true,
    };

    await sendFriendRequest(targetUser);
    setAddFriendInput('');
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedUser) return;

    if (!file.type.startsWith('image/')) {
      showError('Пожалуйста, выберите файл изображения');
      return;
    }

    try {
      const base64Photo = await compressImage(file);
      sendDirectMessage(selectedUser, base64Photo);
      showSuccess('Фото отправлено!');
    } catch {
      showError('Не удалось отправить фото');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleStartRecording = async () => {
    if (!selectedUser) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch {
      showError('Разрешите доступ к микрофону в браузере');
    }
  };

  const handleStopAndSendRecording = () => {
    if (!mediaRecorderRef.current) return;

    mediaRecorderRef.current.onstop = () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Audio = reader.result as string;
        if (selectedUser && base64Audio) {
          sendDirectMessage(selectedUser, base64Audio);
          showSuccess('Голосовое сообщение отправлено!');
        }
      };
      reader.readAsDataURL(base64Audio);

      mediaRecorderRef.current?.stream.getTracks().forEach((track) => track.stop());
    };

    mediaRecorderRef.current.stop();
    setIsRecording(false);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
  };

  const handleCancelRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
    setIsRecording(false);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
  };

  const pendingRequests = friendRequests.filter((r) => {
    const isForMe =
      r.receiver_id === currentUser.id ||
      r.receiver_name.toLowerCase() === myName;
    return isForMe && r.status === 'pending';
  });

  const filteredFriends = friendsList.filter((f) =>
    f.username.toLowerCase().includes(friendSearchQuery.toLowerCase().trim())
  );

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="bg-slate-900 text-slate-100 border-purple-900/60 sm:max-w-2xl h-[85vh] sm:h-[600px] p-0 flex flex-col overflow-hidden">
          <DialogHeader className="p-3 border-b border-purple-900/40 bg-slate-950 flex flex-row items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              {mobileShowChat && activeTab === 'chats' && (
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

            <div className="flex items-center gap-1 sm:gap-1.5 mr-6">
              <button
                onClick={() => {
                  setActiveTab('chats');
                  setMobileShowChat(false);
                }}
                className={`px-2.5 sm:px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                  activeTab === 'chats'
                    ? 'bg-purple-800 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Чаты
              </button>

              <button
                onClick={() => {
                  setActiveTab('friends');
                  setMobileShowChat(false);
                }}
                className={`px-2.5 sm:px-3 py-1 rounded-full text-[11px] font-bold transition-all flex items-center gap-1 ${
                  activeTab === 'friends'
                    ? 'bg-purple-800 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Друзья</span>
                <span className="text-[9px] bg-slate-950/80 px-1.5 py-0.2 rounded-full text-pink-300 font-mono">
                  {friendsList.length}
                </span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('requests');
                  setMobileShowChat(false);
                }}
                className={`relative px-2.5 sm:px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                  activeTab === 'requests'
                    ? 'bg-purple-800 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Заявки
                {pendingRequests.length > 0 && (
                  <span className="ml-1 bg-pink-500 text-white text-[9px] px-1.5 py-0.2 rounded-full font-bold animate-pulse">
                    {pendingRequests.length}
                  </span>
                )}
              </button>
            </div>
          </DialogHeader>

          {/* ВКЛАДКА 1: СПИСОК ДРУЗЕЙ И ФОРМА ДОБАВЛЕНИЯ */}
          {activeTab === 'friends' && (
            <div className="flex-1 flex flex-col p-4 overflow-hidden bg-slate-950/40">
              {/* Форма отправки заявки в друзья по логину */}
              <form onSubmit={handleAddFriendSubmit} className="mb-3 bg-purple-950/40 p-2.5 rounded-2xl border border-purple-900/50 flex items-center gap-2">
                <div className="relative flex-1">
                  <UserPlus className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-pink-400" />
                  <Input
                    placeholder="Добавить по логину (никнейму)..."
                    value={addFriendInput}
                    onChange={(e) => setAddFriendInput(e.target.value)}
                    className="pl-8 bg-slate-900/90 border-purple-800/60 text-xs h-9 rounded-xl text-slate-100 placeholder:text-slate-500 focus:border-pink-500"
                  />
                </div>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 to-pink-500 text-white font-bold text-xs h-9 px-3.5 rounded-xl gap-1 shrink-0 shadow-md"
                >
                  <UserPlus className="h-3.5 w-3.5" /> Добавить
                </Button>
              </form>

              <div className="flex items-center justify-between mb-3 gap-2">
                <h4 className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5 shrink-0">
                  <UserCheck className="h-4 w-4 text-emerald-400" /> Мои друзья ({friendsList.length})
                </h4>

                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-500" />
                  <Input
                    placeholder="Поиск по друзьям..."
                    value={friendSearchQuery}
                    onChange={(e) => setFriendSearchQuery(e.target.value)}
                    className="pl-8 bg-slate-900/90 border-purple-900/50 text-xs h-8 rounded-full text-slate-100 placeholder:text-slate-500 focus:border-pink-500"
                  />
                </div>
              </div>

              <ScrollArea className="flex-1 pr-1">
                {filteredFriends.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-xs space-y-2">
                    <Users className="h-8 w-8 text-purple-500/30 mx-auto" />
                    <p>
                      {friendsList.length === 0
                        ? 'У вас пока нет добавленных друзей. Отправляйте заявки выше!'
                        : 'Друзья по вашему запросу не найдены'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredFriends.map((friend) => {
                      const avatar =
                        friend.avatar_url ||
                        `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(friend.username)}`;

                      return (
                        <div
                          key={friend.id || friend.username}
                          className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/70 border border-purple-900/40 hover:border-purple-800 transition-all"
                        >
                          <div
                            onClick={() => handleOpenUserProfile(friend)}
                            className="flex items-center gap-3 cursor-pointer group min-w-0"
                          >
                            <div className="relative shrink-0">
                              <img
                                src={avatar}
                                alt={friend.username}
                                className="h-10 w-10 rounded-full object-cover ring-2 ring-purple-500/40 group-hover:ring-pink-500 transition-all"
                              />
                              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-950" />
                            </div>

                            <div className="min-w-0">
                              <span className="font-bold text-xs text-slate-200 group-hover:text-pink-300 transition-colors block truncate">
                                {friend.username}
                              </span>
                              <span className="text-[10px] text-emerald-400 font-medium">В сети</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <Button
                              onClick={() => {
                                handleSelectUser(friend);
                                setActiveTab('chats');
                              }}
                              size="sm"
                              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 to-pink-500 text-white font-bold text-[11px] h-8 px-3 rounded-xl gap-1 shadow-md"
                            >
                              <MessageSquare className="h-3.5 w-3.5 text-pink-300" /> Написать ЛС
                            </Button>

                            <Button
                              onClick={() => handleOpenUserProfile(friend)}
                              size="sm"
                              variant="outline"
                              className="border-purple-800 text-purple-200 hover:bg-purple-950 text-[11px] h-8 px-2.5 rounded-xl"
                              title="Карточка профиля"
                            >
                              <User className="h-3.5 w-3.5 text-cyan-400" />
                            </Button>

                            <Button
                              onClick={() => {
                                if (window.confirm(`Удалить ${friend.username} из друзей?`)) {
                                  removeFriend(friend.id);
                                }
                              }}
                              size="sm"
                              variant="ghost"
                              className="text-slate-500 hover:text-red-400 hover:bg-red-950/30 text-[11px] h-8 px-2 rounded-xl"
                              title="Удалить из друзей"
                            >
                              <UserX className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </div>
          )}

          {/* ВКЛАДКА 2: ВХОДЯЩИЕ ЗАЯВКИ В ДРУЗЬЯ */}
          {activeTab === 'requests' && (
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
          )}

          {/* ВКЛАДКА 3: ДИАЛОГИ / ЧАТЫ */}
          {activeTab === 'chats' && (
            <div className="flex-1 flex min-h-0 w-full overflow-hidden">
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
                      const isSelected = selectedUser?.username.toLowerCase() === user.username.toLowerCase();
                      const isFriend = friendsList.some((f) => f.username.toLowerCase() === user.username.toLowerCase());
                      const avatar = user.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.username)}`;
                      const unreadCount = getUnreadCountWith(user.username);

                      return (
                        <div
                          key={user.id || user.username}
                          onClick={() => handleSelectUser(user)}
                          className={`flex items-center justify-between p-3 border-b border-purple-950/50 cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-purple-900/80 border-pink-500/50'
                              : 'hover:bg-purple-950/30'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="relative shrink-0">
                              <img
                                src={avatar}
                                alt={user.username}
                                className="h-8 w-8 rounded-full object-cover ring-1 ring-purple-500/40"
                              />
                              {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-pink-500 text-white text-[9px] font-extrabold h-4 w-4 rounded-full flex items-center justify-center ring-2 ring-slate-950 animate-bounce">
                                  {unreadCount}
                                </span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-slate-200 truncate block">
                                {user.username}
                              </span>
                              <span className="text-[9px] text-slate-400 flex items-center gap-1">
                                {isFriend ? 'Друг' : 'Диалог'}
                                {unreadCount > 0 && (
                                  <span className="text-pink-400 font-bold">• Новое</span>
                                )}
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

              <div
                className={`flex-1 flex flex-col bg-slate-900 min-w-0 ${
                  !mobileShowChat ? 'hidden sm:flex' : 'flex'
                }`}
              >
                {selectedUser ? (
                  <>
                    <div className="p-2.5 px-3 border-b border-purple-900/40 bg-slate-950 flex items-center justify-between shrink-0">
                      <div
                        onClick={() => handleOpenUserProfile(selectedUser)}
                        className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                        title="Нажмите, чтобы открыть профиль"
                      >
                        <img
                          src={selectedUser.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(selectedUser.username)}`}
                          alt={selectedUser.username}
                          className="h-8 w-8 rounded-full object-cover ring-2 ring-pink-500/50"
                        />
                        <div>
                          <span className="text-xs font-bold text-slate-100 block hover:underline">
                            {selectedUser.username}
                          </span>
                          <span className="text-[9px] text-emerald-400 flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> В сети
                          </span>
                        </div>
                      </div>

                      <Button
                        onClick={() => handleOpenUserProfile(selectedUser)}
                        size="sm"
                        variant="outline"
                        className="h-7 text-[10px] px-2.5 border-purple-800 text-purple-200 hover:bg-purple-900/60 rounded-xl gap-1"
                      >
                        <User className="h-3 w-3 text-pink-400" /> Профиль
                      </Button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-slate-950/40">
                      {activeMessages.length === 0 ? (
                        <div className="text-center py-12 text-slate-500 text-xs">
                          Нет сообщений с {selectedUser.username}. Напишите первое сообщение!
                        </div>
                      ) : (
                        activeMessages.map((msg, index) => {
                          const isMe =
                            msg.sender_id === currentUser.id ||
                            msg.sender_name.toLowerCase() === myName;

                          const isPhoto = msg.message.startsWith('data:image/');
                          const isAudio = msg.message.startsWith('data:audio/');

                          const dateHeader = formatDateHeader(msg.created_at);
                          const prevMsg = index > 0 ? activeMessages[index - 1] : null;
                          const prevDateHeader = prevMsg ? formatDateHeader(prevMsg.created_at) : null;
                          const showDateDivider = Boolean(dateHeader && dateHeader !== prevDateHeader);

                          return (
                            <React.Fragment key={msg.id}>
                              {showDateDivider && (
                                <div className="flex justify-center my-3 sticky top-1 z-10">
                                  <span className="text-[10px] font-bold text-purple-200 bg-slate-900 border border-purple-800/60 px-3 py-0.5 rounded-full backdrop-blur-md shadow-md">
                                    {dateHeader}
                                  </span>
                                </div>
                              )}
                              <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                <div
                                  className={`max-w-[85%] rounded-2xl p-2.5 text-xs leading-relaxed ${
                                    isMe
                                      ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-pink-500 text-white rounded-tr-none shadow-md'
                                      : 'bg-slate-800/90 border border-purple-500/40 text-slate-100 rounded-tl-none shadow-md'
                                  }`}
                                >
                                  {isPhoto ? (
                                    <div className="relative group overflow-hidden rounded-xl cursor-pointer">
                                      <img
                                        src={msg.message}
                                        alt="Фото"
                                        onClick={() => setFullImagePreview(msg.message)}
                                        className="max-h-56 w-auto object-cover rounded-xl transition-transform hover:scale-105"
                                      />
                                    </div>
                                  ) : isAudio ? (
                                    <VoicePlayer src={msg.message} isMe={isMe} />
                                  ) : (
                                    <p className="break-words px-1 font-medium">{msg.message}</p>
                                  )}

                                  <div className={`text-[9px] mt-1 text-right font-mono ${isMe ? 'text-pink-100' : 'text-slate-300'}`}>
                                    {formatMsgTime(msg.created_at)}
                                  </div>
                                </div>
                              </div>
                            </React.Fragment>
                          );
                        })
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    <div className="p-2 border-t border-purple-900/40 bg-slate-950 flex items-center gap-2 shrink-0">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoSelect}
                        className="hidden"
                      />

                      {isRecording ? (
                        <div className="flex-1 flex items-center justify-between bg-slate-900 border border-red-500/50 rounded-full px-4 h-9 animate-pulse">
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-ping" />
                            <span className="text-xs font-mono font-bold text-red-400">
                              Запись: 0:{recordingTime < 10 ? `0${recordingTime}` : recordingTime}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={handleCancelRecording}
                              className="text-slate-400 hover:text-red-400 p-1"
                              title="Отмена"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={handleStopAndSendRecording}
                              className="bg-red-600 hover:bg-red-500 text-white rounded-full p-1 shadow-md"
                              title="Отправить"
                            >
                              <Send className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <Button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            size="icon"
                            variant="ghost"
                            className="h-9 w-9 text-slate-400 hover:text-pink-400 hover:bg-purple-950/50 rounded-full shrink-0"
                            title="Отправить фото"
                          >
                            <ImageIcon className="h-4 w-4" />
                          </Button>

                          <form onSubmit={handleSendMessage} className="flex-1 flex items-center gap-2">
                            <Input
                              placeholder={`Сообщение для ${selectedUser.username}...`}
                              value={inputText}
                              onChange={(e) => setInputText(e.target.value)}
                              className="bg-slate-900 border-purple-900/60 text-xs text-slate-100 h-9 rounded-full px-4 focus:border-pink-500 flex-1"
                            />

                            {inputText.trim() ? (
                              <Button
                                type="submit"
                                size="icon"
                                className="h-9 w-9 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 to-pink-500 text-white rounded-full shrink-0 shadow-md"
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                onClick={handleStartRecording}
                                size="icon"
                                className="h-9 w-9 bg-purple-800 hover:bg-purple-700 text-pink-300 rounded-full shrink-0 shadow-md"
                                title="Записать голосовое сообщение"
                              >
                                <Mic className="h-4 w-4" />
                              </Button>
                            )}
                          </form>
                        </>
                      )}
                    </div>
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

      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        targetUser={selectedProfileUser}
      />

      {fullImagePreview && (
        <Dialog open={Boolean(fullImagePreview)} onOpenChange={() => setFullImagePreview(null)}>
          <DialogContent className="bg-slate-950/95 border-purple-900/60 p-2 sm:max-w-3xl flex flex-col items-center justify-center">
            <img
              src={fullImagePreview}
              alt="Просмотр изображения"
              className="max-h-[80vh] w-auto object-contain rounded-2xl shadow-2xl"
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};