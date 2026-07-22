import React from 'react';
import { Database, Copy, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { showSuccess } from '@/utils/toast';

interface SqlSchemaDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const SQL_SCHEMA = `-- PulseRave Complete Supabase Database Schema

-- 1. Create Profiles Table
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text not null,
  avatar_url text,
  is_vip boolean default false,
  watch_time_minutes integer default 0,
  parties_hosted integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create Party Rooms Table
create table if not exists public.rooms (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  category text default 'music',
  host_id uuid references public.profiles(id),
  is_private boolean default false,
  access_code text,
  current_media_url text,
  current_media_title text,
  current_media_thumbnail text,
  playback_position_seconds numeric default 0,
  is_playing boolean default true,
  allow_guest_queue boolean default true,
  allow_guest_control boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Create Queue Items Table
create table if not exists public.queue_items (
  id uuid default gen_random_uuid() primary key,
  room_id uuid references public.rooms(id) on delete cascade,
  title text not null,
  url text not null,
  thumbnail_url text,
  added_by_id uuid references public.profiles(id),
  votes integer default 1,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Create Chat Messages Table
create table if not exists public.chat_messages (
  id uuid default gen_random_uuid() primary key,
  room_id uuid references public.rooms(id) on delete cascade,
  user_id uuid references public.profiles(id),
  message text not null,
  type text default 'chat',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Enable Realtime Publications for Live Sync
alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.chat_messages;
alter publication supabase_realtime add table public.queue_items;
`;

export const SqlSchemaDialog: React.FC<SqlSchemaDialogProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(SQL_SCHEMA);
    setCopied(true);
    showSuccess('SQL Schema copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 text-slate-100 border-purple-900/60 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 flex items-center gap-2">
            <Database className="h-5 w-5 text-cyan-400" /> Supabase Database SQL Migration
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-xs">
            Run this SQL query inside your Supabase SQL Editor to generate all tables and real-time triggers for PulseRave.
          </DialogDescription>
        </DialogHeader>

        <div className="relative mt-2">
          <Button
            onClick={handleCopy}
            size="sm"
            className="absolute top-3 right-3 bg-purple-700 hover:bg-purple-600 text-white text-xs z-10"
          >
            {copied ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
            {copied ? 'Copied!' : 'Copy SQL'}
          </Button>

          <ScrollArea className="h-80 w-full rounded-xl border border-purple-950 bg-slate-950 p-4 font-mono text-xs text-cyan-300 leading-relaxed">
            <pre>{SQL_SCHEMA}</pre>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};