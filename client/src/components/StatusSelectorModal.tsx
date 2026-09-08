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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75">
      <div className="relative w-full max-w-sm bg-white border-2 border-black rounded-none p-5 shadow-none">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded-none text-black hover:bg-[#800000] hover:text-white border border-black"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="mb-3">
          <div className="text-[10px] uppercase font-mono tracking-widest text-stone-600 mb-0.5 font-bold">
            Moderator Status Control
          </div>
          <h3 className="font-mono font-black text-xl text-black uppercase">
            {player.name}
          </h3>
          {player.role && (
            <span className="text-[11px] font-mono uppercase font-bold text-[#800000] tracking-wider">
              Role: {player.role}
            </span>
          )}
        </div>

        <p className="text-xs text-stone-600 mb-4 font-mono">
          Select the current round status for this player:
        </p>

        {/* 4 Status Options */}
        <div className="space-y-2">
          {/* 1. Alive */}
          <button
            onClick={() => handleSelect('Alive')}
            className={`w-full min-h-[48px] flex items-center justify-between p-2.5 rounded-none border-2 text-left select-none ${
              currentStatus === 'Alive'
                ? 'bg-[#eafaf1] border-black ring-2 ring-[#1e824c]'
                : 'bg-white border-black hover:bg-[#f9f9f9]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-none bg-white text-[#1e824c] border border-black shrink-0">
                <Heart className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-mono font-black uppercase tracking-wider text-black">Alive</div>
                <div className="text-[11px] text-stone-600 font-mono">Normal active player</div>
              </div>
            </div>
            {currentStatus === 'Alive' && <span className="text-[10px] font-mono text-white font-black px-2 py-0.5 rounded-none bg-[#1e824c] border border-black uppercase">Active</span>}
          </button>

          {/* 2. Killed */}
          <button
            onClick={() => handleSelect('Killed')}
            className={`w-full min-h-[48px] flex items-center justify-between p-2.5 rounded-none border-2 text-left select-none ${
              currentStatus === 'Killed'
                ? 'bg-[#d8d8d8] border-black ring-2 ring-black'
                : 'bg-white border-black hover:bg-[#f9f9f9]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-none bg-black text-white border border-black shrink-0">
                <Skull className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-mono font-black uppercase tracking-wider text-black">Killed</div>
                <div className="text-[11px] text-stone-600 font-mono">Eliminated &bull; Broadcasts reveal</div>
              </div>
            </div>
            {currentStatus === 'Killed' && <span className="text-[10px] font-mono text-white font-black px-2 py-0.5 rounded-none bg-black border border-black uppercase">Dead</span>}
          </button>

          {/* 3. Saved */}
          <button
            onClick={() => handleSelect('Saved')}
            className={`w-full min-h-[48px] flex items-center justify-between p-2.5 rounded-none border-2 text-left select-none ${
              currentStatus === 'Saved'
                ? 'bg-[#ecfdf5] border-black ring-2 ring-[#065f46]'
                : 'bg-white border-black hover:bg-[#f9f9f9]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-none bg-[#065f46] text-white border border-black shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-mono font-black uppercase tracking-wider text-[#065f46]">Saved</div>
                <div className="text-[11px] text-stone-600 font-mono">Protected by Doctor (Alive)</div>
              </div>
            </div>
            {currentStatus === 'Saved' && <span className="text-[10px] font-mono text-white font-black px-2 py-0.5 rounded-none bg-[#065f46] border border-black uppercase">Saved</span>}
          </button>

          {/* 4. Detected */}
          <button
            onClick={() => handleSelect('Detected')}
            className={`w-full min-h-[48px] flex items-center justify-between p-2.5 rounded-none border-2 text-left select-none ${
              currentStatus === 'Detected'
                ? 'bg-[#eef2ff] border-black ring-2 ring-[#1e40af]'
                : 'bg-white border-black hover:bg-[#f9f9f9]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-none bg-[#1e40af] text-white border border-black shrink-0">
                <Search className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-mono font-black uppercase tracking-wider text-[#1e40af]">Detected</div>
                <div className="text-[11px] text-stone-600 font-mono">Investigated by Detective (Alive)</div>
              </div>
            </div>
            {currentStatus === 'Detected' && <span className="text-[10px] font-mono text-white font-black px-2 py-0.5 rounded-none bg-[#1e40af] border border-black uppercase">Detected</span>}
          </button>
        </div>
      </div>
    </div>
  );
};
