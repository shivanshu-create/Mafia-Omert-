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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 font-mono">
      <div className="w-full max-w-sm max-h-[90vh] overflow-y-auto bg-[#101216] border border-[#fcee0a] hud-cut shadow-[0_0_35px_rgba(0,0,0,0.95)] p-5 sm:p-6 text-center relative animate-hud-modal-snap">
        {/* Top Cyberpunk Hazard Stripe */}
        <div className="h-1.5 w-full bg-[#fcee0a] hud-hazard-yellow mb-4" />

        {/* Progress header */}
        <div className="flex items-center justify-between text-xs text-[#7d8799] border-b border-[#fcee0a]/20 pb-3 mb-4">
          <div className="flex items-center gap-1.5 font-bold text-xs text-[#fcee0a] uppercase tracking-wider">
            <Vote className="w-3.5 h-3.5" />
            <span>{activeVote.isTieBreak ? '[ TIE-BREAKER VOTE ]' : '[ DAY VOTE ]'}</span>
          </div>
          <div className="text-xs text-[#fcee0a] font-bold bg-[#08090b] px-2.5 py-1 border border-[#fcee0a]/40">
            {activeVote.totalVotesCast} / {activeVote.totalVotersNeeded} VOTES
          </div>
        </div>

        {/* Stage 1: Privacy Curtain Before Passing */}
        {stage === 'curtain' && currentVoter && (
          <div className="space-y-4 py-2">
            <div className="w-14 h-14 bg-[#fcee0a]/10 border border-[#fcee0a]/40 flex items-center justify-center text-[#fcee0a] mx-auto">
              <Lock className="w-7 h-7" />
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 bg-[#fcee0a]/20 border border-[#fcee0a]/40 text-[#fcee0a] text-[10px] font-bold uppercase tracking-wider mb-2">
                <Smartphone className="w-3.5 h-3.5" />
                <span>PASS-THE-PHONE</span>
              </div>
              <h2 className="text-[10px] uppercase font-bold text-[#7d8799] tracking-wider">
                PASS PHONE TO
              </h2>
              <div className="text-2xl font-bold text-[#fcee0a] mt-1 tracking-wider uppercase">
                {currentVoter.name}
              </div>
            </div>

            <p className="text-xs text-[#7d8799] leading-relaxed px-2">
              Pass phone to <strong className="text-white">{currentVoter.name}</strong> to vote privately.
            </p>

            <button
              onClick={handleRevealBallot}
              className="hud-btn hud-btn-primary w-full py-3 text-xs"
            >
              [ I AM {currentVoter.name.toUpperCase()} &bull; VOTE NOW ]
            </button>
          </div>
        )}

        {/* Stage 2: Secret Ballot Selection */}
        {stage === 'ballot' && currentVoter && (
          <div className="space-y-4 py-1 text-left">
            <div className="text-center pb-1">
              <span className="text-[10px] uppercase tracking-wider text-[#7d8799] font-bold block">
                VOTING AS:
              </span>
              <span className="text-xl font-bold text-[#fcee0a] uppercase tracking-wider">
                {currentVoter.name}
              </span>
              {activeVote.isTieBreak && (
                <div className="mt-1 flex items-center justify-center gap-1 text-xs text-[#ff003c] font-bold uppercase">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>TIED PLAYER REVOTE</span>
                </div>
              )}
            </div>

            <p className="text-[10px] text-[#7d8799] uppercase font-bold text-center tracking-wider">
              VOTE TO ELIMINATE:
            </p>

            {/* Candidates list */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {votableCandidates.length === 0 ? (
                <div className="text-xs text-[#7d8799] uppercase italic text-center py-4">
                  No other players to vote for.
                </div>
              ) : (
                votableCandidates.map((c) => {
                  const isSelected = selectedCandidateId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedCandidateId(c.id)}
                      className={`w-full flex items-center justify-between p-3 hud-cut-sm border text-left select-none font-mono ${
                        isSelected
                          ? 'bg-[#181c28] border-2 border-[#fcee0a] text-white shadow-[0_0_12px_rgba(252,238,10,0.2)]'
                          : 'bg-[#08090b] hover:bg-[#141720] border-[#fcee0a]/20 text-stone-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 ${isSelected ? 'bg-[#fcee0a] text-black' : 'bg-[#101216] text-[#7d8799]'}`}>
                          <User className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-xs sm:text-sm uppercase tracking-wider">{c.name}</span>
                      </div>

                      <div
                        className={`w-4 h-4 border flex items-center justify-center ${
                          isSelected ? 'bg-[#fcee0a] border-[#fcee0a] text-black font-bold' : 'border-[#fcee0a]/40 bg-[#08090b]'
                        }`}
                      >
                        {isSelected && <span className="text-xs font-bold">✓</span>}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <button
              onClick={handleConfirmVote}
              disabled={!selectedCandidateId || isCasting}
              className="hud-btn hud-btn-primary w-full py-3 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isCasting ? '[ SUBMITTING VOTE... ]' : '[ CONFIRM VOTE ]'}
            </button>
          </div>
        )}

        {/* Stage 3: Handoff Confirmation */}
        {stage === 'handoff' && (
          <div className="space-y-4 py-2">
            <div className="w-14 h-14 bg-[#00ff9f]/10 border border-[#00ff9f]/40 flex items-center justify-center text-[#00ff9f] mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div>
              <h3 className="font-bold text-xl text-white tracking-wider uppercase">
                [ VOTE RECORDED ]
              </h3>
              <p className="text-xs text-[#7d8799] mt-1">
                <strong className="text-white">{justVotedName}</strong>'s vote has been recorded.
              </p>
            </div>

            {currentVoter ? (
              <div className="space-y-3">
                <div className="text-xs text-stone-300 bg-[#08090b] border border-[#fcee0a]/30 p-3">
                  <span className="text-[#7d8799] uppercase text-[10px] block font-bold">NEXT PLAYER:</span>
                  <span className="text-[#fcee0a] text-base font-bold uppercase tracking-wider">{currentVoter.name}</span>
                </div>

                <button
                  onClick={handleContinueNextVoter}
                  className="hud-btn hud-btn-secondary w-full py-3 text-xs"
                >
                  [ PASS TO NEXT PLAYER ]
                </button>
              </div>
            ) : (
              <div className="py-2 text-xs text-[#7d8799] uppercase font-bold">
                <p className="text-white">All players have cast their votes.</p>
                <p className="mt-1 text-[#fcee0a]">Tallying results...</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
