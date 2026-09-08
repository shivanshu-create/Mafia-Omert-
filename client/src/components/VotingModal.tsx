import React, { useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { AlertTriangle, Vote, Users } from 'lucide-react';
import { ConfirmationModal } from './ConfirmationModal';

export const VotingModal: React.FC = () => {
  const {
    activeVote,
    castVote,
    cancelVote,
    isModerator,
    currentPlayer,
  } = useSocket();

  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);

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

  const handleCancelVote = () => {
    setShowCancelConfirm(true);
  };

  const handleConfirmCancelVote = async () => {
    setIsCanceling(true);
    await cancelVote();
    setIsCanceling(false);
    setShowCancelConfirm(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-none font-mono">
      <div className="relative w-full max-w-md bg-[#101216] border border-[#fcee0a] hud-cut shadow-[0_0_35px_rgba(0,0,0,0.95)] flex flex-col max-h-[90vh] overflow-hidden animate-hud-modal-snap">
        {/* Top Cyberpunk Hazard Stripe */}
        <div className="h-1.5 w-full bg-[#fcee0a] hud-hazard-yellow" />

        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#fcee0a]/30 bg-[#0c0e12] text-white flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2 py-0.5 bg-[#fcee0a] text-black text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <Vote className="w-3 h-3" />
                  [ DAY VOTE • ROUND {activeVote.round} ]
                </span>
                {activeVote.isTieBreak && (
                  <span className="px-2 py-0.5 bg-[#ff003c] text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-white" />
                    [ TIE-BREAK ]
                  </span>
                )}
              </div>
              <h3 className="font-bold text-base text-white tracking-wider uppercase">
                {activeVote.isTieBreak ? 'TIE-BREAKER VOTE' : 'TOWN ELIMINATION VOTE'}
              </h3>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[10px] uppercase text-[#7d8799] block tracking-wider font-bold">VOTES CAST</span>
              <span className="text-sm sm:text-base font-bold text-[#fcee0a] bg-[#08090b] px-2 py-0.5 border border-[#fcee0a]/40 inline-block">
                {activeVote.totalVotesCast} <span className="text-[#7d8799] text-xs">/ {activeVote.totalVotersNeeded}</span>
              </span>
            </div>
          </div>

          {/* Overall Voting Progress Track */}
          <div className="w-full bg-[#08090b] h-2 overflow-hidden border border-[#fcee0a]/30">
            <div
              className="bg-[#fcee0a] h-full transition-all duration-200"
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
          <div className="px-4 py-2 bg-[#ff003c]/15 border-b border-[#ff003c]/40 text-[#ff003c] text-xs font-bold uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#ff003c] shrink-0" />
            <span>TIE DETECTED &bull; REVOTE RESTRICTED TO TIED PLAYERS</span>
          </div>
        )}

        {/* Spectator Notice */}
        {isSpectator && (
          <div className="px-4 py-2 bg-[#0c0e12] text-[#7d8799] text-xs border-b border-[#fcee0a]/20 flex items-center gap-2 uppercase font-bold tracking-wider">
            <Users className="w-3.5 h-3.5 text-[#fcee0a]" />
            <span>[ SPECTATOR MODE ]</span>
          </div>
        )}

        {/* Candidate List */}
        <div className="p-3 sm:p-4 overflow-y-auto space-y-2 flex-1 bg-[#101216]">
          {votableCandidates.length === 0 ? (
            <div className="py-8 text-center text-[#7d8799] text-xs uppercase">
              No eligible candidates for selection.
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
                  className={`relative hud-cut-sm p-3 select-none overflow-hidden transition-none border font-mono ${
                    !isSpectator && !isModerator ? 'cursor-pointer' : ''
                  } ${
                    isSelected
                      ? 'bg-[#181c28] border-2 border-[#fcee0a] shadow-[0_0_15px_rgba(252,238,10,0.15)]'
                      : 'bg-[#0c0e12] hover:bg-[#141720] border border-[#fcee0a]/20'
                  }`}
                >
                  {/* Progress Bar Fill Background */}
                  {voteCount > 0 && (
                    <div
                      className="absolute inset-0 bg-[#fcee0a]/10 pointer-events-none transition-all duration-200"
                      style={{ width: `${percentage}%` }}
                    />
                  )}

                  <div className="relative z-10 flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-3 min-w-0">
                      {!isModerator && !isSpectator && (
                        <div className="shrink-0">
                          {isSelected ? (
                            <div className="w-4 h-4 bg-[#fcee0a] text-black flex items-center justify-center text-xs font-bold">
                              ✓
                            </div>
                          ) : (
                            <div className="w-4 h-4 border border-[#fcee0a]/40 bg-[#08090b]" />
                          )}
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm sm:text-base font-bold text-white uppercase tracking-wider truncate">
                            {candidate.name}
                          </span>
                          {isSelected && (
                            <span className="text-[10px] font-bold uppercase text-black bg-[#fcee0a] px-1.5 py-0.2 shrink-0">
                              [ SELECTED ]
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Vote count pill */}
                    <div className="text-right shrink-0 flex items-center gap-2">
                      {voteCount > 0 && (
                        <span className="text-xs font-bold text-[#7d8799]">
                          {percentage}%
                        </span>
                      )}
                      <span
                        className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 border ${
                          voteCount > 0
                            ? 'bg-[#fcee0a]/15 text-[#fcee0a] border-[#fcee0a]/50'
                            : 'bg-[#08090b] text-[#7d8799] border-stone-800'
                        }`}
                      >
                        {voteCount} {voteCount === 1 ? 'VOTE' : 'VOTES'}
                      </span>
                    </div>
                  </div>

                  {/* Voter Name Tags */}
                  {candidate.voterNames.length > 0 && (
                    <div className="relative z-10 mt-2.5 pt-2 border-t border-[#fcee0a]/10 flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-bold text-[#7d8799] uppercase mr-1">VOTERS:</span>
                      {candidate.voterNames.map((name, i) => (
                        <span
                          key={i}
                          className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 border flex items-center gap-1 ${
                            currentPlayer && name === currentPlayer.name
                              ? 'bg-[#fcee0a] text-black border-[#fcee0a]'
                              : 'bg-[#08090b] text-stone-300 border-[#fcee0a]/20'
                          }`}
                        >
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
        <div className="p-3.5 sm:p-4 border-t border-[#fcee0a]/30 bg-[#0c0e12] flex items-center justify-between gap-3">
          <p className="text-[11px] text-[#7d8799] font-bold uppercase tracking-wider">
            {isModerator
              ? 'Resolves automatically when all votes are cast.'
              : isSpectator
              ? 'Watching live votes in real time.'
              : 'Select a player to cast or change your vote.'}
          </p>

          {isModerator && (
            <button
              onClick={handleCancelVote}
              className="hud-btn hud-btn-danger px-3 py-1.5 text-xs shrink-0"
            >
              [ CANCEL VOTE ]
            </button>
          )}
        </div>
      </div>

      {/* Cancel Day Vote Confirmation Modal */}
      <ConfirmationModal
        isOpen={showCancelConfirm}
        title="Cancel Day Vote?"
        message="Are you sure you want to cancel this day vote session? All cast votes for this round will be discarded."
        confirmLabel="Cancel Vote"
        cancelLabel="Keep Voting"
        confirmVariant="danger"
        isConfirming={isCanceling}
        onConfirm={handleConfirmCancelVote}
        onCancel={() => {
          if (!isCanceling) setShowCancelConfirm(false);
        }}
      />
    </div>
  );
};
