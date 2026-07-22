import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Award, Clock, Radio, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CURRENT_USER } from '@/data/mockRaveData';

export const ProfilePage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 flex flex-col items-center">
      <div className="w-full max-w-xl space-y-6">
        <Button
          onClick={() => navigate('/')}
          variant="ghost"
          size="sm"
          className="text-slate-400 hover:text-white gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" /> Home
        </Button>

        <div className="p-6 rounded-3xl border border-purple-900/50 bg-slate-900/90 text-center relative overflow-hidden">
          <div className="relative mx-auto h-24 w-24 rounded-full ring-4 ring-pink-500/50 overflow-hidden mb-4">
            <img
              src={CURRENT_USER.avatar_url}
              alt={CURRENT_USER.username}
              className="h-full w-full object-cover"
            />
          </div>

          <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
            {CURRENT_USER.username}
            <Badge className="bg-gradient-to-r from-pink-500 to-purple-600 text-white text-[10px]">
              PRO HOST
            </Badge>
          </h2>

          <p className="text-xs text-purple-300 mt-1">{CURRENT_USER.status_message}</p>

          <div className="mt-6 grid grid-cols-2 gap-4 border-t border-purple-950 pt-4">
            <div className="p-3 rounded-2xl bg-slate-950/60 border border-purple-900/30">
              <Clock className="h-5 w-5 text-cyan-400 mx-auto mb-1" />
              <div className="text-lg font-bold text-slate-100">{CURRENT_USER.watch_time_minutes} min</div>
              <div className="text-[10px] text-slate-400">Total Watch Time</div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950/60 border border-purple-900/30">
              <Radio className="h-5 w-5 text-pink-400 mx-auto mb-1" />
              <div className="text-lg font-bold text-slate-100">{CURRENT_USER.parties_hosted}</div>
              <div className="text-[10px] text-slate-400">Parties Hosted</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};