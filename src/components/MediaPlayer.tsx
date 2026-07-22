import React, { useState, useEffect } from 'react';
import { Play, Pause, RefreshCw, Volume2, VolumeX, Shield, Radio, Flame, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Room } from '@/types/rave';
import { showSuccess } from '@/utils/toast';

interface MediaPlayerProps {
  room: Room;
  isHost: boolean;
  onSendReaction: (emoji: string) => void;
}

export const MediaPlayer: React.FC<MediaPlayerProps> = ({
  room,
  isHost,
  onSendReaction,
}) => {
  const [isPlaying, setIsPlaying] = useState(room.is_playing);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(25);
  const [synced, setSynced] = useState(true);

  // Extract YouTube ID helper
  const getYouTubeEmbedUrl = (url: string = '') => {
    let videoId = '4xDzrJKXOOY'; // Default fallback
    if (url.includes('youtube.com/watch?v=')) {
      videoId = url.split('v=')[1]?.split('&')[0] || videoId;
    } else if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1]?.split('?')[0] || videoId;
    }
    return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=${isMuted ? 1 : 0}&enablejsapi=1&controls=0`;
  };

  const handleTogglePlay = () => {
    setIsPlaying(!isPlaying);
    showSuccess(!isPlaying ? 'Sync Playback Resumed' : 'Playback Paused');
  };

  const handleSyncClick = () => {
    setSynced(true);
    showSuccess('Synchronized with Host Stream!');
  };

  // Simulate progress bar movement
  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setProgress((prev) => (prev >= 100 ? 0 : prev + 0.2));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  return (
    <div className="relative flex flex-col rounded-2xl border border-purple-900/40 bg-slate-950 overflow-hidden shadow-2xl">
      {/* Video Container Frame */}
      <div className="relative aspect-video w-full bg-black overflow-hidden group">
        <iframe
          src={getYouTubeEmbedUrl(room.current_media_url)}
          title={room.current_media_title || 'Media Stream'}
          className="h-full w-full object-cover border-0 pointer-events-none"
          allow="autoplay; encrypted-media"
        />

        {/* Sync Status Floating Badge */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full bg-slate-950/80 backdrop-blur-md px-3 py-1 text-xs text-white border border-purple-500/40">
            <Radio className="h-3.5 w-3.5 text-pink-500 animate-pulse" />
            <span className="font-semibold text-purple-200">LIVE SYNC</span>
          </div>

          <Button
            onClick={handleSyncClick}
            size="sm"
            variant="outline"
            className="h-7 text-[11px] px-2.5 bg-slate-950/70 border-cyan-500/40 text-cyan-300 hover:bg-cyan-950/50 rounded-full"
          >
            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
            Resync
          </Button>
        </div>

        {/* Floating Quick Reaction Bar */}
        <div className="absolute bottom-4 right-4 z-20 flex items-center gap-1.5 bg-slate-950/80 backdrop-blur-md p-1.5 rounded-full border border-purple-800/40 opacity-90 hover:opacity-100 transition-opacity">
          {['🔥', '❤️', '🎉', '🎧', '😮'].map((emoji) => (
            <button
              key={emoji}
              onClick={() => onSendReaction(emoji)}
              className="h-8 w-8 rounded-full flex items-center justify-center text-base hover:scale-125 hover:bg-purple-800/50 transition-all"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Control Bar Below Player */}
      <div className="p-3 bg-slate-900/90 border-t border-purple-950 flex flex-col gap-2">
        {/* Seek timeline */}
        <div className="flex items-center gap-3 px-1">
          <span className="text-[10px] font-mono text-purple-300">01:24</span>
          <Slider
            value={[progress]}
            max={100}
            step={0.1}
            onValueChange={(val) => setProgress(val[0])}
            className="flex-1 cursor-pointer"
          />
          <span className="text-[10px] font-mono text-slate-400">04:12</span>
        </div>

        {/* Controls layout */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-3">
            <Button
              onClick={handleTogglePlay}
              size="icon"
              className="h-9 w-9 rounded-full bg-pink-600 hover:bg-pink-500 text-white shadow-md shadow-pink-500/30"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5 fill-white" />}
            </Button>

            <div className="hidden sm:flex items-center gap-2">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="text-slate-400 hover:text-slate-200"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="h-4 w-4 text-red-400" />
                ) : (
                  <Volume2 className="h-4 w-4 text-cyan-400" />
                )}
              </button>
              <Slider
                value={[isMuted ? 0 : volume]}
                max={100}
                onValueChange={(val) => {
                  setVolume(val[0]);
                  setIsMuted(val[0] === 0);
                }}
                className="w-20"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-300">
            <span className="truncate max-w-[200px] md:max-w-[320px] font-semibold text-purple-200">
              {room.current_media_title || 'Playing Stream'}
            </span>
            {isHost && (
              <span className="text-[10px] bg-purple-950 border border-purple-700/50 text-purple-300 px-2 py-0.5 rounded-full">
                Host DJ Controls
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};