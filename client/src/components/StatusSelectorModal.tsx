import React from 'react';
import { PlayerStatus, PublicPlayer } from '../types';
import { Heart, Skull, Shield, Search, X } from 'lucide-react';

interface StatusSelectorModalProps {
  player: PublicPlayer | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectStatus: (playerId: string, status: PlayerStatus) => void;
}

export const StatusSelectorModal: React.FC<StatusSelectorModalProps> = ({
  player,
  isOpen,
  onClose,
  onSelectStatus,
}) => {
  if (!isOpen || !player) return null;

  const handleSelect = (status: PlayerStatus) => {
    onSelectStatus(player.id, status);
    onClose();
  };

  const currentStatus = player.status || (player.isAlive ? 'Alive' : 'Killed');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 font-mono">
      <div className="relative w-full max-w-sm bg-[#101216] hud-cut border border-[#fcee0a] p-6 shadow-[0_0_35px_rgba(0,0,0,0.95)] animate-hud-modal-snap">
        {/* Top Hazard Stripe */}
        <div className="h-1.5 w-full bg-[#fcee0a] hud-hazard-yellow mb-4" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 p-1.5 text-[#7d8799] hover:text-[#fcee0a]"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="mb-4">
          <div className="text-[10px] uppercase tracking-wider text-[#7d8799] mb-1 font-bold">
            SET PLAYER STATUS
          </div>
          <h3 className="font-bold text-xl text-white uppercase tracking-wider">
            {player.name}
          </h3>
          {player.role && (
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-[#08090b] border border-[#fcee0a]/30 text-[#fcee0a] inline-block mt-1.5">
              ROLE: {player.role}
            </span>
          )}
        </div>

        <p className="text-[10px] text-[#7d8799] uppercase font-bold mb-4 tracking-wider">
          SELECT STATUS FOR THIS ROUND:
        </p>

        {/* 4 Status Options */}
        <div className="space-y-2.5">
          {/* 1. Alive */}
          <button
            onClick={() => handleSelect('Alive')}
            className={`w-full min-h-[48px] flex items-center justify-between p-3 hud-cut-sm border text-left select-none font-mono ${
              currentStatus === 'Alive'
                ? 'bg-[#00ff9f]/10 border-2 border-[#00ff9f] shadow-[0_0_10px_rgba(0,255,159,0.2)]'
                : 'bg-[#08090b] border-[#fcee0a]/20 hover:border-[#fcee0a]/50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-[#00ff9f]/20 border border-[#00ff9f] text-[#00ff9f] shrink-0">
                <Heart className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white uppercase tracking-wider">[ ALIVE ]</div>
                <div className="text-[10px] text-[#7d8799] uppercase font-bold">Active in game</div>
              </div>
            </div>
            {currentStatus === 'Alive' && (
              <span className="text-[10px] text-black font-bold px-2 py-0.5 bg-[#00ff9f] uppercase tracking-wider">
                [ ACTIVE ]
              </span>
            )}
          </button>

          {/* 2. Killed */}
          <button
            onClick={() => handleSelect('Killed')}
            className={`w-full min-h-[48px] flex items-center justify-between p-3 hud-cut-sm border text-left select-none font-mono ${
              currentStatus === 'Killed'
                ? 'bg-[#ff003c]/10 border-2 border-[#ff003c] shadow-[0_0_10px_rgba(255,0,60,0.2)]'
                : 'bg-[#08090b] border-[#fcee0a]/20 hover:border-[#fcee0a]/50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-[#ff003c]/20 border border-[#ff003c] text-[#ff003c] shrink-0">
                <Skull className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white uppercase tracking-wider">[ KILLED ]</div>
                <div className="text-[10px] text-[#7d8799] uppercase font-bold">Eliminated &bull; Reveals role</div>
              </div>
            </div>
            {currentStatus === 'Killed' && (
              <span className="text-[10px] text-white font-bold px-2 py-0.5 bg-[#ff003c] uppercase tracking-wider">
                [ DEAD ]
              </span>
            )}
          </button>

          {/* 3. Saved */}
          <button
            onClick={() => handleSelect('Saved')}
            className={`w-full min-h-[48px] flex items-center justify-between p-3 hud-cut-sm border text-left select-none font-mono ${
              currentStatus === 'Saved'
                ? 'bg-[#00ff9f]/10 border-2 border-[#00ff9f] shadow-[0_0_10px_rgba(0,255,159,0.2)]'
                : 'bg-[#08090b] border-[#fcee0a]/20 hover:border-[#fcee0a]/50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-[#00ff9f]/20 border border-[#00ff9f] text-[#00ff9f] shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-[#00ff9f] uppercase tracking-wider">[ SAVED ]</div>
                <div className="text-[10px] text-[#7d8799] uppercase font-bold">Protected by Doctor</div>
              </div>
            </div>
            {currentStatus === 'Saved' && (
              <span className="text-[10px] text-black font-bold px-2 py-0.5 bg-[#00ff9f] uppercase tracking-wider">
                [ SAVED ]
              </span>
            )}
          </button>

          {/* 4. Detected */}
          <button
            onClick={() => handleSelect('Detected')}
            className={`w-full min-h-[48px] flex items-center justify-between p-3 hud-cut-sm border text-left select-none font-mono ${
              currentStatus === 'Detected'
                ? 'bg-[#00e5ff]/10 border-2 border-[#00e5ff] shadow-[0_0_10px_rgba(0,229,255,0.2)]'
                : 'bg-[#08090b] border-[#fcee0a]/20 hover:border-[#fcee0a]/50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-[#00e5ff]/20 border border-[#00e5ff] text-[#00e5ff] shrink-0">
                <Search className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-[#00e5ff] uppercase tracking-wider">[ DETECTED ]</div>
                <div className="text-[10px] text-[#7d8799] uppercase font-bold">Investigated by Detective</div>
              </div>
            </div>
            {currentStatus === 'Detected' && (
              <span className="text-[10px] text-black font-bold px-2 py-0.5 bg-[#00e5ff] uppercase tracking-wider">
                [ DETECTED ]
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
