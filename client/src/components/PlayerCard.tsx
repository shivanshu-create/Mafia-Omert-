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
      className={`relative flex items-center justify-between p-3 hud-cut-sm border select-none font-mono ${
        isCurrentPlayer
          ? 'bg-[#141824] border-[#fcee0a] shadow-[0_0_10px_rgba(252,238,10,0.15)] text-white'
          : 'bg-[#101216] border-[#fcee0a]/20 text-stone-200'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* Avatar / Designation Symbol */}
        <div
          className="w-9 h-9 bg-[#08090b] border border-[#fcee0a]/40 flex items-center justify-center font-bold text-sm text-[#fcee0a] shrink-0"
        >
          {initial}
        </div>

        {/* Name and Status */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-xs sm:text-sm uppercase tracking-wider truncate">{player.name}</span>
            {isCurrentPlayer && (
              <span className="text-[10px] font-bold uppercase tracking-wider bg-[#fcee0a] text-black px-2 py-0.5 shrink-0">
                [ YOU ]
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className={`w-1.5 h-1.5 ${
                player.isConnected ? 'bg-[#00ff9f]' : 'bg-[#ff003c] animate-ping'
              }`}
            />
            <span className="text-[10px] uppercase tracking-wider text-[#7d8799]">
              {player.isConnected ? 'Connected' : 'Offline'}
            </span>
          </div>
        </div>
      </div>

      {/* Moderator Action: Kick Button */}
      {isModerator && (
        <div className="flex items-center gap-1 ml-2 shrink-0">
          {confirmKick ? (
            <div className="flex items-center gap-1.5 bg-[#08090b] border border-[#ff003c] p-1">
              <button
                onClick={handleKickClick}
                className="px-2.5 py-1 bg-[#ff003c] text-black text-xs font-bold uppercase tracking-wider flex items-center gap-1"
                title="Confirm Kick"
              >
                <Check className="w-3.5 h-3.5" />
                <span>[ REMOVE ]</span>
              </button>
              <button
                onClick={() => setConfirmKick(false)}
                className="p-1 text-[#7d8799] hover:text-white"
                title="Cancel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleKickClick}
              className="p-1.5 text-stone-400 hover:text-[#ff003c] hover:bg-[#ff003c]/20 border border-[#fcee0a]/20 text-xs font-semibold flex items-center gap-1"
              title={`Remove ${player.name} from room`}
            >
              <UserX className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
