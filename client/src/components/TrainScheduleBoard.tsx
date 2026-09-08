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

  // Sort players for display: each player's own card appears FIRST on their own device,
  // followed by remaining players in their existing order. Moderator view remains unmodified.
  const getDisplayPlayers = (sectionPlayers: PublicPlayer[]): PublicPlayer[] => {
    if (isModerator || !currentPlayerId) {
      return sectionPlayers;
    }
    const myPlayer = sectionPlayers.find((p) => p.id === currentPlayerId);
    if (!myPlayer) {
      return sectionPlayers;
    }
    const otherPlayers = sectionPlayers.filter((p) => p.id !== currentPlayerId);
    return [myPlayer, ...otherPlayers];
  };

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
    <div className="w-full bg-[#101216] border border-[#fcee0a]/30 hud-cut overflow-hidden font-mono">
      {/* Top Station Timetable Header */}
      <div className="bg-[#0c0e12] px-4 sm:px-5 py-3 flex items-center justify-between text-white border-b border-[#fcee0a]/30">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 bg-[#fcee0a] animate-pulse" />
          <h3 className="text-xs sm:text-sm font-bold tracking-wider uppercase text-white">
            ACTIVE ROSTER
          </h3>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="flex items-center gap-1.5 bg-[#00ff9f]/10 text-[#00ff9f] border border-[#00ff9f]/30 px-2.5 py-0.5 font-bold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 bg-[#00ff9f]" />
            <span>{alivePlayers.length} ALIVE</span>
          </span>
          {deadPlayers.length > 0 && (
            <span className="flex items-center gap-1.5 bg-[#ff003c]/10 text-[#ff003c] border border-[#ff003c]/30 px-2.5 py-0.5 font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 bg-[#ff003c]" />
              <span>{deadPlayers.length} KILLED</span>
            </span>
          )}
        </div>
      </div>

      {/* Moderator Role Summary Bar */}
      {isModerator && (
        <div className="px-4 sm:px-5 py-2.5 bg-[#08090b] border-b border-[#fcee0a]/20 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[#7d8799] font-bold text-xs mr-1 uppercase">ASSIGNED:</span>
          {['Mafia', 'Detective', 'Doctor', 'Villager'].map((r) => {
            const count = roleCounts[r] || 0;
            return (
              <span
                key={r}
                className={`px-2 py-0.5 text-xs font-bold uppercase tracking-wider transition-none ${
                  count > 0
                    ? r === 'Mafia'
                      ? 'text-[#ff003c] bg-[#ff003c]/15 border border-[#ff003c]/40'
                      : r === 'Detective'
                      ? 'text-[#00e5ff] bg-[#00e5ff]/15 border border-[#00e5ff]/40'
                      : r === 'Doctor'
                      ? 'text-[#00ff9f] bg-[#00ff9f]/15 border border-[#00ff9f]/40'
                      : 'text-stone-200 bg-[#161922] border border-stone-600'
                    : 'text-stone-600 bg-[#0c0e12] border border-stone-800'
                }`}
              >
                {r}: {count}
              </span>
            );
          })}
          {roleCounts['Unassigned'] ? (
            <span className="text-[#fcee0a] text-xs font-bold uppercase tracking-wider">
              ({roleCounts['Unassigned']} UNASSIGNED)
            </span>
          ) : null}
        </div>
      )}

      {/* Render Each Round Section */}
      <div className="space-y-1 py-1">
        {sectionsToRender.map((section) => {
          const isLatestRound = section.round === currentRound;
          const displayPlayers = getDisplayPlayers(section.players);

          return (
            <div key={section.round} className="space-y-0">
              {/* Distinct Round Divider Strap */}
              <div
                className={`relative px-4 py-2 flex items-center justify-between mx-3 my-2 border transition-none font-mono ${
                  isLatestRound
                    ? 'bg-[#141824] border-[#fcee0a]/40 text-white'
                    : 'bg-[#0c0e12] border-[#7d8799]/30 text-[#7d8799]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 shrink-0 ${
                      isLatestRound
                        ? 'bg-[#fcee0a] text-black border border-[#fcee0a]'
                        : 'bg-stone-900 text-stone-500 border border-stone-700'
                    }`}
                  >
                    [ ROUND {section.round} ]
                  </span>

                  <div className="flex items-center gap-1.5 truncate">
                    {isLatestRound && (
                      <span className="w-1.5 h-1.5 bg-[#fcee0a] animate-pulse shrink-0" />
                    )}
                    <span
                      className={`text-xs sm:text-sm font-bold tracking-wider uppercase truncate ${
                        isLatestRound ? 'text-white' : 'text-[#7d8799]'
                      }`}
                    >
                      {isLatestRound ? 'CURRENT ROUND' : 'PAST ROUND'}
                    </span>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-bold uppercase tracking-wider shrink-0 ml-2 px-2 py-0.5 ${
                    isLatestRound
                      ? 'bg-[#00ff9f]/15 text-[#00ff9f] border border-[#00ff9f]/40'
                      : 'bg-stone-900 text-stone-600 border border-stone-800'
                  }`}
                >
                  {isLatestRound ? '[ IN PROGRESS ]' : '[ CONCLUDED ]'}
                </span>
              </div>

              {/* Cards for this Round Section */}
              <div className="p-3 sm:p-4 bg-transparent">
                {displayPlayers.length === 0 ? (
                  <div className="py-8 text-center text-stone-500 text-xs">
                    No active players in this round.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {displayPlayers.map((p) => (
                      <TrainScheduleCard
                        key={`${section.round}-${p.id}`}
                        player={p}
                        roomCode={roomCode}
                        isModerator={isModerator && isLatestRound}
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
