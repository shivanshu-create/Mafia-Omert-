import React, { useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { WifiOff, HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { HowToPlayModal } from './HowToPlayModal';
import logoImg from '../assets/logo.png';

export const Header: React.FC = () => {
  const { isConnected, isReconnecting, roomState, isModerator } = useSocket();
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  return (
    <>
      <header className="border-b border-[#fcee0a]/30 bg-[#0c0e12] text-[#e0e2ec] sticky top-0 z-40 transition-colors">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-3 group min-w-0">
            <div className="border border-[#fcee0a]/40 bg-[#101216] p-0.5 shrink-0">
              <img
                src={logoImg}
                alt="Mafia Omertà"
                className="w-8 h-8 sm:w-9 sm:h-9 object-contain"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-mono font-bold text-sm sm:text-base text-white tracking-wider uppercase truncate group-hover:text-[#fcee0a] transition-colors">
                  MAFIA OMERTÀ
                </h1>
                {isModerator && (
                  <span className="text-[10px] font-mono uppercase font-bold tracking-wider bg-[#fcee0a]/15 text-[#fcee0a] border border-[#fcee0a]/50 px-2 py-0.5 shrink-0">
                    [MOD]
                  </span>
                )}
              </div>
              <p className="text-[10px] font-mono text-[#7d8799] uppercase tracking-widest truncate">
                The Code of Silence
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2 shrink-0">
            {/* How to play / Guide button */}
            <button
              onClick={() => setIsHelpOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1 bg-[#14171f] hover:bg-[#fcee0a] hover:text-black text-[#e0e2ec] border border-[#fcee0a]/30 text-xs font-mono font-bold uppercase transition-colors active:scale-95"
              title="How to Play & Quick Reference"
            >
              <HelpCircle className="w-3.5 h-3.5 text-[#fcee0a]" />
              <span className="hidden xs:inline">[ ? HOW TO PLAY ]</span>
            </button>

            {roomState && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#101216] text-xs font-mono text-white border border-[#fcee0a]/40">
                <span className="text-[#7d8799] text-[10px] hidden xs:inline">ROOM:</span>
                <span className="font-bold text-[#fcee0a] tracking-widest">{roomState.code}</span>
              </div>
            )}

            <div
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1 font-mono font-bold uppercase transition-all border ${
                isReconnecting
                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/40'
                  : isConnected
                  ? 'bg-[#00ff9f]/10 text-[#00ff9f] border-[#00ff9f]/40'
                  : 'bg-[#ff003c]/15 text-[#ff003c] border-[#ff003c]/50'
              }`}
            >
              {isReconnecting ? (
                <>
                  <span className="w-1.5 h-1.5 bg-amber-400 animate-ping" />
                  <span className="text-[11px]">[SYNCING]</span>
                </>
              ) : isConnected ? (
                <>
                  <span className="w-1.5 h-1.5 bg-[#00ff9f]" />
                  <span className="text-[11px] hidden sm:inline">[ONLINE]</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 text-[#ff003c]" />
                  <span className="text-[11px] hidden sm:inline">[OFFLINE]</span>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* How to Play Modal */}
      <HowToPlayModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        defaultTab={isModerator ? 'moderator' : 'players'}
      />
    </>
  );
};
