import React from 'react';
import { Users, UserPlus, MessageSquare, Send, Sparkles } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { MOCK_FRIENDS } from '@/data/mockRaveData';
import { showSuccess } from '@/utils/toast';

interface FriendsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FriendsDrawer: React.FC<FriendsDrawerProps> = ({ isOpen, onClose }) => {
  const handleInvite = (friendName: string) => {
    showSuccess(`Invite sent to ${friendName}!`);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="bg-slate-900 text-slate-100 border-purple-900/60 w-full sm:max-w-xs">
        <SheetHeader className="pb-3 border-b border-purple-900/40">
          <SheetTitle className="text-base font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 flex items-center gap-2">
            <Users className="h-4 w-4 text-pink-500" /> Rave Friends & Party
          </SheetTitle>
          <SheetDescription className="text-slate-400 text-xs">
            See who is online and invite them to your current room.
          </SheetDescription>
        </SheetHeader>

        <div className="py-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
              Online Friends
            </span>
            <Button size="sm" variant="outline" className="h-7 text-xs border-purple-800 text-purple-300">
              <UserPlus className="h-3 w-3 mr-1" /> Add
            </Button>
          </div>

          <div className="space-y-2">
            {MOCK_FRIENDS.map((friend) => (
              <div
                key={friend.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/70 border border-purple-950 hover:border-purple-800/40 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <img
                      src={friend.avatar_url}
                      alt={friend.username}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                    {friend.is_online && (
                      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-950" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-200">{friend.username}</p>
                    <p className="text-[10px] text-slate-400 truncate max-w-[110px]">
                      {friend.status_message}
                    </p>
                  </div>
                </div>

                <Button
                  onClick={() => handleInvite(friend.username)}
                  size="sm"
                  className="h-7 text-[11px] px-2 bg-pink-600 hover:bg-pink-500 text-white rounded-lg"
                >
                  <Send className="h-3 w-3 mr-1" /> Invite
                </Button>
              </div>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};