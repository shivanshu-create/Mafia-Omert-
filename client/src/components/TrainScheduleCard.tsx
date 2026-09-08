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
        return 'text-[#ff003c] bg-[#ff003c]/15 border border-[#ff003c]/40';
      case 'Detective':
        return 'text-[#00e5ff] bg-[#00e5ff]/15 border border-[#00e5ff]/40';
      case 'Doctor':
        return 'text-[#00ff9f] bg-[#00ff9f]/15 border border-[#00ff9f]/40';
      case 'Villager':
        return 'text-stone-300 bg-[#161922] border border-stone-600/60';
      default:
        return 'text-stone-500 bg-[#0c0e12] border border-stone-800';
    }
  };

  const isDetected = status === 'Detected';
  const isSaved = status === 'Saved';

  return (
    <div
      onClick={() => isModerator && onOpenStatusModal && onOpenStatusModal(player)}
      className={`relative flex flex-col justify-between p-3.5 sm:p-4 hud-cut select-none border font-mono ${
        isModerator ? 'cursor-pointer' : ''
      } ${
        isKilled
          ? 'bg-[#0d0e12] border-[#ff003c]/60 text-stone-500 hud-hazard-red'
          : isDetected && isModerator
          ? 'bg-[#00e5ff]/10 border-[#00e5ff]/50 text-white'
          : isSaved
          ? 'bg-[#00ff9f]/10 border-[#00ff9f]/50 text-white'
          : isCurrentPlayer
          ? 'bg-[#141824] border-[#fcee0a] shadow-[0_0_12px_rgba(252,238,10,0.15)] text-white'
          : 'bg-[#101216] border-[#fcee0a]/20 hover:border-[#fcee0a]/50 text-white'
      }`}
    >
      {/* Main Two-Line Train-Schedule Display */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          {/* Top Line: Bold/Highlighted Name */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-sm sm:text-base font-bold tracking-wider uppercase truncate ${
                isKilled
                  ? 'line-through text-[#ff003c]/80'
                  : isCurrentPlayer
                  ? 'text-[#fcee0a]'
                  : 'text-white'
              }`}
            >
              {player.name}
            </span>

            {isCurrentPlayer && (
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-[#fcee0a] text-black border border-[#fcee0a] px-2 py-0.5 shrink-0">
                [ YOU ]
              </span>
            )}

            {/* Status Badges */}
            {status === 'Killed' && (
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-[#ff003c]/20 text-[#ff003c] border border-[#ff003c] px-2 py-0.5 shrink-0 flex items-center gap-1">
                <Skull className="w-3 h-3 text-[#ff003c]" />
                <span>[ KILLED ]</span>
              </span>
            )}

            {status === 'Saved' && (
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-[#00ff9f]/20 text-[#00ff9f] border border-[#00ff9f] px-2 py-0.5 shrink-0 flex items-center gap-1">
                <Shield className="w-3 h-3 text-[#00ff9f]" />
                <span>[ SAVED ]</span>
              </span>
            )}

            {status === 'Detected' && (
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-[#00e5ff]/20 text-[#00e5ff] border border-[#00e5ff] px-2 py-0.5 shrink-0 flex items-center gap-1">
                <Search className="w-3 h-3 text-[#00e5ff]" />
                <span>[ DETECTED ]</span>
              </span>
            )}
          </div>

          {/* Bottom Line: Dimmer, role label */}
          <div className="mt-1.5 h-5 flex items-center">
            {role ? (
              <span
                className={`text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 inline-block ${
                  isKilled ? 'text-stone-500 bg-stone-900 line-through border border-stone-800' : getRoleBadgeStyle(role)
                }`}
              >
                {role}
              </span>
            ) : isModerator ? (
              <span className="text-[11px] text-[#7d8799] tracking-wider uppercase">
                UNASSIGNED
              </span>
            ) : (
              /* Muted spacer for other living players on player screen */
              <span className="text-xs text-[#7d8799]/50 select-none flex items-center gap-1 tracking-widest font-mono">
                [ HIDDEN ]
              </span>
            )}
          </div>
        </div>

        {/* Right side connection indicator & moderator action hint */}
        <div className="flex items-center gap-2 shrink-0">
          {isModerator && (
            <span className="text-[#7d8799] flex items-center gap-1 hover:text-[#fcee0a] transition-colors">
              <Settings2 className="w-4 h-4" />
            </span>
          )}
          <span
            className={`w-2 h-2 shrink-0 ${
              player.isConnected ? 'bg-[#00ff9f]' : 'bg-[#ff003c] animate-ping'
            }`}
            title={player.isConnected ? 'Connected' : 'Offline'}
          />
        </div>
      </div>

      {/* Moderator Controls Bar */}
      {isModerator && (
        <div
          className="mt-3 pt-3 border-t border-[#fcee0a]/20 flex flex-wrap items-center justify-between gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Quick Role Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-[#7d8799] uppercase tracking-wider">ROLE:</span>
            <select
              value={role || ''}
              onChange={(e) => onRoleChange && onRoleChange(player.id, (e.target.value as Role) || null)}
              className="bg-[#08090b] border border-[#fcee0a]/30 text-[#fcee0a] text-xs px-2 py-1 focus:outline-none focus:border-[#fcee0a] font-mono uppercase"
            >
              <option value="">(NONE)</option>
              <option value="Mafia">MAFIA</option>
              <option value="Detective">DETECTIVE</option>
              <option value="Doctor">DOCTOR</option>
              <option value="Villager">VILLAGER</option>
            </select>
          </div>

          {/* Two-Phone Mode: Reveal on Shared Device */}
          {isTwoPhoneMode && onRevealOnShared && (
            <button
              type="button"
              onClick={() => onRevealOnShared(player.id)}
              className="hud-btn hud-btn-primary px-2.5 py-1 text-xs flex items-center gap-1.5"
              title={`Show ${player.name}'s secret role on the shared phone`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>[ SHOW ON SHARED PHONE ]</span>
            </button>
          )}

          {/* Quick Status Button */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onOpenStatusModal && onOpenStatusModal(player)}
              className="hud-btn hud-btn-secondary px-2.5 py-1 text-xs flex items-center gap-1"
            >
              <span>[ STATUS: {status.toUpperCase()} ]</span>
            </button>

            {player.reconnectToken && (
              <button
                type="button"
                onClick={handleCopySeatLink}
                className="hud-btn hud-btn-secondary px-2.5 py-1 text-xs flex items-center gap-1"
                title={`Copy reconnect link for ${player.name}`}
              >
                {copiedSeatLink ? <Check className="w-3.5 h-3.5 text-[#00ff9f]" /> : <LinkIcon className="w-3.5 h-3.5 text-[#fcee0a]" />}
                <span className="text-[10px]">{copiedSeatLink ? '[ COPIED ]' : '[ RECONNECT LINK ]'}</span>
              </button>
            )}

            {onKick && (
              <button
                onClick={() => onKick(player.id)}
                className="p-1.5 bg-[#ff003c]/20 hover:bg-[#ff003c] text-[#ff003c] hover:text-black border border-[#ff003c]/40 transition-none"
                title={`Remove ${player.name}`}
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
