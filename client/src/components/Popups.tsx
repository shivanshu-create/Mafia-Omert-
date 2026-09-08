import React from 'react';
import { useSocket } from '../context/SocketContext';
import { Skull, Trophy, X, Eye, RotateCcw } from 'lucide-react';

export const Popups: React.FC = () => {
  const {
    isModerator,
    selfKilledNotice,
    dismissSelfKilledNotice,
    roleRevealedNotice,
    dismissRoleRevealedNotice,
    gameOverNotice,
    dismissGameOverNotice,
    playAgain,
  } = useSocket();

  const handlePlayAgain = async () => {
    const result = await playAgain();
    if (!result.success) {
      alert(result.error || 'Failed to restart game');
    }
  };

  return (
    <>
      {/* 1. Self Killed Modal (Target player device only) */}
      {selfKilledNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75">
          <div className="relative w-full max-w-sm max-h-[90vh] overflow-y-auto bg-white border-2 border-black rounded-none p-5 sm:p-6 shadow-none text-center">
            <div className="w-14 h-14 rounded-none bg-[#800000] border-2 border-black flex items-center justify-center text-white mx-auto mb-3">
              <Skull className="w-8 h-8" />
            </div>

            <h3 className="font-mono font-black text-xl text-[#800000] tracking-wider mb-2 uppercase">
              YOU HAVE BEEN KILLED
            </h3>

            <p className="text-xs text-stone-700 mb-3 leading-relaxed font-mono">
              {selfKilledNotice}
            </p>

            <div className="p-2.5 rounded-none bg-[#fff3cd] border-2 border-black text-[11px] text-[#856404] mb-5 font-mono font-bold">
              ⚠️ Respect the Omertà code of silence: do not reveal private info to living players.
            </div>

            <button
              onClick={dismissSelfKilledNotice}
              className="retro-btn-secondary w-full py-2.5 px-4 text-xs font-mono font-bold uppercase tracking-wider"
            >
              I Understand (Spectate)
            </button>
          </div>
        </div>
      )}

      {/* 2. Role Revealed Modal (Broadcast to all players upon death) */}
      {roleRevealedNotice && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/75">
          <div className="relative w-full max-w-sm max-h-[90vh] overflow-y-auto bg-white border-2 border-black rounded-none p-5 sm:p-6 shadow-none text-center">
            <button
              onClick={dismissRoleRevealedNotice}
              className="absolute top-3 right-3 p-1 rounded-none text-black hover:bg-[#800000] hover:text-white border border-black"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 rounded-none bg-[#efefef] border-2 border-black flex items-center justify-center text-black mx-auto mb-2">
              <Eye className="w-6 h-6 text-[#800000]" />
            </div>

            <div className="text-[10px] uppercase font-mono tracking-widest text-stone-600 mb-1 font-bold">
              Casualty Report
            </div>

            <h3 className="font-mono font-black text-lg text-black mb-3 uppercase">
              {roleRevealedNotice.playerName} Has Fallen
            </h3>

            <div className="py-2 px-4 rounded-none bg-[#f4f4f4] border-2 border-black inline-block mb-4">
              <div className="text-[10px] uppercase font-mono text-stone-600 font-bold">Revealed Secret Role</div>
              <div
                className={`font-mono text-base font-black uppercase tracking-wider ${
                  roleRevealedNotice.role === 'Mafia'
                    ? 'text-[#800000]'
                    : roleRevealedNotice.role === 'Detective'
                    ? 'text-[#003399]'
                    : roleRevealedNotice.role === 'Doctor'
                    ? 'text-[#1e824c]'
                    : 'text-black'
                }`}
              >
                {roleRevealedNotice.role || 'Villager'}
              </div>
            </div>

            <button
              onClick={dismissRoleRevealedNotice}
              className="retro-btn-primary w-full py-2.5 px-4 text-xs font-mono font-bold tracking-wider uppercase"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* 3. Game Over Modal (Broadcast to all when win condition met) */}
      {gameOverNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75">
          <div className="relative w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-none p-5 sm:p-6 shadow-none text-center border-2 border-black bg-white">
            <div
              className={`w-14 h-14 rounded-none border-2 border-black flex items-center justify-center mx-auto mb-3 ${
                gameOverNotice.winner === 'Town'
                  ? 'bg-[#eafaf1] text-[#1e824c]'
                  : 'bg-[#fbebee] text-[#800000]'
              }`}
            >
              <Trophy className="w-8 h-8" />
            </div>

            <div className="text-[10px] uppercase font-mono tracking-widest text-stone-600 mb-1 font-bold">
              Game Over
            </div>

            <h3
              className={`font-mono font-black text-2xl tracking-wider mb-2 uppercase ${
                gameOverNotice.winner === 'Town' ? 'text-[#1e824c]' : 'text-[#800000]'
              }`}
            >
              {gameOverNotice.winner.toUpperCase()} WINS
            </h3>

            <p className="text-xs text-stone-700 mb-4 leading-relaxed font-mono">
              {gameOverNotice.reason}
            </p>

            <div className="space-y-2">
              {isModerator ? (
                <button
                  onClick={handlePlayAgain}
                  className="retro-btn-primary w-full py-2.5 px-4 text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Play Again (Reset Game)
                </button>
              ) : (
                <div className="p-2.5 rounded-none bg-[#f4f4f4] border-2 border-black text-[11px] text-stone-700 font-mono font-bold">
                  Waiting for moderator to start next game...
                </div>
              )}

              <button
                onClick={dismissGameOverNotice}
                className="retro-btn-secondary w-full py-2 px-4 text-[11px] font-mono font-bold uppercase tracking-wider"
              >
                Dismiss Notice
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
