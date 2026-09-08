import React, { useState } from 'react';
import { X, BookOpen, Shield, Users, Smartphone, Vote, RotateCcw, Search, Skull, Heart } from 'lucide-react';

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'players' | 'moderator';
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'players',
}) => {
  const [activeTab, setActiveTab] = useState<'players' | 'moderator'>(defaultTab);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 font-mono">
      <div className="w-full max-w-lg bg-[#101216] hud-cut border border-[#fcee0a] shadow-[0_0_35px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col max-h-[90vh] animate-hud-modal-snap">
        {/* Top Hazard Stripe */}
        <div className="h-1.5 w-full bg-[#fcee0a] hud-hazard-yellow shrink-0" />

        {/* Modal Header */}
        <div className="p-4 border-b border-[#fcee0a]/30 flex items-center justify-between bg-[#0c0e12] text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-[#08090b] border border-[#fcee0a]/40 text-[#fcee0a]">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white tracking-wider uppercase">
                HOW TO PLAY & QUICK REFERENCE
              </h3>
              <p className="text-[10px] text-[#7d8799] font-bold uppercase tracking-wider">GAME RULES & REFERENCE</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#7d8799] hover:text-[#fcee0a] transition-none"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="p-2.5 bg-[#08090b] border-b border-[#fcee0a]/20 shrink-0">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setActiveTab('players')}
              className={`py-2 px-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-none ${
                activeTab === 'players'
                  ? 'hud-btn hud-btn-primary'
                  : 'hud-btn hud-btn-secondary'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>[ PLAYERS GUIDE ]</span>
            </button>
            <button
              onClick={() => setActiveTab('moderator')}
              className={`py-2 px-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-none ${
                activeTab === 'moderator'
                  ? 'hud-btn hud-btn-primary'
                  : 'hud-btn hud-btn-secondary'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>[ MODERATOR GUIDE ]</span>
            </button>
          </div>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 text-stone-300 text-xs sm:text-sm bg-[#101216]">
          {activeTab === 'players' ? (
            <>
              {/* Joining a Room */}
              <section className="space-y-2">
                <h4 className="text-xs uppercase font-bold text-white tracking-wider flex items-center gap-2 pb-1.5 border-b border-white/10">
                  <span>1. How to Join</span>
                </h4>
                <ul className="space-y-1.5 text-stone-300 list-disc list-inside text-xs leading-relaxed">
                  <li>
                    <strong className="text-white">Scan QR Code:</strong> Point camera at the moderator's screen.
                  </li>
                  <li>
                    <strong className="text-white">Join Link:</strong> Tap the direct link shared in group chat.
                  </li>
                  <li>
                    <strong className="text-white">Room Code:</strong> Type the 5-character code at the home page.
                  </li>
                </ul>
              </section>

              {/* Multi-Phone vs Two-Phone */}
              <section className="space-y-2">
                <h4 className="text-xs uppercase font-bold text-white tracking-wider flex items-center gap-2 pb-1.5 border-b border-[#fcee0a]/20">
                  <Smartphone className="w-3.5 h-3.5 text-[#fcee0a]" />
                  <span>2. Multi-Phone vs. Two-Phone Modes</span>
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="p-3 bg-[#08090b] border border-[#fcee0a]/20">
                    <p className="font-bold text-[#fcee0a] mb-1 uppercase">MULTI-PHONE MODE (DEFAULT)</p>
                    <p className="text-stone-300 leading-relaxed font-mono">
                      Every player joins on their own phone. You see your secret role and cast private daytime votes directly from your device.
                    </p>
                  </div>
                  <div className="p-3 bg-[#08090b] border border-[#fcee0a]/20">
                    <p className="font-bold text-[#fcee0a] mb-1 uppercase">TWO-PHONE MODE</p>
                    <p className="text-stone-300 leading-relaxed font-mono">
                      Only two devices are needed: Moderator phone + 1 shared player phone. Players pass the shared phone around with privacy screens to view roles and cast votes.
                    </p>
                  </div>
                </div>
              </section>

              {/* Roles Quick Reference */}
              <section className="space-y-2">
                <h4 className="text-xs uppercase font-bold text-white tracking-wider flex items-center gap-2 pb-1.5 border-b border-[#fcee0a]/20">
                  <span>3. Roles Reference</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-3 bg-[#ff003c]/10 border border-[#ff003c]/40">
                    <p className="font-bold text-[#ff003c] uppercase">MAFIA</p>
                    <p className="text-stone-300 mt-1 leading-relaxed font-mono">
                      Wake up at night to choose a victim; blend in during the day to avoid suspicion.
                    </p>
                  </div>
                  <div className="p-3 bg-[#00e5ff]/10 border border-[#00e5ff]/40">
                    <p className="font-bold text-[#00e5ff] uppercase">DETECTIVE</p>
                    <p className="text-stone-300 mt-1 leading-relaxed font-mono">
                      Investigate one player each night; the moderator confirms if they are Mafia or innocent.
                    </p>
                  </div>
                  <div className="p-3 bg-[#00ff9f]/10 border border-[#00ff9f]/40">
                    <p className="font-bold text-[#00ff9f] uppercase">DOCTOR</p>
                    <p className="text-stone-300 mt-1 leading-relaxed font-mono">
                      Protect one player each night; prevents them from being killed if targeted by the Mafia.
                    </p>
                  </div>
                  <div className="p-3 bg-[#08090b] border border-[#fcee0a]/20">
                    <p className="font-bold text-[#fcee0a] uppercase">VILLAGER</p>
                    <p className="text-stone-300 mt-1 leading-relaxed font-mono">
                      No night action. Discuss during the day and vote to eliminate suspected Mafia members.
                    </p>
                  </div>
                </div>
              </section>

              {/* Day Voting System */}
              <section className="space-y-2">
                <h4 className="text-xs uppercase font-bold text-white tracking-wider flex items-center gap-2 pb-1.5 border-b border-[#fcee0a]/20">
                  <Vote className="w-3.5 h-3.5 text-[#fcee0a]" />
                  <span>4. Day Elimination Voting</span>
                </h4>
                <ul className="space-y-1.5 text-stone-300 list-disc list-inside text-xs leading-relaxed font-mono">
                  <li>
                    <strong className="text-white">SELF-VOTING BLOCKED:</strong> Players cannot vote for themselves. You must vote for another player or abstain.
                  </li>
                  <li>
                    <strong className="text-white">LIVE TALLY:</strong> Votes update in real time on all screens.
                  </li>
                  <li>
                    <strong className="text-white">AUTOMATIC RESOLUTION:</strong> The vote completes as soon as all living players have voted.
                  </li>
                  <li>
                    <strong className="text-white">TIE-BREAKER:</strong> Ties trigger an immediate re-vote between only the tied players.
                  </li>
                </ul>
              </section>
            </>
          ) : (
            <>
              {/* Moderator Status Badges */}
              <section className="space-y-2">
                <h4 className="text-xs uppercase font-bold text-white tracking-wider pb-1.5 border-b border-[#fcee0a]/20">
                  1. Player Statuses (Night Phase)
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="p-2.5 bg-[#00ff9f]/10 border border-[#00ff9f]/30 flex items-start gap-2.5">
                    <span className="w-2 h-2 bg-[#00ff9f] mt-1 shrink-0" />
                    <div>
                      <strong className="text-[#00ff9f] uppercase">[ ALIVE ]:</strong> Default state for living players.
                    </div>
                  </div>
                  <div className="p-2.5 bg-[#ff003c]/10 border border-[#ff003c]/30 flex items-start gap-2.5">
                    <Skull className="w-3.5 h-3.5 text-[#ff003c] mt-0.5 shrink-0" />
                    <div>
                      <strong className="text-[#ff003c] uppercase">[ KILLED ]:</strong> Player eliminated during the night or by day vote.
                    </div>
                  </div>
                  <div className="p-2.5 bg-[#00ff9f]/10 border border-[#00ff9f]/30 flex items-start gap-2.5">
                    <Heart className="w-3.5 h-3.5 text-[#00ff9f] mt-0.5 shrink-0" />
                    <div>
                      <strong className="text-[#00ff9f] uppercase">[ SAVED ]:</strong> Protected by Doctor. Survives if targeted by Mafia.
                    </div>
                  </div>
                  <div className="p-2.5 bg-[#00e5ff]/10 border border-[#00e5ff]/30 flex items-start gap-2.5">
                    <Search className="w-3.5 h-3.5 text-[#00e5ff] mt-0.5 shrink-0" />
                    <div>
                      <strong className="text-[#00e5ff] uppercase">[ DETECTED (MOD ONLY) ]:</strong> Marked as Mafia by Detective. Never show or say this to the players!
                    </div>
                  </div>
                </div>
              </section>

              {/* Moderator Game Loop */}
              <section className="space-y-2">
                <h4 className="text-xs uppercase font-bold text-white tracking-wider pb-1.5 border-b border-[#fcee0a]/20">
                  2. Round Flow & Roster Management
                </h4>
                <ul className="space-y-2 text-stone-300 list-disc list-inside text-xs leading-relaxed font-mono">
                  <li>
                    <strong className="text-white">ROSTER SAFEGUARDS:</strong> Tapping remove/kick on a player prompts for confirmation to prevent accidental removals.
                  </li>
                  <li>
                    <strong className="text-white">NIGHT PHASE:</strong> Call roles in order (Mafia, Doctor, Detective). Tap player cards to assign statuses.
                  </li>
                  <li>
                    <strong className="text-white">MORNING ANNOUNCEMENT:</strong> Announce who died. Eliminated players receive an alert on their phone.
                  </li>
                  <li>
                    <strong className="text-white">START DAY VOTE:</strong> Start daytime voting when group discussion finishes.
                  </li>
                  <li>
                    <strong className="text-white">NEXT ROUND:</strong> Advance to the next night phase.
                  </li>
                </ul>
              </section>

              {/* Win Conditions & Play Again */}
              <section className="space-y-2">
                <h4 className="text-xs uppercase font-bold text-white tracking-wider flex items-center gap-2 pb-1.5 border-b border-[#fcee0a]/20">
                  <RotateCcw className="w-3.5 h-3.5 text-[#fcee0a]" />
                  <span>3. Win Conditions & Reset</span>
                </h4>
                <div className="p-3.5 bg-[#08090b] border border-[#fcee0a]/20 space-y-2 text-xs font-mono">
                  <p>
                    &bull; <strong className="text-[#00ff9f] uppercase font-bold">Town Victory:</strong> All Mafia eliminated (Mafia count reaches 0).
                  </p>
                  <p>
                    &bull; <strong className="text-[#ff003c] uppercase font-bold">Mafia Victory:</strong> Villagers reduced to 1 with Mafia remaining.
                  </p>
                  <p className="text-[#7d8799] pt-2 border-t border-[#fcee0a]/20">
                    &bull; <strong className="text-white font-bold uppercase">Play Again:</strong> Tap [ PLAY AGAIN ] to reset roles and restart at Round 1.
                  </p>
                </div>
              </section>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#fcee0a]/30 bg-[#0c0e12] flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="hud-btn hud-btn-primary w-full sm:w-auto px-6 py-2.5 text-xs"
          >
            [ CLOSE ]
          </button>
        </div>
      </div>
    </div>
  );
};
