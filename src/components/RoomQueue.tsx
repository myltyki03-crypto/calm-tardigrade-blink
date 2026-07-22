import React, { useState } from 'react';
import { ListMusic, Plus, ThumbsUp, Play, Link as LinkIcon, Lock, Music2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { QueueItem } from '@/types/rave';
import { showSuccess } from '@/utils/toast';

interface RoomQueueProps {
  queue: QueueItem[];
  currentMediaUrl?: string;
  onAddQueueItem: (url: string) => void;
  onVoteItem: (id: string) => void;
  onPlayNow: (item: QueueItem) => void;
  isHost: boolean;
}

const QUICK_QUEUE_PRESETS = [
  { label: '🔥 Synthwave Radio', url: 'https://www.youtube.com/watch?v=4xDzrJKXOOY' },
  { label: '📚 Lofi Beats', url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk' },
  { label: '🎮 Cyberpunk Mix', url: 'https://www.youtube.com/watch?v=4xDzrJKXOOY' },
];

export const RoomQueue: React.FC<RoomQueueProps> = ({
  queue,
  currentMediaUrl,
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

  const handleAddPreset = (url: string, label: string) => {
    onAddQueueItem(url);
    showSuccess(`Added ${label} to Queue!`);
  };

  return (
    <div className="flex flex-col h-full w-full rounded-2xl border border-purple-900/40 bg-slate-900/95 overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-purple-900/40 flex items-center justify-between bg-slate-950/60">
        <h4 className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
          <ListMusic className="h-4 w-4 text-cyan-400" /> Playlist Queue ({queue.length})
        </h4>
      </div>

      {/* Add track form */}
      <div className="p-2 border-b border-purple-900/30 bg-slate-950/40 space-y-1.5">
        <form onSubmit={handleAdd} className="flex items-center gap-1.5 w-full">
          <div className="relative flex-1">
            <LinkIcon className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <Input
              placeholder="Paste YouTube or video link..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="pl-8 bg-slate-900 border-purple-900/50 text-xs text-slate-100 placeholder:text-slate-500 h-8 w-full"
            />
          </div>
          <Button
            type="submit"
            size="sm"
            className="h-8 bg-purple-700 hover:bg-purple-600 text-white text-xs px-2.5 rounded-lg shrink-0"
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Add
          </Button>
        </form>

        {/* Quick request chips */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pt-0.5">
          <span className="text-[9px] text-slate-400 font-semibold shrink-0 flex items-center gap-0.5">
            <Sparkles className="h-2.5 w-2.5 text-pink-400" /> Quick Add:
          </span>
          {QUICK_QUEUE_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => handleAddPreset(p.url, p.label)}
              className="text-[9px] bg-slate-900 hover:bg-purple-950 border border-purple-900/40 text-purple-200 px-2 py-0.5 rounded-full whitespace-nowrap transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Queue items list */}
      <ScrollArea className="flex-1 p-2">
        <div className="space-y-2">
          {queue.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              Queue is empty. Anyone can add a YouTube link above!
            </div>
          ) : (
            queue.map((item, idx) => {
              const isCurrent = currentMediaUrl && item.url === currentMediaUrl;

              return (
                <div
                  key={item.id}
                  className={`group flex items-center gap-2 p-2 rounded-xl border transition-all text-xs w-full ${
                    isCurrent
                      ? 'bg-purple-950/70 border-pink-500/60 ring-1 ring-pink-500/30'
                      : 'bg-slate-950/60 border-purple-950 hover:border-purple-800/60'
                  }`}
                >
                  <span className="font-mono text-[10px] font-bold text-slate-500 w-4 text-center shrink-0">
                    #{idx + 1}
                  </span>
                  
                  <div className="relative shrink-0">
                    <img
                      src={item.thumbnail_url || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=150&auto=format&fit=crop&q=80'}
                      alt={item.title}
                      className="h-10 w-14 rounded-lg object-cover"
                    />
                    {isCurrent && (
                      <div className="absolute inset-0 bg-purple-950/60 backdrop-blur-[1px] rounded-lg flex items-center justify-center">
                        <Music2 className="h-4 w-4 text-pink-400 animate-bounce" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className={`font-medium truncate ${isCurrent ? 'text-pink-300 font-semibold' : 'text-slate-200'}`}>
                        {item.title}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <p className="text-[10px] text-slate-400 truncate">Added by {item.added_by_name}</p>
                      {isCurrent && (
                        <Badge className="bg-pink-600/90 text-white text-[9px] px-1 py-0 h-3.5 uppercase font-bold tracking-wider shrink-0">
                          NOW PLAYING
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {isHost ? (
                      <Button
                        onClick={() => onPlayNow(item)}
                        size="sm"
                        className={`h-7 px-2 text-[10px] text-white gap-1 rounded-lg ${
                          isCurrent
                            ? 'bg-purple-800 hover:bg-purple-700'
                            : 'bg-pink-600 hover:bg-pink-500'
                        }`}
                        title="Play video now"
                      >
                        <Play className="h-3 w-3 fill-white" />
                        <span className="hidden sm:inline">{isCurrent ? 'Replay' : 'Play'}</span>
                      </Button>
                    ) : (
                      <span className="text-[10px] text-slate-500 px-1 flex items-center gap-1" title="Only Creator can switch tracks">
                        <Lock className="h-3 w-3 text-slate-600" />
                      </span>
                    )}

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
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
};