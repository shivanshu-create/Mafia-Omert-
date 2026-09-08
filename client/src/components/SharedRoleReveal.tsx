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
          subtitle: 'The Syndicate',
          description: 'Eliminate all town members during the night and blend in during day discussions without raising suspicion.',
          icon: <SkullIcon className="w-10 h-10 text-[#800000]" />,
          borderColor: 'border-[#800000]',
          bgColor: 'bg-[#fbebee]',
          textColor: 'text-[#800000]',
        };
      case 'Detective':
        return {
          title: 'DETECTIVE',
          subtitle: 'The Law',
          description: 'Investigate suspects each night to uncover their true identities and guide the town toward justice.',
          icon: <Eye className="w-10 h-10 text-[#003399]" />,
          borderColor: 'border-[#003399]',
          bgColor: 'bg-[#eef4ff]',
          textColor: 'text-[#003399]',
        };
      case 'Doctor':
        return {
          title: 'DOCTOR',
          subtitle: 'The Medic',
          description: 'Protect one innocent life from elimination each night through your medical interventions.',
          icon: <Heart className="w-10 h-10 text-[#1e824c]" />,
          borderColor: 'border-[#1e824c]',
          bgColor: 'bg-[#eafaf1]',
          textColor: 'text-[#1e824c]',
        };
      case 'Villager':
      default:
        return {
          title: 'VILLAGER',
          subtitle: 'The Townfolk',
          description: 'Work alongside your fellow citizens to deduce, interrogate, and vote out the hidden Mafia.',
          icon: <User className="w-10 h-10 text-black" />,
          borderColor: 'border-black',
          bgColor: 'bg-white',
          textColor: 'text-black',
        };
    }
  };

  const config = getRoleConfig(role);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75">
      <div className="w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-none bg-white border-2 border-black shadow-none p-4 sm:p-6 text-center relative">
        {/* Privacy Curtain: Before current player has tapped */}
        {!isRevealed ? (
          <div className="space-y-4 py-3">
            <div className="w-14 h-14 rounded-none bg-[#efefef] border-2 border-black flex items-center justify-center text-[#800000] mx-auto">
              <Lock className="w-7 h-7" />
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-none bg-[#fff3cd] border border-black text-[#856404] text-[10px] font-mono font-bold uppercase tracking-wider mb-2">
                <Smartphone className="w-3.5 h-3.5" />
                <span>Pass-the-Phone</span>
              </div>
              <h2 className="font-mono font-black text-xl text-black tracking-wider uppercase">
                HAND PHONE TO
              </h2>
              <div className="font-mono text-2xl sm:text-3xl font-black text-[#800000] mt-1 uppercase tracking-wide">
                {playerName}
              </div>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed px-3 font-mono">
              Pass this device to <strong className="text-black">{playerName}</strong>. No one else should look at the screen while tapping below.
            </p>

            <button
              onClick={() => setIsRevealed(true)}
              className="retro-btn-primary w-full py-3 px-4 text-xs font-mono font-black uppercase tracking-wider"
            >
              I am {playerName} &bull; Reveal Role
            </button>
          </div>
        ) : (
          /* Secret Role Revealed Screen */
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between text-xs text-stone-700 border-b-2 border-black pb-2 font-mono">
              <span className="uppercase tracking-widest text-[10px] font-bold">Confidential Role</span>
              <span className="font-black text-black">{playerName}</span>
            </div>

            {/* Role Card Banner */}
            <div
              className={`p-5 rounded-none ${config.bgColor} border-2 ${config.borderColor} text-center space-y-2`}
            >
              <div className="flex justify-center">{config.icon}</div>
              <div>
                <h3 className={`font-mono font-black text-2xl tracking-widest ${config.textColor}`}>
                  {config.title}
                </h3>
                <div className="text-[11px] font-mono font-bold text-stone-600 uppercase tracking-wider mt-0.5">
                  {config.subtitle}
                </div>
              </div>
              <p className="text-xs text-stone-700 leading-relaxed max-w-xs mx-auto pt-1 font-mono">
                {config.description}
              </p>
            </div>

            {/* Confirmation Pass-Phone Button */}
            <button
              onClick={handleConfirmAndPass}
              className="retro-btn-secondary w-full py-3 px-4 text-xs font-mono font-black uppercase tracking-wider flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4 text-black" />
              <span>Got it, pass the phone</span>
            </button>

            <p className="text-[10px] font-mono font-bold text-stone-600 uppercase tracking-widest">
              Maintain the Omertà code of silence
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
