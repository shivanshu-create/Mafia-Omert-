import React, { useState } from 'react';
import { PublicPlayer } from '../types';
import { UserX, Check, X } from 'lucide-react';

interface PlayerCardProps {
  player: PublicPlayer;
  isModerator?: boolean;
  isCurrentPlayer?: boolean;
  onKick?: (playerId: string) => void;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  isModerator = false,
  isCurrentPlayer = false,
  onKick,
}) => {
  const [confirmKick, setConfirmKick] = useState(false);

  const handleKickClick = () => {
    if (confirmKick) {
      if (onKick) onKick(player.id);
      setConfirmKick(false);
    } else {
      setConfirmKick(true);
      // Auto-revert confirmation after 4 seconds
      setTimeout(() => setConfirmKick(false), 4000);
    }
  };

  const initial = (player.name || '?')[0].toUpperCase();

  return (
    <div
      className={`relative flex items-center justify-between p-2.5 rounded-none border-2 transition-none select-none ${
        isCurrentPlayer
          ? 'bg-[#fff9f9] border-[#800000] ring-2 ring-[#800000]'
          : 'bg-white border-black text-black'
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {/* Avatar */}
        <div
          className="w-8 h-8 rounded-none bg-[#efefef] border-2 border-black flex items-center justify-center font-mono font-black text-sm text-black shrink-0"
        >
          {initial}
        </div>

        {/* Name and Status */}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-mono font-black text-black text-xs sm:text-sm truncate">{player.name}</span>
            {isCurrentPlayer && (
              <span className="text-[9px] font-mono font-black uppercase tracking-wider bg-[#800000] text-white border border-black px-1.5 py-0.2 rounded-none shrink-0">
                You
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className={`w-2 h-2 rounded-none border border-black ${
                player.isConnected ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
              }`}
            />
            <span className="text-[10px] text-stone-600 font-mono">
              {player.isConnected ? 'Connected' : 'Reconnecting...'}
            </span>
          </div>
        </div>
      </div>

      {/* Moderator Action: Kick Button */}
      {isModerator && (
        <div className="flex items-center gap-1 ml-2 shrink-0">
          {confirmKick ? (
            <div className="flex items-center gap-1 bg-[#fff3cd] border-2 border-black p-1 rounded-none">
              <button
                onClick={handleKickClick}
                className="retro-btn-primary px-2 py-0.5 text-xs font-mono font-bold"
                title="Confirm Kick"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Kick</span>
              </button>
              <button
                onClick={() => setConfirmKick(false)}
                className="p-1 rounded-none text-black hover:bg-stone-300 border border-black"
                title="Cancel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleKickClick}
              className="p-1.5 rounded-none text-black hover:bg-[#800000] hover:text-white border border-black text-xs font-mono font-bold flex items-center gap-1"
              title={`Remove ${player.name} from room`}
            >
              <UserX className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Kick</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
