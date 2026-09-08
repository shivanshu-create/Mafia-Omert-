import React from 'react';
import { useSocket } from '../context/SocketContext';
import { AlertTriangle, Vote, Users } from 'lucide-react';

export const VotingModal: React.FC = () => {
  const {
    activeVote,
    castVote,
    cancelVote,
    isModerator,
    currentPlayer,
  } = useSocket();

  if (!activeVote || !activeVote.isOpen) return null;

  const isPlayerAlive = currentPlayer ? currentPlayer.isAlive !== false : false;
  const isSpectator = !isModerator && !isPlayerAlive;
  const myPlayerId = currentPlayer?.id;

  // Determine which candidate the current player voted for
  const mySelectedCandidateId =
    (myPlayerId && activeVote.votesByPlayer?.[myPlayerId]) ||
    activeVote.candidates.find((c) =>
      myPlayerId ? c.votes.includes(myPlayerId) : false
    )?.id;

  // Exclude current player's own name from their votable options (moderator & spectator observe all)
  const votableCandidates = activeVote.candidates.filter(
    (c) => isSpectator || isModerator || c.id !== myPlayerId
  );

  const handleVoteClick = async (candidateId: string) => {
    if (isSpectator || isModerator) return;
    if (myPlayerId && candidateId === myPlayerId) return;
    await castVote(candidateId);
  };

  const handleCancelVote = async () => {
    if (confirm('Are you sure you want to cancel this day vote?')) {
      await cancelVote();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75">
      <div className="relative w-full max-w-md bg-white border-2 border-black rounded-none shadow-none flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b-2 border-black bg-[#800000] text-white flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-1.5 py-0.5 rounded-none bg-black text-white border border-white text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
                  <Vote className="w-3 h-3" />
                  DAY VOTE &bull; ROUND {activeVote.round}
                </span>
                {activeVote.isTieBreak && (
                  <span className="px-1.5 py-0.5 rounded-none bg-amber-400 text-black border border-black text-[10px] font-mono font-black uppercase tracking-wider flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-black" />
                    TIE-BREAK
                  </span>
                )}
              </div>
              <h3 className="font-mono font-black text-base sm:text-lg text-white tracking-wide uppercase">
                {activeVote.isTieBreak ? 'Tie-Break Elimination' : 'Town Accusation Vote'}
              </h3>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[10px] uppercase font-mono text-stone-200 block tracking-wider font-bold">Ballots Cast</span>
              <span className="font-mono text-sm sm:text-base font-black text-white">
                {activeVote.totalVotesCast} <span className="text-stone-300 font-normal text-xs">/ {activeVote.totalVotersNeeded}</span>
              </span>
            </div>
          </div>

          {/* Overall Voting Progress Track */}
          <div className="w-full bg-stone-200 rounded-none h-2.5 overflow-hidden border border-black">
            <div
              className="bg-black h-full transition-all duration-200"
              style={{
                width: `${
                  activeVote.totalVotersNeeded > 0
                    ? Math.round((activeVote.totalVotesCast / activeVote.totalVotersNeeded) * 100)
                    : 0
                }%`,
              }}
            />
          </div>
        </div>

        {/* Tie-break Alert Banner */}
        {activeVote.isTieBreak && (
          <div className="px-4 py-2 bg-[#fff3cd] border-b-2 border-black text-[#856404] text-xs font-mono font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#856404] shrink-0" />
            <span>The previous vote tied! Revoting restricted to tied candidates.</span>
          </div>
        )}

        {/* Spectator Notice */}
        {isSpectator && (
          <div className="px-4 py-2 bg-[#f4f4f4] text-stone-800 text-xs font-mono font-bold border-b-2 border-black flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-stone-700" />
            <span>Spectator View &bull; Live Ballot Monitor</span>
          </div>
        )}

        {/* Candidate List */}
        <div className="p-3 sm:p-4 overflow-y-auto space-y-2 flex-1 bg-white">
          {votableCandidates.length === 0 ? (
            <div className="py-8 text-center text-stone-500 font-mono text-xs">
              No eligible candidates to vote for.
            </div>
          ) : (
            votableCandidates.map((candidate) => {
              const isSelected = candidate.id === mySelectedCandidateId;
              const voteCount = candidate.votes.length;
              const percentage =
                activeVote.totalVotersNeeded > 0
                  ? Math.round((voteCount / activeVote.totalVotersNeeded) * 100)
                  : 0;

              return (
                <div
                  key={candidate.id}
                  onClick={() => !isSpectator && !isModerator && handleVoteClick(candidate.id)}
                  className={`relative rounded-none border-2 p-2.5 sm:p-3 select-none overflow-hidden ${
                    !isSpectator && !isModerator ? 'cursor-pointer active:translate-y-px' : ''
                  } ${
                    isSelected
                      ? 'bg-[#fbebee] border-[#800000] ring-2 ring-[#800000]'
                      : 'bg-white border-black hover:bg-[#f9f9f9]'
                  }`}
                >
                  {/* Progress Bar Fill Background */}
                  {voteCount > 0 && (
                    <div
                      className="absolute inset-0 bg-[#800000]/10 pointer-events-none"
                      style={{ width: `${percentage}%` }}
                    />
                  )}

                  <div className="relative z-10 flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {!isModerator && !isSpectator && (
                        <div className="shrink-0 text-[#800000]">
                          {isSelected ? (
                            <div className="w-4 h-4 bg-[#800000] border border-black text-white flex items-center justify-center text-xs font-mono font-black">
                              ✓
                            </div>
                          ) : (
                            <div className="w-4 h-4 bg-white border border-black" />
                          )}
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm sm:text-base font-black text-black truncate">
                            {candidate.name}
                          </span>
                          {isSelected && (
                            <span className="text-[9px] font-mono font-black uppercase text-white bg-[#800000] border border-black px-1.5 py-0.2 rounded-none shrink-0">
                              YOU
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Vote count pill */}
                    <div className="text-right shrink-0 flex items-center gap-1.5">
                      {voteCount > 0 && (
                        <span className="text-[11px] font-mono text-stone-600 font-bold">
                          {percentage}%
                        </span>
                      )}
                      <span
                        className={`font-mono text-xs font-black px-2 py-0.5 rounded-none border-2 border-black ${
                          voteCount > 0
                            ? 'bg-[#800000] text-white'
                            : 'bg-[#efefef] text-black'
                        }`}
                      >
                        {voteCount} {voteCount === 1 ? 'vote' : 'votes'}
                      </span>
                    </div>
                  </div>

                  {/* Voter Name Tags */}
                  {candidate.voterNames.length > 0 && (
                    <div className="relative z-10 mt-2 pt-2 border-t border-black flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-mono uppercase font-black text-stone-700 mr-1">Voters:</span>
                      {candidate.voterNames.map((name, i) => (
                        <span
                          key={i}
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-none border border-black flex items-center gap-1 ${
                            currentPlayer && name === currentPlayer.name
                              ? 'bg-[#800000] text-white'
                              : 'bg-[#e0e0e0] text-black'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-none border border-black ${
                              currentPlayer && name === currentPlayer.name ? 'bg-white' : 'bg-black'
                            }`}
                          />
                          <span>{name}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer info & moderator cancel */}
        <div className="p-3 border-t-2 border-black bg-[#f4f4f4] flex items-center justify-between gap-3">
          <p className="text-[11px] text-stone-700 font-mono font-bold">
            {isModerator
              ? 'Vote auto-resolves when all players vote.'
              : isSpectator
              ? 'Observing live poll in progress.'
              : 'Click candidate to cast or change vote.'}
          </p>

          {isModerator && (
            <button
              onClick={handleCancelVote}
              className="px-3 py-1.5 rounded-none bg-[#efefef] hover:bg-[#dfdfdf] text-black text-xs font-mono font-bold border-2 border-black shrink-0"
            >
              Cancel Vote
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
