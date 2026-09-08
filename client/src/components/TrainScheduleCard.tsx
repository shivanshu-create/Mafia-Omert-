import React, { useState } from 'react';
import { PlayerStatus, PublicPlayer, Role } from '../types';
import { Skull, Shield, Search, UserX, Settings2, Smartphone, Link as LinkIcon, Check } from 'lucide-react';
import { buildJoinUrl } from '../utils/config';

interface TrainScheduleCardProps {
  player: PublicPlayer;
  roomCode?: string;
  isModerator?: boolean;
  isCurrentPlayer?: boolean;
  isTwoPhoneMode?: boolean;
  onRoleChange?: (playerId: string, role: Role | null) => void;
  onRevealOnShared?: (playerId: string) => void;
  onOpenStatusModal?: (player: PublicPlayer) => void;
  onKick?: (playerId: string) => void;
}

export const TrainScheduleCard: React.FC<TrainScheduleCardProps> = ({
  player,
  roomCode,
  isModerator = false,
  isCurrentPlayer = false,
  isTwoPhoneMode = false,
  onRoleChange,
  onRevealOnShared,
  onOpenStatusModal,
  onKick,
}) => {
  const [copiedSeatLink, setCopiedSeatLink] = useState(false);

  const handleCopySeatLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!player.reconnectToken || !roomCode) return;
    const seatUrl = buildJoinUrl(roomCode, player.reconnectToken);
    try {
      await navigator.clipboard.writeText(seatUrl);
      setCopiedSeatLink(true);
      setTimeout(() => setCopiedSeatLink(false), 2000);
    } catch (err) {
      console.error('Failed to copy seat reconnect link', err);
    }
  };
  const status: PlayerStatus = player.status || (player.isAlive ? 'Alive' : 'Killed');
  const isKilled = status === 'Killed';
  const role = player.role;

  // Role color palette for the bottom line label
  const getRoleBadgeStyle = (r?: Role | null) => {
    switch (r) {
      case 'Mafia':
        return 'text-[#800000] border-black bg-[#fbebee]';
      case 'Detective':
        return 'text-[#003399] border-black bg-[#eef4ff]';
      case 'Doctor':
        return 'text-[#1e824c] border-black bg-[#eafaf1]';
      case 'Villager':
        return 'text-black border-black bg-white';
      default:
        return 'text-stone-400 border-black bg-[#f5f5f5]';
    }
  };

  const isDetected = status === 'Detected';
  const isSaved = status === 'Saved';

  return (
    <div
      onClick={() => isModerator && onOpenStatusModal && onOpenStatusModal(player)}
      className={`relative flex flex-col justify-between p-3 sm:p-3.5 rounded-none border-2 transition-none select-none ${
        isModerator ? 'cursor-pointer hover:border-[#800000]' : ''
      } ${
        isKilled
          ? 'bg-[#d8d8d8] border-black text-[#555555]'
          : isDetected && isModerator
          ? 'bg-[#eef2ff] border-[#1e40af] text-black ring-2 ring-[#1e40af]'
          : isSaved
          ? 'bg-[#ecfdf5] border-[#065f46] text-black ring-2 ring-[#065f46]'
          : isCurrentPlayer
          ? 'bg-[#fff9f9] border-[#800000] ring-2 ring-[#800000]'
          : 'bg-white border-black text-black'
      }`}
    >
      {/* Main Two-Line Train-Schedule Display */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          {/* Top Line: Bold/Highlighted Name */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`font-mono text-base sm:text-lg font-black tracking-tight truncate ${
                isKilled
                  ? 'line-through text-stone-600'
                  : isCurrentPlayer
                  ? 'text-[#800000]'
                  : 'text-black'
              }`}
            >
              {player.name}
            </span>

            {isCurrentPlayer && (
              <span className="text-[9px] sm:text-[10px] font-mono font-black uppercase tracking-wider bg-[#800000] text-white border border-black px-1.5 py-0.5 rounded-none shrink-0">
                YOU
              </span>
            )}

            {/* Status Badges */}
            {status === 'Killed' && (
              <span className="text-[10px] font-mono font-black uppercase tracking-wider bg-black text-white border border-black px-2 py-0.5 rounded-none shrink-0 flex items-center gap-1.5">
                <Skull className="w-3 h-3 text-white" />
                <span>KILLED</span>
              </span>
            )}

            {status === 'Saved' && (
              <span className="text-[10px] font-mono font-black uppercase tracking-wider bg-[#065f46] text-white border border-black px-2 py-0.5 rounded-none shrink-0 flex items-center gap-1.5">
                <Shield className="w-3 h-3 text-white" />
                <span>SAVED</span>
              </span>
            )}

            {status === 'Detected' && (
              <span className="text-[10px] font-mono font-black uppercase tracking-wider bg-[#1e40af] text-white border border-black px-2 py-0.5 rounded-none shrink-0 flex items-center gap-1.5">
                <Search className="w-3 h-3 text-white" />
                <span>DETECTED</span>
              </span>
            )}
          </div>

          {/* Bottom Line: Dimmer, role label */}
          <div className="mt-1 h-5 flex items-center">
            {role ? (
              <span
                className={`text-[11px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-none border inline-block ${
                  isKilled ? 'text-stone-500 border-black bg-stone-200 line-through' : getRoleBadgeStyle(role)
                }`}
              >
                {role}
              </span>
            ) : isModerator ? (
              <span className="text-[11px] font-mono text-stone-500 italic">
                Unassigned
              </span>
            ) : (
              /* Muted train-schedule spacer for other living players on player screen */
              <span className="text-[10px] font-mono text-stone-400 select-none flex items-center gap-1">
                &bull;&bull;&bull;
              </span>
            )}
          </div>
        </div>

        {/* Right side connection indicator & moderator action hint */}
        <div className="flex items-center gap-2 shrink-0">
          {isModerator && (
            <span className="text-[10px] font-mono text-black flex items-center gap-1 hover:text-[#800000]">
              <Settings2 className="w-3.5 h-3.5" />
            </span>
          )}
          <span
            className={`w-2.5 h-2.5 rounded-none border border-black ${
              player.isConnected ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
            }`}
            title={player.isConnected ? 'Online' : 'Reconnecting'}
          />
        </div>
      </div>

      {/* Moderator Controls Bar */}
      {isModerator && (
        <div
          className="mt-3 pt-2.5 border-t border-black flex flex-wrap items-center justify-between gap-2"
          onClick={(e) => e.stopPropagation()} // Prevent triggering card modal when clicking controls directly
        >
          {/* Quick Role Selector */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-mono uppercase font-bold text-stone-700 mr-1">Role:</span>
            <select
              value={role || ''}
              onChange={(e) => onRoleChange && onRoleChange(player.id, (e.target.value as Role) || null)}
              className="bg-white border-2 border-black text-black text-xs font-mono font-bold rounded-none px-2 py-1 focus:outline-none"
            >
              <option value="">(None)</option>
              <option value="Mafia">Mafia</option>
              <option value="Detective">Detective</option>
              <option value="Doctor">Doctor</option>
              <option value="Villager">Villager</option>
            </select>
          </div>

          {/* Two-Phone Mode: Reveal on Shared Device */}
          {isTwoPhoneMode && onRevealOnShared && (
            <button
              type="button"
              onClick={() => onRevealOnShared(player.id)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-none text-xs font-mono font-bold bg-[#800000] text-white border-2 border-black hover:bg-[#660000]"
              title={`Push ${player.name}'s secret role to the shared phone`}
            >
              <Smartphone className="w-3.5 h-3.5 text-white" />
              <span>Reveal on Shared</span>
            </button>
          )}

          {/* Quick Status Button */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onOpenStatusModal && onOpenStatusModal(player)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-none text-xs font-mono font-bold bg-[#efefef] hover:bg-[#dfdfdf] text-black border-2 border-black"
            >
              <span>Status: {status}</span>
            </button>

            {player.reconnectToken && (
              <button
                type="button"
                onClick={handleCopySeatLink}
                className="flex items-center gap-1 px-2 py-1 rounded-none text-xs font-mono font-bold bg-[#efefef] hover:bg-[#dfdfdf] text-black border-2 border-black"
                title={`Copy reconnect link for ${player.name}`}
              >
                {copiedSeatLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <LinkIcon className="w-3.5 h-3.5 text-black" />}
                <span className="text-[10px]">{copiedSeatLink ? 'Copied' : 'Resend Link'}</span>
              </button>
            )}

            {onKick && (
              <button
                onClick={() => onKick(player.id)}
                className="p-1 rounded-none text-black hover:text-white hover:bg-[#800000] border border-black"
                title={`Kick ${player.name}`}
              >
                <UserX className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
