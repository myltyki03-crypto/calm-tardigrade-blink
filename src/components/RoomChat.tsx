import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChatMessage } from '@/types/rave';
import { useRooms } from '@/context/RoomContext';

interface RoomChatProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  floatingReactions: { id: string; emoji: string; x: number }[];
}

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
  floatingReactions,
}) => {
  const { currentUser } = useRooms();
  const [inputText, setInputText] = useState('');
  const [isMicOn, setIsMicOn] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Фильтруем сообщения, исключая пустые
  const validMessages = messages.filter((m) => m && m.message && m.message.trim().length > 0);

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

  return (
    <div className="relative flex flex-col justify-between h-full w-full bg-slate-900/95 overflow-hidden">
      {/* Анимация реакций */}
      <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
        {floatingReactions.map((item) => (
          <div
            key={item.id}
            style={{ left: `${item.x}%` }}
            className="absolute bottom-12 text-3xl animate-bounce transition-all duration-1000 ease-out opacity-90 scale-125"
          >
            {item.emoji}
          </div>
        ))}
      </div>

      {/* Подшапка чата */}
      <div className="p-2.5 border-b border-purple-900/30 flex items-center justify-between bg-slate-950/40 shrink-0">
        <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
          <Sparkles className="h-3 w-3 text-pink-400" /> Сообщений: {validMessages.length}
        </span>
        <Button
          onClick={() => setIsMicOn(!isMicOn)}
          size="sm"
          variant="ghost"
          className={`h-6 px-2 text-[10px] rounded-full gap-1 border ${
            isMicOn
              ? 'bg-pink-950/60 border-pink-500/60 text-pink-300 animate-pulse'
              : 'border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          {isMicOn ? <Mic className="h-3 w-3 text-pink-400" /> : <MicOff className="h-3 w-3" />}
          <span>{isMicOn ? 'Голос вкл' : 'Микр выкл'}</span>
        </Button>
      </div>

      {/* Список сообщений (занимает всё свободное место) */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2.5">
        {validMessages.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            Чат пуст. Напишите первое сообщение!
          </div>
        ) : (
          validMessages.map((msg) => {
            if (msg.type === 'system') {
              return (
                <div key={msg.id} className="text-center my-1.5">
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
                    className="h-6 w-6 rounded-full object-cover shrink-0 ring-1 ring-purple-500/30"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(msg.user_name || 'user')}`;
                    }}
                  />
                )}
                <div
                  className={`max-w-[82%] rounded-xl px-3 py-2 ${
                    isMe
                      ? 'bg-gradient-to-r from-purple-700 to-pink-600 text-white rounded-tr-none shadow-md'
                      : 'bg-slate-950/80 border border-purple-900/40 text-slate-200 rounded-tl-none'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    {!isMe && (
                      <span className="font-semibold text-[10px] text-pink-400 truncate max-w-[100px]">
                        {msg.user_name}
                      </span>
                    )}
                    <span className="text-[9px] opacity-60 text-slate-300 ml-auto font-mono">
                      {formatMsgTime(msg.created_at)}
                    </span>
                  </div>
                  <p className="leading-snug break-words text-xs">{msg.message}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Форма отправки прижата строго книзу */}
      <form
        onSubmit={handleSend}
        className="mt-auto p-2.5 border-t border-purple-900/40 bg-slate-950 flex items-center gap-2 w-full shrink-0"
      >
        <Input
          placeholder="Напишите сообщение..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="bg-slate-900 border-purple-900/50 focus:border-pink-500 text-xs text-slate-100 placeholder:text-slate-500 flex-1 h-9 rounded-xl"
        />
        <Button
          type="submit"
          size="icon"
          className="h-9 w-9 bg-pink-600 hover:bg-pink-500 text-white shrink-0 rounded-xl shadow-md"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
};