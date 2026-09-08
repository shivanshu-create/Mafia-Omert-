import React, { useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { Eye, Heart, User, Check, Smartphone, Lock } from 'lucide-react';
import { Role } from '../types';

export const SharedRoleReveal: React.FC = () => {
  const { sharedRoleRevealNotice, dismissSharedRoleReveal } = useSocket();
  const [isRevealed, setIsRevealed] = useState(false);

  if (!sharedRoleRevealNotice) return null;

  const { playerName, role } = sharedRoleRevealNotice;

  const handleConfirmAndPass = () => {
    setIsRevealed(false);
    dismissSharedRoleReveal();
  };

  const getRoleConfig = (r: Role | null) => {
    switch (r) {
      case 'Mafia':
        return {
          title: 'MAFIA',
          subtitle: 'The Mafia',
          description: 'Eliminate villagers during the night and blend into daytime discussions without getting caught.',
          icon: <SkullIcon className="w-10 h-10 text-[#ff003c]" />,
          borderColor: 'border-[#ff003c]',
          bgColor: 'bg-[#ff003c]/10',
          textColor: 'text-[#ff003c]',
        };
      case 'Detective':
        return {
          title: 'DETECTIVE',
          subtitle: 'The Detective',
          description: 'Investigate one player each night to learn if they are Mafia or innocent.',
          icon: <Eye className="w-10 h-10 text-[#00e5ff]" />,
          borderColor: 'border-[#00e5ff]',
          bgColor: 'bg-[#00e5ff]/10',
          textColor: 'text-[#00e5ff]',
        };
      case 'Doctor':
        return {
          title: 'DOCTOR',
          subtitle: 'The Doctor',
          description: 'Protect one player each night to prevent them from being killed by the Mafia.',
          icon: <Heart className="w-10 h-10 text-[#00ff9f]" />,
          borderColor: 'border-[#00ff9f]',
          bgColor: 'bg-[#00ff9f]/10',
          textColor: 'text-[#00ff9f]',
        };
      case 'Villager':
      default:
        return {
          title: 'VILLAGER',
          subtitle: 'The Villager',
          description: 'Work together with fellow villagers to find and vote out the Mafia during the day.',
          icon: <User className="w-10 h-10 text-[#fcee0a]" />,
          borderColor: 'border-[#fcee0a]/50',
          bgColor: 'bg-[#141824]',
          textColor: 'text-[#fcee0a]',
        };
    }
  };

  const config = getRoleConfig(role);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 font-mono">
      <div className="w-full max-w-sm max-h-[90vh] overflow-y-auto bg-[#101216] border border-[#fcee0a] hud-cut shadow-[0_0_35px_rgba(0,0,0,0.95)] p-5 sm:p-6 text-center relative animate-hud-modal-snap">
        {/* Top Cyberpunk Hazard Stripe */}
        <div className="h-1.5 w-full bg-[#fcee0a] hud-hazard-yellow mb-4" />

        {/* Privacy Curtain: Before current player has tapped */}
        {!isRevealed ? (
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
              <div className="text-2xl sm:text-3xl font-bold text-[#fcee0a] mt-1 tracking-wider uppercase">
                {playerName}
              </div>
            </div>

            <p className="text-xs text-[#7d8799] leading-relaxed px-2">
              Pass phone to <strong className="text-white">{playerName}</strong>. Everyone else look away before viewing role.
            </p>

            <button
              onClick={() => setIsRevealed(true)}
              className="hud-btn hud-btn-primary w-full py-3 text-xs"
            >
              [ I AM {playerName.toUpperCase()} &bull; REVEAL ROLE ]
            </button>
          </div>
        ) : (
          /* Secret Role Revealed Screen */
          <div className="space-y-4 py-1">
            <div className="flex items-center justify-between text-xs text-[#7d8799] border-b border-[#fcee0a]/20 pb-2.5">
              <span className="uppercase tracking-wider text-[10px] font-bold text-[#fcee0a]">[ SECRET ROLE ]</span>
              <span className="font-bold text-white uppercase">{playerName}</span>
            </div>

            {/* Role Card Banner */}
            <div
              className={`p-5 hud-cut-sm ${config.bgColor} border ${config.borderColor} text-center space-y-2.5`}
            >
              <div className="flex justify-center">{config.icon}</div>
              <div>
                <h3 className={`font-bold text-2xl tracking-wider uppercase ${config.textColor}`}>
                  {config.title}
                </h3>
                <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-0.5">
                  {config.subtitle}
                </div>
              </div>
              <p className="text-xs text-stone-300 leading-relaxed max-w-xs mx-auto pt-1 font-mono">
                {config.description}
              </p>
            </div>

            {/* Confirmation Pass-Phone Button */}
            <button
              onClick={handleConfirmAndPass}
              className="hud-btn hud-btn-secondary w-full py-3 text-xs flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4 text-[#00ff9f]" />
              <span>[ GOT IT &bull; PASS PHONE ]</span>
            </button>

            <p className="text-[10px] font-bold text-[#7d8799] tracking-widest uppercase">
              Maintain the Code of Silence
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const SkullIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12.5 17-.5-1-.5 1h1z" />
    <path d="M15 22a1 1 0 0 0 1-1v-1a2 2 0 0 0 1.56-3.25 8 8 0 1 0-11.12 0A2 2 0 0 0 8 20v1a1 1 0 0 0 1 1z" />
    <circle cx="9" cy="12" r="1" />
    <circle cx="15" cy="12" r="1" />
  </svg>
);
