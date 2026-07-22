import React from 'react';
import { Users, Crown, Radio } from 'lucide-react';
import { RoomMember } from '@/types/rave';
import { ScrollArea } from '@/components/ui/scroll-area';

interface RoomMembersListProps {
  members: RoomMember[];
  hostId: string;
}

export const RoomMembersList: React.FC<RoomMembersListProps> = ({ members, hostId }) => {
  return (
    <div className="flex flex-col h-full w-full rounded-2xl border border-purple-900/40 bg-slate-900/95 overflow-hidden">
      <div className="p-3 border-b border-purple-900/40 flex items-center justify-between bg-slate-950/60">
        <h4 className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
          <Users className="h-4 w-4 text-cyan-400" /> Участники в сети ({members.length})
        </h4>
      </div>

      <ScrollArea className="flex-1 p-3">
        <div className="space-y-2">
          {members.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              Пока нет участников
            </div>
          ) : (
            members.map((member) => {
              const isOwner = member.user_id === hostId || member.role === 'host';
              const defaultAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(member.user_name || 'user')}`;
              const avatarSrc = member.user_avatar || defaultAvatar;

              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-purple-950 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="relative">
                      <img
                        src={avatarSrc}
                        alt={member.user_name}
                        className="h-8 w-8 rounded-full object-cover ring-1 ring-purple-500/40"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = defaultAvatar;
                        }}
                      />
                      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-950" />
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-200">{member.user_name}</span>
                        {isOwner && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] bg-pink-950/80 text-pink-400 border border-pink-500/40 px-1.5 py-0.5 rounded-full font-bold">
                            <Crown className="h-2.5 w-2.5" /> Владелец
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Radio className="h-2.5 w-2.5 text-emerald-400" /> Смотрит трансляцию
                      </span>
                    </div>
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