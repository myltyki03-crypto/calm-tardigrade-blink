import React, { useState } from 'react';
import { Send, Mic, MicOff, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
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

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  return (
    <div className="relative flex flex-col h-full w-full rounded-2xl border border-purple-900/40 bg-slate-900/95 overflow-hidden">
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

      {/* Шапка чата */}
      <div className="p-3 border-b border-purple-900/40 flex items-center justify-between bg-slate-950/60">
        <h4 className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-pink-400" /> Чат вечеринки
        </h4>
        <Button
          onClick={() => setIsMicOn(!isMicOn)}
          size="sm"
          variant="ghost"
          className={`h-7 px-2 text-xs rounded-full gap-1 border ${
            isMicOn
              ? 'bg-pink-950/60 border-pink-500/60 text-pink-300 animate-pulse'
              : 'border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          {isMicOn ? <Mic className="h-3.5 w-3.5 text-pink-400" /> : <MicOff className="h-3.5 w-3.5" />}
          <span>{isMicOn ? 'Голос вкл' : 'Микр выкл'}</span>
        </Button>
      </div>

      {/* Сообщения */}
      <ScrollArea className="flex-1 p-3">
        <div className="space-y-3">
          {messages.map((msg) => {
            if (msg.type === 'system') {
              return (
                <div key={msg.id} className="text-center my-2">
                  <span className="text-[10px] font-medium text-purple-300/70 bg-purple-950/40 px-2.5 py-0.5 rounded-full border border-purple-900/30">
                    {msg.message}
                  </span>
                </div>
              );
            }

            const isMe = msg.user_id === currentUser.id;

            return (
              <div
                key={msg.id}
                className={`flex gap-2.5 text-xs ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {!isMe && (
                  <img
                    src={msg.user_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                    alt={msg.user_name}
                    className="h-7 w-7 rounded-full object-cover shrink-0 ring-1 ring-purple-500/30"
                  />
                )}
                <div
                  className={`max-w-[78%] rounded-2xl p-2.5 ${
                    isMe
                      ? 'bg-gradient-to-r from-purple-700 to-pink-600 text-white rounded-tr-none'
                      : 'bg-slate-950/80 border border-purple-900/30 text-slate-200 rounded-tl-none'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    {!isMe && (
                      <div className="font-semibold text-[10px] text-pink-400">
                        {msg.user_name}
                      </div>
                    )}
                    <span className="text-[9px] opacity-60 text-slate-300 ml-auto font-mono">
                      {formatMsgTime(msg.created_at)}
                    </span>
                  </div>
                  <p className="leading-relaxed break-words">{msg.message}</p>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Форма отправки */}
      <form onSubmit={handleSend} className="p-2 border-t border-purple-900/40 bg-slate-950/80 flex items-center gap-1.5 w-full">
        <Input
          placeholder="Напишите сообщение..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="bg-slate-900 border-purple-900/50 focus:border-pink-500 text-xs text-slate-100 placeholder:text-slate-500 flex-1"
        />
        <Button
          type="submit"
          size="icon"
          className="h-9 w-9 bg-pink-600 hover:bg-pink-500 text-white shrink-0 rounded-xl"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
};