import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { storage } from '../utils/storage';
import { Users, Plus, ArrowRight, Shield, AlertCircle, RefreshCw, Smartphone, BookOpen } from 'lucide-react';
import { HowToPlayModal } from '../components/HowToPlayModal';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const { createRoom, validateRoom, isConnected, kickedReason, clearKickedReason, attemptSilentReconnect } = useSocket();

  const [inputCode, setInputCode] = useState('');
  const [selectedMode, setSelectedMode] = useState<'multi_phone' | 'two_phone'>('multi_phone');
  const [isValidating, setIsValidating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasStoredSession, setHasStoredSession] = useState<{ isMod: boolean; code: string } | null>(null);

  useEffect(() => {
    // Check if there is an active session in storage
    const mod = storage.getModeratorSession();
    if (mod) {
      setHasStoredSession({ isMod: true, code: mod.roomCode });
      return;
    }
    const ply = storage.getPlayerSession();
    if (ply) {
      setHasStoredSession({ isMod: false, code: ply.roomCode });
      return;
    }
    const shared = storage.getSharedSession();
    if (shared) {
      setHasStoredSession({ isMod: false, code: shared.roomCode });
      return;
    }
    setHasStoredSession(null);
  }, []);

  const handleCreateRoom = async () => {
    if (isCreating) return;
    setIsCreating(true);
    setErrorMessage(null);

    const result = await createRoom(selectedMode);
    setIsCreating(false);

    if (result.success && result.roomCode) {
      navigate(`/moderator/${result.roomCode}`);
    } else {
      setErrorMessage(result.error || 'Failed to create room. Is the server running?');
    }
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = inputCode.trim().toUpperCase();
    if (!cleanCode) {
      setErrorMessage('Please enter a room code');
      return;
    }

    setIsValidating(true);
    setErrorMessage(null);

    const result = await validateRoom(cleanCode);
    setIsValidating(false);

    if (result.valid) {
      navigate(`/join/${cleanCode}`);
    } else {
      setErrorMessage(result.error || 'Room not found or no longer active');
    }
  };

  const handleRejoinExisting = async () => {
    const success = await attemptSilentReconnect();
    if (success && hasStoredSession) {
      if (hasStoredSession.isMod) {
        navigate(`/moderator/${hasStoredSession.code}`);
      } else {
        navigate(`/lobby/${hasStoredSession.code}`);
      }
    } else {
      setHasStoredSession(null);
      setErrorMessage('Previous session is no longer active.');
    }
  };

  const handleDismissSession = () => {
    storage.clearAllSessions();
    setHasStoredSession(null);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-6 sm:py-8 font-sans">
      {/* Title */}
      <div className="text-center mb-6">
        <h2 className="font-black text-2xl sm:text-3xl text-black tracking-wider uppercase">
          MAFIA OMERTÀ
        </h2>
      </div>

      {/* Kicked or Error Notification */}
      {(kickedReason || errorMessage) && (
        <div className="mb-5 p-3 bg-red-100 border-2 border-[#800000] text-black text-xs flex items-start gap-2.5 shadow-[2px_2px_0px_#800000]">
          <AlertCircle className="w-4 h-4 text-[#800000] shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold text-[#800000] uppercase tracking-wide">SYSTEM NOTICE</p>
            <p className="text-xs text-stone-800 mt-0.5">{kickedReason || errorMessage}</p>
          </div>
          <button
            onClick={() => {
              clearKickedReason();
              setErrorMessage(null);
            }}
            className="text-black hover:text-[#800000] text-xs uppercase font-black underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Reconnect Banner if stored session found */}
      {hasStoredSession && (
        <div className="mb-5 border-2 border-black bg-white shadow-[2px_2px_0px_#000000]">
          <div className="bg-[#800000] text-white px-3 py-1 font-bold text-xs uppercase tracking-wide border-b-2 border-black flex items-center justify-between">
            <span>ACTIVE SESSION DETECTED</span>
            <button
              onClick={handleDismissSession}
              className="text-stone-200 hover:text-white text-[11px] underline uppercase"
            >
              Forget
            </button>
          </div>
          <div className="p-3">
            <p className="text-xs text-stone-800 mb-2.5">
              Active match found for room{' '}
              <span className="font-mono font-bold bg-stone-100 px-1.5 py-0.5 border border-black">{hasStoredSession.code}</span> as{' '}
              <span className="font-bold">{hasStoredSession.isMod ? 'Moderator' : 'Player'}</span>.
            </p>
            <button
              onClick={handleRejoinExisting}
              className="retro-btn retro-btn-primary w-full shadow-[1px_1px_0px_#000000]"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Resume Room {hasStoredSession.code}
            </button>
          </div>
        </div>
      )}

      {/* Action Modules */}
      <div className="space-y-5">
        {/* Host / Create Room */}
        <div className="border-2 border-black bg-white shadow-[2px_2px_0px_#000000]">
          <div className="bg-[#800000] text-white px-3 py-1.5 font-bold text-xs uppercase tracking-wider border-b-2 border-black flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Shield className="w-4 h-4" />
              <span>HOST A GAME &bull; MODERATOR PORTAL</span>
            </div>
            <span className="text-[10px] bg-black text-amber-300 px-1 py-0.2 font-mono">NEW ROOM</span>
          </div>

          <div className="p-4">
            {/* Mode Selector */}
            <div className="mb-4">
              <label className="block text-[11px] uppercase tracking-wider font-bold text-black mb-1.5">
                Select Setup Mode:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedMode('multi_phone')}
                  className={`p-2 border-2 border-black text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                    selectedMode === 'multi_phone'
                      ? 'bg-[#800000] text-white shadow-[1px_1px_0px_#000000]'
                      : 'bg-[#f0ede5] text-black hover:bg-white'
                  }`}
                >
                  <div className="flex items-center gap-1 font-bold">
                    <Users className="w-3.5 h-3.5" />
                    <span>Multi-Phone</span>
                  </div>
                  <span className={`text-[10px] ${selectedMode === 'multi_phone' ? 'text-stone-200' : 'text-stone-600'}`}>
                    1 device / player
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMode('two_phone')}
                  className={`p-2 border-2 border-black text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                    selectedMode === 'two_phone'
                      ? 'bg-[#800000] text-white shadow-[1px_1px_0px_#000000]'
                      : 'bg-[#f0ede5] text-black hover:bg-white'
                  }`}
                >
                  <div className="flex items-center gap-1 font-bold">
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Two-Phone</span>
                  </div>
                  <span className={`text-[10px] ${selectedMode === 'two_phone' ? 'text-stone-200' : 'text-stone-600'}`}>
                    1 shared player phone
                  </span>
                </button>
              </div>

              <div className="mt-2 px-0.5">
                <span className="text-[11px] text-stone-600">
                  {selectedMode === 'multi_phone' ? 'Each player joins on their own phone' : 'Moderator phone + 1 shared player phone'}
                </span>
              </div>
            </div>

            <button
              onClick={handleCreateRoom}
              disabled={isCreating || !isConnected}
              className="retro-btn retro-btn-primary w-full py-2.5 shadow-[1px_1px_0px_#000000] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              {isCreating ? 'Creating Room...' : `Create ${selectedMode === 'two_phone' ? 'Two-Phone' : 'Multi-Phone'} Game`}
            </button>
          </div>
        </div>

        {/* Join Existing Room */}
        <div className="border-2 border-black bg-white shadow-[2px_2px_0px_#000000]">
          <div className="bg-[#800000] text-white px-3 py-1.5 font-bold text-xs uppercase tracking-wider border-b-2 border-black flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              <span>JOIN A GAME &bull; PLAYER ACCESS</span>
            </div>
            <span className="text-[10px] bg-black text-white px-1 py-0.2 font-mono">CLIENT</span>
          </div>

          <div className="p-4">
            <p className="text-xs text-stone-700 mb-3">
              Enter the 4–5 character room code provided by your host or moderator:
            </p>

            <form onSubmit={handleJoinSubmit} className="space-y-3">
              <div>
                <label htmlFor="roomCodeInput" className="block text-[11px] uppercase font-bold text-black mb-1">
                  Room Code:
                </label>
                <input
                  id="roomCodeInput"
                  type="text"
                  maxLength={6}
                  value={inputCode}
                  onChange={(e) => {
                    setInputCode(e.target.value.toUpperCase());
                    setErrorMessage(null);
                  }}
                  placeholder="e.g. 7X9K"
                  className="w-full px-3 py-2 bg-white border-2 border-black text-black font-mono font-bold text-center text-lg tracking-widest placeholder:text-stone-400 focus:outline-none focus:bg-yellow-50 uppercase"
                />
              </div>

              <button
                type="submit"
                disabled={isValidating || !inputCode.trim() || !isConnected}
                className="retro-btn retro-btn-secondary w-full py-2.5 shadow-[1px_1px_0px_#000000] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isValidating ? (
                  <span>Checking Code...</span>
                ) : (
                  <>
                    <span>Proceed to Seat</span>
                    <ArrowRight className="w-4 h-4 text-[#800000]" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* In-App How to Play Guide Button */}
        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={() => setIsHelpOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-black hover:text-[#800000] transition-colors py-1.5 px-3 bg-[#f0ede5] hover:bg-white border-2 border-black shadow-[1px_1px_0px_#000000] uppercase"
          >
            <BookOpen className="w-3.5 h-3.5 text-[#800000]" />
            <span>How to Play & Quick Rules Reference</span>
          </button>
        </div>
      </div>

      {/* How to Play Modal */}
      <HowToPlayModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        defaultTab="players"
      />
    </div>
  );
};
