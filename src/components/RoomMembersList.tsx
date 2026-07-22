import React, { useState } from 'react';
import { Users, Crown, Radio, UserPlus, Eye } from 'lucide-react';
import { RoomMember, UserProfile } from '@/types/rave';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useRooms } from '@/context/RoomContext';
import { UserProfileModal } from '@/components/UserProfileModal';
import { DirectChatModal } from '@/components/DirectChatModal';

interface RoomMembersListProps {
  members: RoomMember[];
  hostId: string;
}

export const RoomMembersList: React.FC<RoomMembersListProps> = ({ members, hostId }) => {
  const { currentUser, transferHostRole, friendsList, sendFriendRequest } = useRooms();

  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const [chatFriend, setChatFriend] = useState<UserProfile | null>(null);
  const [isDirectChatOpen, setIsDirectChatOpen] = useState(false);

  const isCurrentHost = currentUser.id === hostId;

  const handleMemberClick = (member: RoomMember) => {
    const userProfile: UserProfile = {
      id: member.user_id,
      username: member.user_name,
      avatar_url: member.user_avatar,
      is_online: true,
    };
    setSelectedUser(userProfile);
    setIsProfileModalOpen(true);
  };

  const handleOpenDirectChat = (user: UserProfile) => {
    setChatFriend(user);
    setIsDirectChatOpen(true);
  };

  return (
    <>
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
                Пока нет участников в сети
              </div>
            ) : (
              members.map((member) => {
                const isOwner = member.user_id === hostId;
                const isMe = member.user_id === currentUser.id;
                const defaultAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(member.user_name || 'user')}`;
                const avatarSrc = member.user_avatar || defaultAvatar;

                const isAlreadyFriend = friendsList.some(
                  (f) => f.id === member.user_id || f.username.toLowerCase() === member.user_name.toLowerCase()
                );

                return (
                  <div
                    key={member.id}
                    onClick={() => handleMemberClick(member)}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-purple-950 hover:border-purple-800 text-xs cursor-pointer transition-all hover:bg-purple-950/30 group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative shrink-0">
                        <img
                          src={avatarSrc}
                          alt={member.user_name}
                          className="h-8 w-8 rounded-full object-cover ring-2 ring-purple-500/40 group-hover:ring-pink-500 transition-all"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = defaultAvatar;
                          }}
                        />
                        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-950" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-200 group-hover:text-pink-300 truncate">
                            {member.user_name} {isMe && <span className="text-[10px] text-slate-400 font-normal">(Вы)</span>}
                          </span>
                          {isOwner ? (
                            <span className="inline-flex items-center gap-0.5 text-[9px] bg-pink-950/80 text-pink-400 border border-pink-500/40 px-1.5 py-0.5 rounded-full font-bold shrink-0">
                              <Crown className="h-2.5 w-2.5 text-amber-400 fill-amber-400" /> DJ
                            </span>
                          ) : (
                            <span className="text-[9px] bg-purple-950/60 text-purple-300 border border-purple-800/30 px-1.5 py-0.5 rounded-full font-medium shrink-0">
                              Зритель
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Radio className="h-2.5 w-2.5 text-emerald-400 animate-pulse" /> Смотрит трансляцию
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {/* Быстрое добавление в друзья из списка */}
                      {!isMe && !isAlreadyFriend && (
                        <Button
                          onClick={() => sendFriendRequest(member.user_name)}
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-pink-400 hover:text-white hover:bg-pink-950/60 rounded-lg"
                          title="Добавить в друзья"
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                        </Button>
                      )}

                      {/* Кнопка передачи прав DJ (видна только текущему хосту) */}
                      {isCurrentHost && !isOwner && (
                        <Button
                          onClick={() => {
                            const targetRoom = member.room_id;
                            if (targetRoom) {
                              transferHostRole(targetRoom, member.user_id, member.user_name, member.user_avatar);
                            }
                          }}
                          size="sm"
                          variant="outline"
                          className="h-7 text-[10px] px-2 border-amber-500/50 text-amber-300 hover:bg-amber-950/60 gap-1 rounded-lg"
                          title="Передать DJ корону этому участнику"
                        >
                          <Crown className="h-3 w-3 text-amber-400" />
                          <span className="hidden sm:inline">Дать DJ</span>
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>

      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        targetUser={selectedUser}
        isOwner={selectedUser?.id === hostId}
        onOpenDirectChat={handleOpenDirectChat}
      />

      <DirectChatModal
        isOpen={isDirectChatOpen}
        onClose={() => setIsDirectChatOpen(false)}
        selectedFriend={chatFriend}
      />
    </>
  );
};