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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75">
      <div className="w-full max-w-lg bg-white border-2 border-black rounded-none shadow-none overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-3.5 sm:p-4 border-b-2 border-black flex items-center justify-between bg-[#800000] text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-none bg-black border border-white text-white">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-mono font-black text-sm sm:text-base text-white tracking-wide uppercase">
                HOW TO PLAY & QUICK REFERENCE
              </h3>
              <p className="text-[11px] text-stone-200 font-mono">Mafia Omertà Field Manual</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-none text-white hover:bg-black border border-white transition-none"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="p-2 bg-[#f4f4f4] border-b-2 border-black shrink-0">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setActiveTab('players')}
              className={`py-1.5 px-3 rounded-none text-xs font-mono font-black uppercase tracking-wider border-2 border-black flex items-center justify-center gap-1.5 ${
                activeTab === 'players'
                  ? 'bg-[#800000] text-white'
                  : 'bg-white text-black hover:bg-[#efefef]'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Players Guide</span>
            </button>
            <button
              onClick={() => setActiveTab('moderator')}
              className={`py-1.5 px-3 rounded-none text-xs font-mono font-black uppercase tracking-wider border-2 border-black flex items-center justify-center gap-1.5 ${
                activeTab === 'moderator'
                  ? 'bg-[#800000] text-white'
                  : 'bg-white text-black hover:bg-[#efefef]'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Moderator Quick-Ref</span>
            </button>
          </div>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-black text-xs sm:text-sm bg-white font-sans">
          {activeTab === 'players' ? (
            <>
              {/* Joining a Room */}
              <section className="space-y-2">
                <h4 className="text-xs font-mono uppercase font-black text-[#800000] tracking-wider flex items-center gap-1.5 pb-1 border-b border-black">
                  <span>1. How to Join</span>
                </h4>
                <ul className="space-y-1.5 text-stone-800 list-disc list-inside text-xs leading-relaxed font-mono">
                  <li>
                    <strong className="text-black">Scan QR Code:</strong> Point camera at the moderator's screen.
                  </li>
                  <li>
                    <strong className="text-black">Join Link:</strong> Tap the direct link shared in group chat.
                  </li>
                  <li>
                    <strong className="text-black">Room Code:</strong> Type the 5-character code at the home page.
                  </li>
                </ul>
              </section>

              {/* Multi-Phone vs Two-Phone */}
              <section className="space-y-2">
                <h4 className="text-xs font-mono uppercase font-black text-[#800000] tracking-wider flex items-center gap-1.5 pb-1 border-b border-black">
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>2. Multi-Phone vs. Two-Phone Mode</span>
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded-none bg-[#fbfbfb] border border-black">
                    <p className="font-mono font-black text-black mb-0.5 uppercase text-xs">👥 Multi-Phone Mode (Default)</p>
                    <p className="text-stone-700">
                      Every player has their own device. You see your own confidential role and cast public votes directly from your screen.
                    </p>
                  </div>
                  <div className="p-2.5 rounded-none bg-[#fbfbfb] border border-black">
                    <p className="font-mono font-black text-black mb-0.5 uppercase text-xs">📱 Two-Phone Mode</p>
                    <p className="text-stone-700">
                      Only 2 devices connect: the Moderator phone + 1 shared player phone. Players physically pass the shared phone around with privacy curtains to check roles and vote.
                    </p>
                  </div>
                </div>
              </section>

              {/* Roles Quick Reference */}
              <section className="space-y-2">
                <h4 className="text-xs font-mono uppercase font-black text-[#800000] tracking-wider flex items-center gap-1.5 pb-1 border-b border-black">
                  <span>3. Roles Quick Reference</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-none bg-[#fbebee] border border-black">
                    <p className="font-mono font-black text-[#800000]">🩸 Mafia</p>
                    <p className="text-stone-700 mt-0.5">
                      Conspire silently at night to eliminate villagers; blend in and deceive the town during day discussions.
                    </p>
                  </div>
                  <div className="p-2.5 rounded-none bg-[#eef4ff] border border-black">
                    <p className="font-mono font-black text-[#003399]">🔍 Detective</p>
                    <p className="text-stone-700 mt-0.5">
                      Investigate one suspect each night; the moderator silently indicates if they are Mafia.
                    </p>
                  </div>
                  <div className="p-2.5 rounded-none bg-[#eafaf1] border border-black">
                    <p className="font-mono font-black text-[#1e824c]">💉 Doctor</p>
                    <p className="text-stone-700 mt-0.5">
                      Protect one player each night (can be yourself); if targeted by Mafia, they survive.
                    </p>
                  </div>
                  <div className="p-2.5 rounded-none bg-white border border-black">
                    <p className="font-mono font-black text-black">👤 Villager</p>
                    <p className="text-stone-700 mt-0.5">
                      No night action. Deduce who is lying through daytime debate and vote them out.
                    </p>
                  </div>
                </div>
              </section>

              {/* Day Voting System */}
              <section className="space-y-2">
                <h4 className="text-xs font-mono uppercase font-black text-[#800000] tracking-wider flex items-center gap-1.5 pb-1 border-b border-black">
                  <Vote className="w-3.5 h-3.5" />
                  <span>4. Day-Phase Voting</span>
                </h4>
                <ul className="space-y-1.5 text-stone-800 list-disc list-inside text-xs leading-relaxed font-mono">
                  <li>
                    <strong className="text-black">Live & Public:</strong> Votes update in real time. Everyone sees who votes for whom.
                  </li>
                  <li>
                    <strong className="text-black">Auto-Resolution:</strong> Closes automatically once all alive players have voted. The highest vote count is eliminated.
                  </li>
                  <li>
                    <strong className="text-black">Tie-Breaker:</strong> If votes tie, an immediate re-vote starts strictly between the tied players. Tied players also vote!
                  </li>
                </ul>
              </section>
            </>
          ) : (
            <>
              {/* Moderator Status Badges */}
              <section className="space-y-2">
                <h4 className="text-xs font-mono uppercase font-black text-[#800000] tracking-wider pb-1 border-b border-black">
                  1. Player Status Toggles (Night Phase)
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="p-2 rounded-none bg-[#eafaf1] border border-black flex items-start gap-2">
                    <span className="w-2.5 h-2.5 rounded-none bg-[#1e824c] mt-1 shrink-0 border border-black" />
                    <div>
                      <strong className="text-black font-mono">ALIVE:</strong> Default active player status.
                    </div>
                  </div>
                  <div className="p-2 rounded-none bg-[#d8d8d8] border border-black flex items-start gap-2">
                    <Skull className="w-3.5 h-3.5 text-black mt-0.5 shrink-0" />
                    <div>
                      <strong className="text-black font-mono">KILLED:</strong> Player targeted by Mafia without Doctor protection, or eliminated in the day vote.
                    </div>
                  </div>
                  <div className="p-2 rounded-none bg-[#ecfdf5] border border-black flex items-start gap-2">
                    <Heart className="w-3.5 h-3.5 text-[#065f46] mt-0.5 shrink-0" />
                    <div>
                      <strong className="text-[#065f46] font-mono">SAVED:</strong> Player protected by Doctor this night. Negates any Mafia kill attempt this round.
                    </div>
                  </div>
                  <div className="p-2 rounded-none bg-[#eef2ff] border border-black flex items-start gap-2">
                    <Search className="w-3.5 h-3.5 text-[#1e40af] mt-0.5 shrink-0" />
                    <div>
                      <strong className="text-[#1e40af] font-mono">DETECTED (Mod Eyes Only):</strong> Flag that Detective investigated this player as Mafia. <em>Never revealed to player!</em>
                    </div>
                  </div>
                </div>
              </section>

              {/* Moderator Game Loop */}
              <section className="space-y-2">
                <h4 className="text-xs font-mono uppercase font-black text-[#800000] tracking-wider pb-1 border-b border-black">
                  2. Night & Day Flow
                </h4>
                <ul className="space-y-2 text-stone-800 list-disc list-inside text-xs leading-relaxed font-mono">
                  <li>
                    <strong className="text-black">Night Phase:</strong> Call roles in order (Mafia, Doctor, Detective). Tap player cards to record Saved/Killed/Detected.
                  </li>
                  <li>
                    <strong className="text-black">Morning Announcement:</strong> Announce night casualties to the room. Dead players automatically see a confidential banner.
                  </li>
                  <li>
                    <strong className="text-black">Start Day Vote:</strong> Once daytime accusations conclude, tap <span className="text-[#800000] font-black">"Start Day Vote"</span>.
                  </li>
                  <li>
                    <strong className="text-black">Advance Round:</strong> Tap <span className="text-black font-black">"Advance to Round X"</span> to archive casualties and begin next night.
                  </li>
                </ul>
              </section>

              {/* Win Conditions & Play Again */}
              <section className="space-y-2">
                <h4 className="text-xs font-mono uppercase font-black text-[#800000] tracking-wider flex items-center gap-1.5 pb-1 border-b border-black">
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>3. Win Conditions & Play Again</span>
                </h4>
                <div className="p-3 rounded-none bg-[#f4f4f4] border border-black space-y-2 text-xs">
                  <p>
                    • <strong className="text-[#1e824c] font-mono font-black">Town Wins:</strong> All Mafia members are eliminated (Mafia count reaches 0).
                  </p>
                  <p>
                    • <strong className="text-[#800000] font-mono font-black">Mafia Wins:</strong> Town alive count drops to 1 with Mafia remaining.
                  </p>
                  <p className="text-stone-700 pt-1 border-t border-black font-mono">
                    • <strong className="text-black font-black">Play Again:</strong> Tapping "Play Again" resets roles, revives everyone, clears history, and resets to Round 1 without disconnecting.
                  </p>
                </div>
              </section>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 border-t-2 border-black bg-[#f4f4f4] flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="retro-btn-primary w-full sm:w-auto px-5 py-2 text-xs font-mono font-black uppercase tracking-wider"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
