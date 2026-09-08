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
    <div className="max-w-md mx-auto px-4 py-6 font-mono space-y-4">

      {/* Kicked or Error Notification */}
      {(kickedReason || errorMessage) && (
        <div className="p-3.5 bg-[#ff003c]/10 border border-[#ff003c]/40 text-[#ff003c] text-xs flex items-start gap-3 hud-cut-sm animate-hud-fade">
          <AlertCircle className="w-4 h-4 text-[#ff003c] shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold text-[#ff003c] uppercase tracking-wider text-[10px]">[ ALERT ]</p>
            <p className="text-xs text-stone-300 mt-0.5">{kickedReason || errorMessage}</p>
          </div>
          <button
            onClick={() => {
              clearKickedReason();
              setErrorMessage(null);
            }}
            className="text-[#7d8799] hover:text-white text-xs underline px-1 uppercase"
          >
            [X]
          </button>
        </div>
      )}

      {/* Reconnect Banner if stored session found */}
      {hasStoredSession && (
        <div className="bg-[#101216] border border-[#fcee0a]/35 p-4 sm:p-5 space-y-3 hud-cut animate-hud-fade">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#fcee0a] uppercase tracking-wider">[ ACTIVE SESSION DETECTED ]</span>
            <button
              onClick={handleDismissSession}
              className="text-[#7d8799] hover:text-white text-xs underline"
            >
              [ FORGET ]
            </button>
          </div>
          <div>
            <p className="text-xs text-stone-300">
              Active game found for room{' '}
              <span className="font-bold bg-[#14171f] text-[#fcee0a] px-2 py-0.5 border border-[#fcee0a]/40">
                {hasStoredSession.code}
              </span>{' '}
              as <span className="font-bold text-white uppercase">{hasStoredSession.isMod ? 'Moderator' : 'Player'}</span>.
            </p>
          </div>
          <button
            onClick={handleRejoinExisting}
            className="hud-btn hud-btn-primary w-full py-2.5 font-bold"
          >
            <RefreshCw className="w-4 h-4" />
            [ RESUME GAME: {hasStoredSession.code} ]
          </button>
        </div>
      )}

      {/* Action Modules */}
      <div className="space-y-4">
        {/* Host / Create Room */}
        <div className="bg-[#101216] border border-[#fcee0a]/25 p-5 sm:p-6 space-y-4 hud-cut">
          <div className="flex items-center justify-between border-b border-[#fcee0a]/20 pb-3">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#fcee0a]" />
              <span className="font-bold text-xs sm:text-sm text-white uppercase tracking-wider">[ HOST A GAME ]</span>
            </div>
            <span className="text-[10px] font-bold bg-[#fcee0a]/15 text-[#fcee0a] border border-[#fcee0a]/30 px-2 py-0.5">
              NEW ROOM
            </span>
          </div>

          <div className="space-y-3.5">
            {/* Mode Selector */}
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-bold text-[#7d8799] mb-2">
                SELECT SETUP MODE:
              </label>
              <div className="grid grid-cols-2 gap-2 bg-[#08090b] p-1.5 border border-[#fcee0a]/20">
                <button
                  type="button"
                  onClick={() => setSelectedMode('multi_phone')}
                  className={`p-2.5 text-xs font-bold uppercase flex flex-col items-center gap-1 transition-all ${
                    selectedMode === 'multi_phone'
                      ? 'bg-[#fcee0a] text-black'
                      : 'text-[#7d8799] hover:text-white hover:bg-[#14171f]'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    <span>Multi-Phone</span>
                  </div>
                  <span className="text-[9px] opacity-80">
                    [1 PHONE / PLAYER]
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMode('two_phone')}
                  className={`p-2.5 text-xs font-bold uppercase flex flex-col items-center gap-1 transition-all ${
                    selectedMode === 'two_phone'
                      ? 'bg-[#fcee0a] text-black'
                      : 'text-[#7d8799] hover:text-white hover:bg-[#14171f]'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Two-Phone</span>
                  </div>
                  <span className="text-[9px] opacity-80">
                    [1 SHARED PHONE]
                  </span>
                </button>
              </div>

              <div className="mt-2 px-0.5">
                <span className="text-[10px] text-[#7d8799] uppercase">
                  {selectedMode === 'multi_phone' ? 'Each player joins on their own phone' : 'One shared phone passed around the group'}
                </span>
              </div>
            </div>

            <button
              onClick={handleCreateRoom}
              disabled={isCreating || !isConnected}
              className="hud-btn hud-btn-primary w-full py-3 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              {isCreating ? '[ CREATING ROOM... ]' : selectedMode === 'two_phone' ? '[ CREATE TWO-PHONE GAME ]' : '[ CREATE MULTI-PHONE GAME ]'}
            </button>
          </div>
        </div>

        {/* Join Existing Room */}
        <div className="bg-[#101216] border border-[#fcee0a]/25 p-5 sm:p-6 space-y-4 hud-cut">
          <div className="flex items-center justify-between border-b border-[#fcee0a]/20 pb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#fcee0a]" />
              <span className="font-bold text-xs sm:text-sm text-white uppercase tracking-wider">[ JOIN A GAME ]</span>
            </div>
            <span className="text-[10px] font-bold bg-[#14171f] text-[#7d8799] border border-white/10 px-2 py-0.5">
              PLAYER
            </span>
          </div>

          <div className="space-y-3.5">
            <p className="text-xs text-[#7d8799]">
              Enter 4–5 character room code:
            </p>

            <form onSubmit={handleJoinSubmit} className="space-y-3">
              <div>
                <input
                  id="roomCodeInput"
                  type="text"
                  maxLength={6}
                  value={inputCode}
                  onChange={(e) => {
                    setInputCode(e.target.value.toUpperCase());
                    setErrorMessage(null);
                  }}
                  placeholder="E.G. 7X9K"
                  className="w-full px-4 py-3 bg-[#08090b] border border-[#fcee0a]/30 text-[#fcee0a] font-mono font-bold text-center text-xl tracking-widest placeholder:text-stone-600 focus:outline-none focus:border-[#fcee0a] focus:ring-1 focus:ring-[#fcee0a] transition-all uppercase"
                />
              </div>

              <button
                type="submit"
                disabled={isValidating || !inputCode.trim() || !isConnected}
                className="hud-btn hud-btn-secondary w-full py-3 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isValidating ? (
                  <span>[ CHECKING CODE... ]</span>
                ) : (
                  <>
                    <span>[ JOIN ROOM ]</span>
                    <ArrowRight className="w-4 h-4 text-[#fcee0a]" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* In-App How to Play Guide Button */}
        <div className="pt-1 text-center">
          <button
            type="button"
            onClick={() => setIsHelpOpen(true)}
            className="inline-flex items-center gap-2 text-xs font-bold text-[#7d8799] hover:text-[#fcee0a] transition-colors py-2 px-4 border border-[#fcee0a]/20 bg-[#101216] hover:border-[#fcee0a]/50 uppercase tracking-wider"
          >
            <BookOpen className="w-4 h-4 text-[#fcee0a]" />
            <span>[ ? HOW TO PLAY & QUICK REFERENCE ]</span>
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
