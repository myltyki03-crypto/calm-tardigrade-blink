import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserProfile } from '@/types/rave';
import { useRooms } from '@/context/RoomContext';

interface DirectChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedFriend: UserProfile | null;
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

export const DirectChatModal: React.FC<DirectChatModalProps> = ({
  isOpen,
  onClose,
  selectedFriend,
}) => {
  const { currentUser, directMessages, sendDirectMessage } = useRooms();
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  if (!selectedFriend) return null;

  const conversation = directMessages.filter(
    (m) =>
      (m.sender_id === currentUser.id && (m.receiver_id === selectedFriend.id || m.receiver_name.toLowerCase() === selectedFriend.username.toLowerCase())) ||
      (m.receiver_id === currentUser.id && (m.sender_id === selectedFriend.id || m.sender_name.toLowerCase() === selectedFriend.username.toLowerCase())) ||
      (m.sender_name.toLowerCase() === currentUser.username.toLowerCase() && m.receiver_name.toLowerCase() === selectedFriend.username.toLowerCase()) ||
      (m.receiver_name.toLowerCase() === currentUser.username.toLowerCase() && m.sender_name.toLowerCase() === selectedFriend.username.toLowerCase())
  );

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [isOpen, conversation.length]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedFriend) return;
    sendDirectMessage(
      selectedFriend.id || `usr_${selectedFriend.username}`,
      selectedFriend.username,
      inputText.trim()
    );
    setInputText('');
  };

  const defaultAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(selectedFriend.username)}`;
  const displayAvatar = selectedFriend.avatar_url || defaultAvatar;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-slate-900 text-slate-100 border-purple-900/60 sm:max-w-md p-0 overflow-hidden flex flex-col h-[520px]">
        <DialogHeader className="p-3 bg-slate-950 border-b border-purple-900/40 flex flex-row items-center gap-2.5 space-y-0 shrink-0">
          <div className="relative">
            <img
              src={displayAvatar}
              alt={selectedFriend.username}
              className="h-8 w-8 rounded-full object-cover ring-2 ring-pink-500/50"
              onError={(e) => {
                (e.target as HTMLImageElement).src = defaultAvatar;
              }}
            />
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-950" />
          </div>

          <div>
            <DialogTitle className="text-sm font-bold text-white leading-none">
              {selectedFriend.username}
            </DialogTitle>
            <p className="text-[10px] text-purple-300 mt-1">Личный диалог</p>
          </div>
        </DialogHeader>

        {/* Переписка */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2.5 bg-slate-900/80">
          {conversation.length === 0 ? (
            <div className="text-center py-16 text-xs text-slate-500 flex flex-col items-center gap-2">
              <MessageSquare className="h-8 w-8 text-purple-800" />
              <span>Начните переписку с {selectedFriend.username}!</span>
            </div>
          ) : (
            conversation.map((msg) => {
              const isMe =
                msg.sender_id === currentUser.id ||
                msg.sender_name.toLowerCase() === currentUser.username.toLowerCase();

              return (
                <div
                  key={msg.id}
                  className={`flex text-xs ${isMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-xl px-3 py-2 ${
                      isMe
                        ? 'bg-gradient-to-r from-purple-700 to-pink-600 text-white rounded-tr-none shadow-md'
                        : 'bg-slate-950 border border-purple-900/50 text-slate-200 rounded-tl-none'
                    }`}
                  >
                    <p className="leading-relaxed break-words">{msg.message}</p>
                    <span className="text-[9px] opacity-60 text-slate-300 block text-right mt-0.5 font-mono">
                      {formatMsgTime(msg.created_at)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Поле ввода */}
        <form
          onSubmit={handleSend}
          className="p-2.5 border-t border-purple-900/40 bg-slate-950 flex items-center gap-2 shrink-0"
        >
          <Input
            placeholder="Напишите личное сообщение..."
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
      </DialogContent>
    </Dialog>
  );
};