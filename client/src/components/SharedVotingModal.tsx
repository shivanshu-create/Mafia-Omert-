import React, { useState, useMemo } from 'react';
import { useSocket } from '../context/SocketContext';
import { Smartphone, Lock, CheckCircle2, User, Vote, ShieldAlert } from 'lucide-react';

export const SharedVotingModal: React.FC = () => {
  const { activeVote, roomState, castSharedVote } = useSocket();

  // Selected candidate for currently voting player
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [isCasting, setIsCasting] = useState(false);
  const [stage, setStage] = useState<'curtain' | 'ballot' | 'handoff'>('curtain');
  const [justVotedName, setJustVotedName] = useState<string>('');

  // Alive players who need to vote
  const alivePlayers = useMemo(() => {
    if (!roomState) return [];
    return roomState.players.filter((p) => p.isAlive).sort((a, b) => a.joinedAt - b.joinedAt);
  }, [roomState]);

  // Set of player IDs that have already cast a vote in this active session
  const votedPlayerIds = useMemo(() => {
    if (!activeVote) return new Set<string>();
    const ids = new Set<string>();
    for (const c of activeVote.candidates) {
      for (const voterId of c.votes) {
        ids.add(voterId);
      }
    }
    return ids;
  }, [activeVote]);

  // Next player who needs to vote
  const currentVoter = useMemo(() => {
    return alivePlayers.find((p) => !votedPlayerIds.has(p.id)) || null;
  }, [alivePlayers, votedPlayerIds]);

  // Candidates that the current voter is allowed to vote for (cannot vote for themselves)
  const votableCandidates = useMemo(() => {
    if (!activeVote) return [];
    if (!currentVoter) return activeVote.candidates;
    return activeVote.candidates.filter((c) => c.id !== currentVoter.id);
  }, [activeVote, currentVoter]);

  if (!activeVote || !activeVote.isOpen) return null;

  const handleRevealBallot = () => {
    setSelectedCandidateId(null);
    setStage('ballot');
  };

  const handleConfirmVote = async () => {
    if (!currentVoter || !selectedCandidateId || isCasting) return;
    if (currentVoter.id === selectedCandidateId) return;

    setIsCasting(true);
    const voterName = currentVoter.name;
    const res = await castSharedVote(currentVoter.id, selectedCandidateId);
    setIsCasting(false);

    if (res.success) {
      setJustVotedName(voterName);
      setSelectedCandidateId(null);
      setStage('handoff');
    }
  };

  const handleContinueNextVoter = () => {
    setStage('curtain');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75">
      <div className="w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-none bg-white border-2 border-black shadow-none p-4 sm:p-6 text-center relative">
        {/* Progress header */}
        <div className="flex items-center justify-between text-xs text-stone-700 border-b-2 border-black pb-2.5 mb-4 font-mono">
          <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px] text-[#800000]">
            <Vote className="w-3.5 h-3.5" />
            <span>{activeVote.isTieBreak ? 'Tie-Breaker Re-Vote' : 'Day Phase Vote'}</span>
          </div>
          <div className="font-mono text-[11px] text-black font-black">
            {activeVote.totalVotesCast} / {activeVote.totalVotersNeeded} Votes Cast
          </div>
        </div>

        {/* Stage 1: Privacy Curtain Before Passing */}
        {stage === 'curtain' && currentVoter && (
          <div className="space-y-4 py-2">
            <div className="w-14 h-14 rounded-none bg-[#efefef] border-2 border-black flex items-center justify-center text-[#800000] mx-auto">
              <Lock className="w-7 h-7" />
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-none bg-[#fff3cd] border border-black text-[#856404] text-[10px] font-mono font-bold uppercase tracking-wider mb-2">
                <Smartphone className="w-3.5 h-3.5" />
                <span>Pass-the-Phone</span>
              </div>
              <h2 className="font-mono font-black text-lg text-black tracking-wider uppercase">
                PASS PHONE TO
              </h2>
              <div className="font-mono text-2xl font-black text-[#800000] mt-1 uppercase tracking-wide">
                {currentVoter.name}
              </div>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed px-2 font-mono">
              Pass device to <strong className="text-black">{currentVoter.name}</strong> to cast their private ballot.
            </p>

            <button
              onClick={handleRevealBallot}
              className="retro-btn-primary w-full py-3 px-4 text-xs font-mono font-black uppercase tracking-wider"
            >
              I am {currentVoter.name} &bull; Vote Now
            </button>
          </div>
        )}

        {/* Stage 2: Secret Ballot Selection */}
        {stage === 'ballot' && currentVoter && (
          <div className="space-y-4 py-1 text-left">
            <div className="text-center pb-1">
              <span className="text-[10px] uppercase tracking-wider text-stone-600 font-bold block font-mono">
                Voting as
              </span>
              <span className="font-mono text-xl font-black text-black uppercase tracking-wide">
                {currentVoter.name}
              </span>
              {activeVote.isTieBreak && (
                <div className="mt-1 flex items-center justify-center gap-1 text-[11px] text-[#856404] font-bold font-mono">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Tied candidates re-vote</span>
                </div>
              )}
            </div>

            <p className="text-xs text-stone-600 text-center font-mono">
              Select one suspect to vote for elimination:
            </p>

            {/* Candidates list */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {votableCandidates.length === 0 ? (
                <div className="text-xs text-stone-500 italic text-center py-4 font-mono">
                  No other alive players available to vote for.
                </div>
              ) : (
                votableCandidates.map((c) => {
                  const isSelected = selectedCandidateId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedCandidateId(c.id)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-none border-2 transition-none text-left select-none ${
                        isSelected
                          ? 'bg-[#fbebee] border-[#800000] ring-2 ring-[#800000] text-black'
                          : 'bg-white hover:bg-[#f9f9f9] border-black text-black'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`p-1 border border-black rounded-none ${isSelected ? 'bg-[#800000] text-white' : 'bg-[#efefef] text-black'}`}>
                          <User className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-mono font-bold text-xs sm:text-sm">{c.name}</span>
                      </div>

                      <div
                        className={`w-4 h-4 rounded-none border border-black flex items-center justify-center ${
                          isSelected ? 'bg-[#800000] text-white' : 'bg-white'
                        }`}
                      >
                        {isSelected && <span className="text-[10px] font-mono font-black">✓</span>}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <button
              onClick={handleConfirmVote}
              disabled={!selectedCandidateId || isCasting}
              className="retro-btn-primary w-full py-3 px-4 text-xs font-mono font-black uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCasting ? 'Submitting Ballot...' : 'Confirm Secret Vote'}
            </button>
          </div>
        )}

        {/* Stage 3: Handoff Confirmation */}
        {stage === 'handoff' && (
          <div className="space-y-4 py-2">
            <div className="w-14 h-14 rounded-none bg-[#ecfdf5] border-2 border-black flex items-center justify-center text-[#065f46] mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div>
              <h3 className="font-mono font-black text-xl text-black tracking-wider uppercase">
                VOTE RECORDED
              </h3>
              <p className="text-xs text-stone-600 mt-1 font-mono">
                <strong className="text-black">{justVotedName}&apos;s</strong> vote has been privately submitted.
              </p>
            </div>

            {currentVoter ? (
              <div className="space-y-3">
                <p className="text-xs text-black bg-[#f4f4f4] border-2 border-black p-2.5 rounded-none font-mono">
                  Next up: <strong className="text-[#800000] text-sm">{currentVoter.name}</strong>
                </p>

                <button
                  onClick={handleContinueNextVoter}
                  className="retro-btn-secondary w-full py-3 px-4 text-xs font-mono font-black uppercase tracking-wider"
                >
                  Pass to Next Player
                </button>
              </div>
            ) : (
              <div className="py-2 text-xs text-stone-600 font-mono">
                <p className="font-bold text-black">All alive players have voted!</p>
                <p className="mt-1">Resolving final ballot...</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
