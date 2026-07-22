import React, { useState } from 'react';
import { ListMusic, Plus, ThumbsUp, Play, Link as LinkIcon, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { QueueItem } from '@/types/rave';
import { showSuccess, showError } from '@/utils/toast';

interface RoomQueueProps {
  queue: QueueItem[];
  onAddQueueItem: (url: string) => void;
  onVoteItem: (id: string) => void;
  onPlayNow: (item: QueueItem) => void;
  isHost: boolean;
}

export const RoomQueue: React.FC<RoomQueueProps> = ({
  queue,
  onAddQueueItem,
  onVoteItem,
  onPlayNow,
  isHost,
}) => {
  const [urlInput, setUrlInput] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    onAddQueueItem(urlInput.trim());
    setUrlInput('');
    showSuccess('Added to Party Playlist Queue!');
  };

  return (
    <div className="flex flex-col h-full rounded-2xl border border-purple-900/40 bg-slate-900/95 overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-purple-900/40 flex items-center justify-between bg-slate-950/60">
        <h4 className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
          <ListMusic className="h-4 w-4 text-cyan-400" /> Upcoming Queue ({queue.length})
        </h4>
      </div>

      {/* Add track form - Доступен КАЖДОМУ */}
      <form onSubmit={handleAdd} className="p-2 border-b border-purple-900/30 bg-slate-950/40 flex items-center gap-1.5">
        <div className="relative flex-1">
          <LinkIcon className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
          <Input
            placeholder="Paste YouTube or video link..."
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            className="pl-8 bg-slate-900 border-purple-900/50 text-xs text-slate-100 placeholder:text-slate-500 h-8"
          />
        </div>
        <Button
          type="submit"
          size="sm"
          className="h-8 bg-purple-700 hover:bg-purple-600 text-white text-xs px-2.5 rounded-lg"
        >
          <Plus className="h-3.5 w-3.5 mr-1" /> Add
        </Button>
      </form>

      {/* Queue items list */}
      <ScrollArea className="flex-1 p-2">
        <div className="space-y-2">
          {queue.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              Queue is empty. Anyone can add a YouTube link above!
            </div>
          ) : (
            queue.map((item, idx) => (
              <div
                key={item.id}
                className="group flex items-center gap-2 p-2 rounded-xl bg-slate-950/60 border border-purple-950 hover:border-purple-800/60 transition-all text-xs"
              >
                <span className="font-mono text-[10px] font-bold text-slate-500 w-4 text-center">
                  #{idx + 1}
                </span>
                <img
                  src={item.thumbnail_url || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=150&auto=format&fit=crop&q=80'}
                  alt={item.title}
                  className="h-10 w-14 rounded-lg object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-200 truncate">{item.title}</p>
                  <p className="text-[10px] text-slate-400">Added by {item.added_by_name}</p>
                </div>

                <div className="flex items-center gap-1">
                  {/* Кнопка мгновенного воспроизведения только для Создателя (Host) */}
                  {isHost ? (
                    <Button
                      onClick={() => onPlayNow(item)}
                      size="sm"
                      className="h-7 px-2 text-[10px] bg-pink-600 hover:bg-pink-500 text-white gap-1 rounded-lg"
                      title="Play video now"
                    >
                      <Play className="h-3 w-3 fill-white" />
                      <span className="hidden sm:inline">Play</span>
                    </Button>
                  ) : (
                    <span className="text-[10px] text-slate-500 px-1 flex items-center gap-1" title="Only Creator can switch tracks">
                      <Lock className="h-3 w-3 text-slate-600" />
                    </span>
                  )}

                  {/* Голосование доступно ВСЕМ */}
                  <Button
                    onClick={() => onVoteItem(item.id)}
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-[11px] text-pink-400 hover:bg-pink-950/40 gap-1 border border-pink-900/30 rounded-lg"
                  >
                    <ThumbsUp className="h-3 w-3" />
                    <span>{item.votes}</span>
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};