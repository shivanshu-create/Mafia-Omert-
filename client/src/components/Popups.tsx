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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 font-mono">
          <div className="relative w-full max-w-sm max-h-[90vh] overflow-y-auto bg-[#101216] border border-[#ff003c] hud-cut shadow-[0_0_35px_rgba(255,0,60,0.25)] p-6 text-center animate-hud-modal-snap">
            {/* Top Hazard Stripe */}
            <div className="h-1.5 w-full bg-[#ff003c] hud-hazard-red mb-4" />

            <div className="w-14 h-14 bg-[#ff003c]/15 border border-[#ff003c] flex items-center justify-center text-[#ff003c] mx-auto mb-3">
              <Skull className="w-7 h-7 text-[#ff003c]" />
            </div>

            <h3 className="font-bold text-lg text-[#ff003c] tracking-wider mb-2 uppercase">
              [ YOU HAVE BEEN KILLED ]
            </h3>

            <p className="text-xs text-stone-300 mb-4 leading-relaxed uppercase">
              {selfKilledNotice}
            </p>

            <div className="p-3 bg-[#ff003c]/10 border border-[#ff003c]/40 text-[10px] text-[#ff003c] mb-5 leading-relaxed font-bold uppercase">
              You have been eliminated. Please do not speak or reveal game details to living players.
            </div>

            <button
              onClick={dismissSelfKilledNotice}
              className="hud-btn hud-btn-secondary w-full py-2.5 text-xs"
            >
              [ ENTER SPECTATOR MODE ]
            </button>
          </div>
        </div>
      )}

      {/* 2. Role Revealed Modal (Broadcast to all players upon death) */}
      {roleRevealedNotice && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/85 font-mono">
          <div className="relative w-full max-w-sm max-h-[90vh] overflow-y-auto bg-[#101216] border border-[#fcee0a] hud-cut shadow-[0_0_35px_rgba(0,0,0,0.95)] p-6 text-center animate-hud-modal-snap">
            {/* Top Hazard Stripe */}
            <div className="h-1.5 w-full bg-[#fcee0a] hud-hazard-yellow mb-4" />

            <button
              onClick={dismissRoleRevealedNotice}
              className="absolute top-3 right-3 p-1.5 text-[#7d8799] hover:text-[#fcee0a]"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 bg-[#08090b] border border-[#fcee0a]/40 flex items-center justify-center text-[#fcee0a] mx-auto mb-3">
              <Eye className="w-6 h-6" />
            </div>

            <div className="text-[10px] uppercase tracking-widest text-[#7d8799] mb-1 font-bold">
              PLAYER ELIMINATED
            </div>

            <h3 className="font-bold text-base text-white mb-4 uppercase tracking-wider">
              {roleRevealedNotice.playerName} HAS BEEN KILLED
            </h3>

            <div className="py-2.5 px-5 bg-[#08090b] border border-[#fcee0a]/30 inline-block mb-5">
              <div className="text-[10px] uppercase text-[#7d8799] font-bold tracking-wider">REVEALED ROLE:</div>
              <div
                className={`text-base font-bold tracking-widest uppercase mt-0.5 ${
                  roleRevealedNotice.role === 'Mafia'
                    ? 'text-[#ff003c]'
                    : roleRevealedNotice.role === 'Detective'
                    ? 'text-[#00e5ff]'
                    : roleRevealedNotice.role === 'Doctor'
                    ? 'text-[#00ff9f]'
                    : 'text-[#fcee0a]'
                }`}
              >
                [ {roleRevealedNotice.role?.toUpperCase() || 'VILLAGER'} ]
              </div>
            </div>

            <button
              onClick={dismissRoleRevealedNotice}
              className="hud-btn hud-btn-primary w-full py-2.5 text-xs"
            >
              [ CONTINUE ]
            </button>
          </div>
        </div>
      )}

      {/* 3. Game Over Modal (Broadcast to all when win condition met) */}
      {gameOverNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 font-mono">
          <div
            className={`relative w-full max-w-sm max-h-[90vh] overflow-y-auto bg-[#101216] border-2 hud-cut shadow-[0_0_40px_rgba(0,0,0,0.95)] p-6 text-center animate-hud-modal-snap ${
              gameOverNotice.winner === 'Town' ? 'border-[#00ff9f]' : 'border-[#ff003c]'
            }`}
          >
            {/* Top Hazard Stripe */}
            <div
              className={`h-1.5 w-full mb-4 ${
                gameOverNotice.winner === 'Town' ? 'bg-[#00ff9f]' : 'bg-[#ff003c] hud-hazard-red'
              }`}
            />

            <div
              className={`w-14 h-14 border flex items-center justify-center mx-auto mb-3 ${
                gameOverNotice.winner === 'Town'
                  ? 'bg-[#00ff9f]/15 border-[#00ff9f] text-[#00ff9f]'
                  : 'bg-[#ff003c]/15 border-[#ff003c] text-[#ff003c]'
              }`}
            >
              <Trophy className="w-7 h-7" />
            </div>

            <div className="text-[10px] uppercase tracking-widest text-[#7d8799] mb-1 font-bold">
              GAME OVER
            </div>

            <h3
              className={`font-bold text-2xl tracking-wider mb-2 uppercase ${
                gameOverNotice.winner === 'Town' ? 'text-[#00ff9f]' : 'text-[#ff003c]'
              }`}
            >
              [ {gameOverNotice.winner.toUpperCase()} WINS ]
            </h3>

            <p className="text-xs text-stone-300 mb-5 leading-relaxed uppercase">
              {gameOverNotice.reason}
            </p>

            <div className="space-y-2.5">
              {isModerator ? (
                <button
                  onClick={handlePlayAgain}
                  className="hud-btn hud-btn-primary w-full py-2.5 text-xs flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>[ PLAY AGAIN (RESET) ]</span>
                </button>
              ) : (
                <div className="p-3 bg-[#08090b] border border-[#fcee0a]/20 text-[10px] text-[#7d8799] uppercase font-bold tracking-wider">
                  Waiting for moderator to reset game...
                </div>
              )}

              <button
                onClick={dismissGameOverNotice}
                className="hud-btn hud-btn-secondary w-full py-2 text-xs"
              >
                [ DISMISS ]
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
