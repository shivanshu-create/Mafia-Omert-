import React from 'react';
import { PublicPlayer, PublicRoundSection, Role } from '../types';
import { TrainScheduleCard } from './TrainScheduleCard';

interface TrainScheduleBoardProps {
  rounds?: PublicRoundSection[];
  players?: PublicPlayer[];
  currentRound?: number;
  roomCode?: string;
  isModerator?: boolean;
  currentPlayerId?: string;
  isTwoPhoneMode?: boolean;
  onRoleChange?: (playerId: string, role: Role | null) => void;
  onRevealOnShared?: (playerId: string) => void;
  onOpenStatusModal?: (player: PublicPlayer) => void;
  onKick?: (playerId: string) => void;
}

export const TrainScheduleBoard: React.FC<TrainScheduleBoardProps> = ({
  rounds = [],
  players = [],
  currentRound = 1,
  roomCode,
  isModerator = false,
  currentPlayerId,
  isTwoPhoneMode = false,
  onRoleChange,
  onRevealOnShared,
  onOpenStatusModal,
  onKick,
}) => {
  // Count roles for summary (moderator view)
  const roleCounts = players.reduce<Record<string, number>>((acc, p) => {
    if (p.role) {
      acc[p.role] = (acc[p.role] || 0) + 1;
    } else {
      acc['Unassigned'] = (acc['Unassigned'] || 0) + 1;
    }
    return acc;
  }, {});

  const alivePlayers = players.filter((p) => p.isAlive !== false);
  const deadPlayers = players.filter((p) => p.isAlive === false);

  // If rounds array is provided, render multi-round sections; otherwise fallback to single section
  const sectionsToRender: PublicRoundSection[] =
    rounds.length > 0
      ? rounds
      : [
          {
            round: currentRound,
            players,
          },
        ];

  return (
    <div className="w-full bg-white rounded-none border-2 border-black shadow-none overflow-hidden font-sans">
      {/* Top Station Timetable Header */}
      <div className="bg-[#800000] px-4 py-2.5 border-b-2 border-black flex items-center justify-between text-white">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-none bg-white border border-black animate-pulse" />
          <h3 className="font-mono text-xs sm:text-sm font-black tracking-wider uppercase">
            STATUS BOARD &bull; LIVE ROSTER
          </h3>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="flex items-center gap-1.5 bg-white text-black border border-black px-2 py-0.5 font-bold">
            <span className="w-2 h-2 rounded-none bg-emerald-600" />
            <span>{alivePlayers.length} Active</span>
          </span>
          {deadPlayers.length > 0 && (
            <span className="flex items-center gap-1.5 bg-[#d8d8d8] text-black border border-black px-2 py-0.5 font-bold">
              <span className="w-2 h-2 rounded-none bg-stone-700" />
              <span>{deadPlayers.length} Killed</span>
            </span>
          )}
        </div>
      </div>

      {/* Moderator Role Summary Bar */}
      {isModerator && (
        <div className="px-4 py-2 bg-[#f4f4f4] border-b-2 border-black flex flex-wrap items-center gap-2 text-xs font-mono">
          <span className="text-stone-700 uppercase font-black text-[11px]">Roles Assigned:</span>
          {['Mafia', 'Detective', 'Doctor', 'Villager'].map((r) => {
            const count = roleCounts[r] || 0;
            return (
              <span
                key={r}
                className={`px-2 py-0.5 rounded-none border-2 border-black text-[11px] font-bold ${
                  count > 0
                    ? r === 'Mafia'
                      ? 'text-[#800000] bg-[#fbebee]'
                      : r === 'Detective'
                      ? 'text-[#003399] bg-[#eef4ff]'
                      : r === 'Doctor'
                      ? 'text-[#1e824c] bg-[#eafaf1]'
                      : 'text-black bg-white'
                    : 'text-stone-400 bg-[#e8e8e8]'
                }`}
              >
                {r}: {count}
              </span>
            );
          })}
          {roleCounts['Unassigned'] ? (
            <span className="text-[#800000] text-[11px] italic font-bold">
              ({roleCounts['Unassigned']} Unassigned)
            </span>
          ) : null}
        </div>
      )}

      {/* Render Each Round Section */}
      <div className="divide-y-2 divide-black">
        {sectionsToRender.map((section) => {
          const isLatestRound = section.round === currentRound;

          return (
            <div key={section.round} className="space-y-0">
              {/* Distinct Train-Schedule Round Divider Strap */}
              <div
                className={`relative px-4 py-2 flex items-center justify-between border-b-2 border-black transition-colors ${
                  isLatestRound
                    ? 'bg-[#800000] text-white'
                    : 'bg-[#d8d8d8] text-black'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {/* High-contrast Round Badge */}
                  <span
                    className={`font-mono text-[11px] sm:text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-none border-2 border-black shrink-0 ${
                      isLatestRound
                        ? 'bg-white text-black'
                        : 'bg-stone-200 text-black'
                    }`}
                  >
                    ROUND {section.round}
                  </span>

                  <div className="flex items-center gap-1.5 truncate">
                    {isLatestRound && (
                      <span className="w-2 h-2 rounded-none bg-white animate-pulse shrink-0 border border-black" />
                    )}
                    <span
                      className={`font-mono text-xs sm:text-sm font-bold tracking-wider uppercase truncate ${
                        isLatestRound ? 'text-white' : 'text-stone-800'
                      }`}
                    >
                      {isLatestRound ? 'Active Manifest' : 'Concluded'}
                    </span>
                  </div>
                </div>

                <span
                  className={`text-[10px] sm:text-[11px] font-mono uppercase tracking-wider shrink-0 ml-2 font-black px-2 py-0.5 rounded-none border border-black ${
                    isLatestRound
                      ? 'bg-white text-[#800000]'
                      : 'bg-white text-stone-700'
                  }`}
                >
                  {isLatestRound ? 'Current Phase' : 'Archived'}
                </span>
              </div>

              {/* Cards for this Round Section */}
              <div className="p-3 sm:p-4 bg-white">
                {section.players.length === 0 ? (
                  <div className="py-8 text-center text-stone-500 font-mono text-xs">
                    No active players in this round.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                    {section.players.map((p) => (
                      <TrainScheduleCard
                        key={`${section.round}-${p.id}`}
                        player={p}
                        roomCode={roomCode}
                        isModerator={isModerator && isLatestRound} // Controls only on latest round
                        isCurrentPlayer={p.id === currentPlayerId}
                        isTwoPhoneMode={isTwoPhoneMode}
                        onRoleChange={onRoleChange}
                        onRevealOnShared={onRevealOnShared}
                        onOpenStatusModal={onOpenStatusModal}
                        onKick={onKick}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
