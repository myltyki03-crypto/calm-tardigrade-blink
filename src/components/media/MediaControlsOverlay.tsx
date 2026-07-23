import React from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

interface MediaControlsOverlayProps {
  showControls: boolean;
  isScreenSharingActive: boolean;
  currentTime: number;
  duration: number;
  progressPercent: number;
  isPlaying: boolean;
  isHost: boolean;
  isMuted: boolean;
  volume: number;
  isFullscreen: boolean;
  formatTime: (sec: number) => string;
  onSeek: (percent: number) => void;
  onTogglePlay: () => void;
  onToggleMute: () => void;
  onVolumeChange: (vol: number) => void;
  onToggleFullscreen: () => void;
}

export const MediaControlsOverlay: React.FC<MediaControlsOverlayProps> = ({
  showControls,
  isScreenSharingActive,
  currentTime,
  duration,
  progressPercent,
  isPlaying,
  isHost,
  isMuted,
  volume,
  isFullscreen,
  formatTime,
  onSeek,
  onTogglePlay,
  onToggleMute,
  onVolumeChange,
  onToggleFullscreen,
}) => {
  const containerStyle = showControls
    ? 'opacity-100 translate-y-0 pointer-events-auto'
    : 'opacity-0 translate-y-4 pointer-events-none';

  const hostPlayClass = isHost
    ? 'bg-pink-600 hover:bg-pink-500 shadow-pink-500/30'
    : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-400';

  let playTitle = 'Только ведущий может запускать видео';
  if (isHost) {
    playTitle = isPlaying ? 'Пауза' : 'Запустить';
  }

  const fullscreenTitle = isFullscreen ? 'Свернуть' : 'На весь экран';
  const formattedDuration = duration > 0 ? formatTime(duration) : '00:00';
  const formattedVolume = isMuted ? '0%' : `${volume}%`;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={`absolute bottom-0 inset-x-0 z-30 p-3 bg-gradient-to-t from-slate-950/95 via-slate-950/80 to-transparent flex flex-col gap-2 transition-all duration-300 ${containerStyle}`}
    >
      {!isScreenSharingActive && (
        <div className="flex items-center gap-2 px-1">
          <span className="text-[10px] font-mono text-purple-200 w-10 font-bold drop-shadow">
            {formatTime(currentTime)}
          </span>
          <Slider
            value={[progressPercent]}
            max={100}
            step={0.1}
            disabled={!isHost}
            onValueChange={(val) => onSeek(val[0])}
            className={`flex-1 ${isHost ? 'cursor-pointer' : 'cursor-not-allowed opacity-75'}`}
          />
          <span className="text-[10px] font-mono text-slate-300 w-10 text-right font-bold drop-shadow">
            {formattedDuration}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2 sm:gap-3">
          {!isScreenSharingActive && (
            <Button
              onClick={onTogglePlay}
              size="icon"
              title={playTitle}
              className={`h-9 w-9 rounded-full text-white shadow-md shrink-0 transition-all ${hostPlayClass}`}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : isHost ? (
                <Play className="h-4 w-4 ml-0.5 fill-white" />
              ) : (
                <Lock className="h-3.5 w-3.5 text-amber-400" />
              )}
            </Button>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={onToggleMute}
              className="text-slate-200 hover:text-white transition-colors drop-shadow"
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
              step={1}
              onValueChange={(val) => onVolumeChange(val[0])}
              className="w-16 sm:w-24 cursor-pointer"
            />
            <span className="text-[10px] font-mono text-slate-300 w-6 hidden sm:inline font-bold drop-shadow">
              {formattedVolume}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <Button
            onClick={onToggleFullscreen}
            size="icon"
            variant="ghost"
            className="h-8 w-8 rounded-lg text-slate-200 hover:text-white hover:bg-slate-900/60"
            title={fullscreenTitle}
          >
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4 />}
          </Button>
        </div>
      </div>
    </div>
  );
};