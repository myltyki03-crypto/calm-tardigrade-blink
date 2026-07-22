import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChatMessage, UserProfile } from '@/types/rave';
import { useRooms } from '@/context/RoomContext';
import { UserProfileModal } from '@/components/UserProfileModal';

interface RoomChatProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  floatingReactions?: { id: string; emoji: string; x: number }[];
}

const RAVE_REACTIONS = ['❤️', '🔥', '😂', '🎉', '💩', '😮'];

const formatMsgTime = (timeStr?: string) => {
  if (!timeStr) return '';
  if (timeStr.length <= 5 && timeStr.includes(':')) return timeStr;
  try {
    const d = new Date(timeStr);
    if (isNaN(d.getTime())) return timeStr;
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return timeStr;
  }
};

export const RoomChat: React.FC<RoomChatProps> = ({
  messages,
  onSendMessage,
}) => {
  const { currentUser } = useRooms();
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const validMessages = messages.filter((m) => {
    if (!m || !m.message || m.message.trim().length === 0) return false;
    if (m.type === 'reaction') return false;
    if (RAVE_REACTIONS.includes(m.message.trim())) return false;
    return true;
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [validMessages.length]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handleAuthorClick = (msg: ChatMessage) => {
    const userProfile: UserProfile = {
      id: msg.user_id,
      username: msg.user_name,
      avatar_url: msg.user_avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(msg.user_name)}`,
      is_online: true,
    };
    setSelectedUser(userProfile);
    setIsProfileModalOpen(true);
  };

  return (
    <>
      <div className="relative flex flex-col justify-between h-full w-full bg-slate-900/95 rounded-2xl md:rounded-3xl border border-purple-900/40 overflow-hidden shadow-xl">
        {/* Шапка чата */}
        <div className="p-2.5 px-3.5 border-b border-purple-900/30 flex items-center justify-between bg-slate-950/60 shrink-0">
          <span className="text-[11px] text-slate-300 flex items-center gap-1.5 font-bold">
            <Sparkles className="h-3.5 w-3.5 text-pink-400" /> Сообщения ({validMessages.length})
          </span>
        </div>

        {/* Сообщения */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2.5">
          {validMessages.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              Чат пуст. Напишите первое сообщение!
            </div>
          ) : (
            validMessages.map((msg) => {
              if (msg.type === 'system') {
                return (
                  <div key={msg.id} className="text-center my-1">
                    <span className="text-[10px] font-medium text-purple-300/80 bg-purple-950/40 px-2.5 py-0.5 rounded-full border border-purple-900/30">
                      {msg.message}
                    </span>
                  </div>
                );
              }

              const isMe = msg.user_id === currentUser.id;

              return (
                <div
                  key={msg.id}
                  className={`flex gap-2 text-xs ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {!isMe && (
                    <img
                      src={msg.user_avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(msg.user_name || 'user')}`}
                      alt={msg.user_name}
                      onClick={() => handleAuthorClick(msg)}
                      className="h-7 w-7 rounded-full object-cover shrink-0 ring-1 ring-purple-500/30 cursor-pointer hover:ring-pink-500 transition-all"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(msg.user_name || 'user')}`;
                      }}
                    />
                  )}
                  <div
                    className={`max-w-[82%] rounded-2xl px-3.5 py-2 ${
                      isMe
                        ? 'bg-gradient-to-r from-purple-700 via-pink-600 to-pink-500 text-white rounded-tr-none shadow-md shadow-pink-500/10'
                        : 'bg-slate-950/90 border border-purple-900/50 text-slate-200 rounded-tl-none'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      {!isMe && (
                        <span
                          onClick={() => handleAuthorClick(msg)}
                          className="font-bold text-[10px] text-pink-400 truncate max-w-[110px] cursor-pointer hover:underline"
                        >
                          {msg.user_name}
                        </span>
                      )}
                      <span className="text-[9px] opacity-60 text-slate-300 ml-auto font-mono">
                        {formatMsgTime(msg.created_at)}
                      </span>
                    </div>
                    <p className="leading-relaxed break-words text-xs">{msg.message}</p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Форма ввода */}
        <form
          onSubmit={handleSend}
          className="mt-auto p-2 border-t border-purple-900/40 bg-slate-950 flex items-center gap-2 w-full shrink-0"
        >
          <Input
            placeholder="Написать сообщение..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="bg-slate-900 border-purple-900/60 text-xs text-slate-100 placeholder:text-slate-500 flex-1 h-9 rounded-full px-4 focus:border-pink-500"
          />
          <Button
            type="submit"
            size="icon"
            className="h-9 w-9 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 to-pink-500 text-white shrink-0 rounded-full shadow-md shadow-pink-500/20"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>

      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        targetUser={selectedUser}
      />
    </>
  );
};