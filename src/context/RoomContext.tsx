import React, { createContext, useContext, useState, useEffect } from 'react';
import { Room, ChatMessage, QueueItem } from '@/types/rave';
import { INITIAL_ROOMS, INITIAL_MESSAGES, INITIAL_QUEUE } from '@/data/mockRaveData';

interface RoomContextType {
  rooms: Room[];
  addRoom: (room: Room) => void;
  getRoomById: (id: string) => Room | undefined;
  messagesByRoom: Record<string, ChatMessage[]>;
  sendMessage: (roomId: string, message: ChatMessage) => void;
  queueByRoom: Record<string, QueueItem[]>;
  addQueueItem: (roomId: string, item: QueueItem) => void;
  voteQueueItem: (roomId: string, itemId: string) => void;
  changeRoomMedia: (roomId: string, url: string, title?: string, thumbnail?: string) => void;
  removeQueueItem: (roomId: string, itemId: string) => void;
}

const RoomContext = createContext<RoomContextType | undefined>(undefined);

export const RoomProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [rooms, setRooms] = useState<Room[]>(() => {
    const saved = localStorage.getItem('pulserave_rooms');
    return saved ? JSON.parse(saved) : INITIAL_ROOMS;
  });

  const [messagesByRoom, setMessagesByRoom] = useState<Record<string, ChatMessage[]>>({
    'room-1': INITIAL_MESSAGES,
  });

  const [queueByRoom, setQueueByRoom] = useState<Record<string, QueueItem[]>>({
    'room-1': INITIAL_QUEUE,
  });

  useEffect(() => {
    localStorage.setItem('pulserave_rooms', JSON.stringify(rooms));
  }, [rooms]);

  const addRoom = (newRoom: Room) => {
    setRooms((prev) => [newRoom, ...prev]);
  };

  const getRoomById = (id: string) => {
    return rooms.find((r) => r.id === id);
  };

  const sendMessage = (roomId: string, message: ChatMessage) => {
    setMessagesByRoom((prev) => ({
      ...prev,
      [roomId]: [...(prev[roomId] || []), message],
    }));
  };

  const addQueueItem = (roomId: string, item: QueueItem) => {
    setQueueByRoom((prev) => ({
      ...prev,
      [roomId]: [...(prev[roomId] || []), item],
    }));
  };

  const voteQueueItem = (roomId: string, itemId: string) => {
    setQueueByRoom((prev) => ({
      ...prev,
      [roomId]: (prev[roomId] || []).map((item) =>
        item.id === itemId ? { ...item, votes: item.votes + 1 } : item
      ),
    }));
  };

  const changeRoomMedia = (roomId: string, url: string, title?: string, thumbnail?: string) => {
    setRooms((prev) =>
      prev.map((r) => {
        if (r.id === roomId) {
          return {
            ...r,
            current_media_url: url,
            current_media_title: title || r.current_media_title || 'Playing video',
            current_media_thumbnail: thumbnail || r.current_media_thumbnail,
            playback_position_seconds: 0,
            is_playing: true,
          };
        }
        return r;
      })
    );
  };

  const removeQueueItem = (roomId: string, itemId: string) => {
    setQueueByRoom((prev) => ({
      ...prev,
      [roomId]: (prev[roomId] || []).filter((item) => item.id !== itemId),
    }));
  };

  return (
    <RoomContext.Provider
      value={{
        rooms,
        addRoom,
        getRoomById,
        messagesByRoom,
        sendMessage,
        queueByRoom,
        addQueueItem,
        voteQueueItem,
        changeRoomMedia,
        removeQueueItem,
      }}
    >
      {children}
    </RoomContext.Provider>
  );
};

export const useRooms = () => {
  const context = useContext(RoomContext);
  if (!context) {
    throw new Error('useRooms must be used within a RoomProvider');
  }
  return context;
};