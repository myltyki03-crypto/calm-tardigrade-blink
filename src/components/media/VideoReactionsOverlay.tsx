import React from 'react';

interface Reaction {
  id: string;
  emoji: string;
  x: number;
}

interface VideoReactionsOverlayProps {
  reactions: Reaction[];
}

export const VideoReactionsOverlay: React.FC<VideoReactionsOverlayProps> = ({ reactions }) => {
  return (
    <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
      {reactions.map((e) => (
        <div
          key={e.id}
          style={{ left: `${e.x}%` }}
          className="absolute bottom-12 text-4xl sm:text-5xl animate-[bounce_1.5s_ease-out_infinite] transition-all duration-1000 ease-out drop-shadow-[0_0_15px_rgba(236,72,153,0.8)]"
        >
          {e.emoji}
        </div>
      ))}
    </div>
  );
};