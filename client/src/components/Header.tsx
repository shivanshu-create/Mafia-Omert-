import React, { useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { WifiOff, HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { HowToPlayModal } from './HowToPlayModal';

export const Header: React.FC = () => {
  const { isConnected, isReconnecting, roomState, isModerator } = useSocket();
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  return (
    <>
      <header className="border-b-2 border-black bg-[#800000] text-white sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 h-14 flex items-center justify-between gap-2">
          <Link to="/" className="flex items-center gap-2.5 group min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-white text-black border-2 border-black flex items-center justify-center text-base sm:text-lg shrink-0 shadow-[1px_1px_0px_#000000]">
              🎩
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="font-sans font-black text-sm sm:text-base text-white tracking-wider uppercase truncate">
                  MAFIA OMERTÀ
                </h1>
                {isModerator && (
                  <span className="text-[9px] sm:text-[10px] font-mono uppercase font-bold tracking-wider bg-black text-amber-300 border border-black px-1.5 py-0.5 shrink-0">
                    MOD
                  </span>
                )}
              </div>
              <p className="text-[9px] sm:text-[10px] text-stone-200 uppercase tracking-widest truncate">
                The Code of Silence
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2 shrink-0">
            {/* How to play / Guide button */}
            <button
              onClick={() => setIsHelpOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1 bg-[#f0ede5] hover:bg-white text-black border-2 border-black text-[11px] font-bold uppercase transition-colors shadow-[1px_1px_0px_#000000] active:translate-y-px"
              title="How to Play & Quick Reference"
            >
              <HelpCircle className="w-3.5 h-3.5 text-[#800000]" />
              <span className="hidden xs:inline">Guide</span>
            </button>

            {roomState && (
              <div className="flex items-center gap-1 px-2 py-1 bg-black border-2 border-white text-[11px] font-mono text-white">
                <span className="text-stone-300 text-[10px] hidden xs:inline">ROOM:</span>
                <span className="font-bold text-amber-300 tracking-wider">{roomState.code}</span>
              </div>
            )}

            <div
              className={`flex items-center gap-1.5 text-[11px] px-2 py-1 border-2 border-black font-mono font-bold uppercase transition-all shadow-[1px_1px_0px_#000000] ${
                isReconnecting
                  ? 'bg-amber-200 text-amber-950'
                  : isConnected
                  ? 'bg-emerald-200 text-emerald-950'
                  : 'bg-rose-200 text-rose-950'
              }`}
            >
              {isReconnecting ? (
                <>
                  <span className="w-2 h-2 bg-amber-600 animate-ping" />
                  <span className="text-[10px]">Reconnecting</span>
                </>
              ) : isConnected ? (
                <>
                  <span className="w-2 h-2 bg-emerald-600" />
                  <span className="text-[10px] hidden sm:inline">Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 text-rose-700" />
                  <span className="text-[10px] hidden sm:inline">Offline</span>
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
