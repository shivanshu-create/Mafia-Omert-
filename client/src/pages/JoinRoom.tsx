import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { storage } from '../utils/storage';
import { GameMode } from '../types';
import { ArrowLeft, User, AlertCircle, Loader2, Smartphone } from 'lucide-react';

export const JoinRoom: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { validateRoom, joinRoom, joinSharedRoom, isConnected, attemptSilentReconnect, reconnectWithToken } = useSocket();

  const [playerName, setPlayerName] = useState('');
  const [roomGameMode, setRoomGameMode] = useState<GameMode | null>(null);
  const [isValidating, setIsValidating] = useState(true);
  const [isRoomValid, setIsRoomValid] = useState<boolean | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const formattedCode = (code || '').trim().toUpperCase();

  // Validate room code on load and check existing session
  useEffect(() => {
    let mounted = true;

    async function checkRoom() {
      if (!formattedCode) {
        setIsRoomValid(false);
        setValidationError('Invalid or missing room code');
        setIsValidating(false);
        return;
      }

      // Check if URL has an explicit seat reconnect token (from moderator resend join link)
      const searchParams = new URLSearchParams(window.location.search);
      const tokenParam = searchParams.get('token');
      if (tokenParam) {
        const reconnected = await reconnectWithToken(formattedCode, tokenParam);
        if (reconnected && mounted) {
          navigate(`/lobby/${formattedCode}`, { replace: true });
          return;
        }
      }

      // Check if user already has an active shared session for this room
      const existingSharedSession = storage.getSharedSession();
      if (existingSharedSession && existingSharedSession.roomCode === formattedCode) {
        const reconnected = await attemptSilentReconnect();
        if (reconnected && mounted) {
          navigate(`/lobby/${formattedCode}`, { replace: true });
          return;
        }
      }

      // Check if user already has an active player session for this room
      const existingPlayerSession = storage.getPlayerSession();
      if (existingPlayerSession && existingPlayerSession.roomCode === formattedCode) {
        const reconnected = await attemptSilentReconnect();
        if (reconnected && mounted) {
          navigate(`/lobby/${formattedCode}`, { replace: true });
          return;
        }
      }

      // Check if moderator session exists for this room
      const existingModSession = storage.getModeratorSession();
      if (existingModSession && existingModSession.roomCode === formattedCode) {
        const reconnected = await attemptSilentReconnect();
        if (reconnected && mounted) {
          navigate(`/moderator/${formattedCode}`, { replace: true });
          return;
        }
      }

      // Validate room existence
      const result = await validateRoom(formattedCode);
      if (!mounted) return;

      setIsValidating(false);
      if (result.valid) {
        setIsRoomValid(true);
        if (result.gameMode) {
          setRoomGameMode(result.gameMode);
        }
      } else {
        setIsRoomValid(false);
        setValidationError(result.error || 'Room not found or no longer active');
      }
    }

    checkRoom();

    return () => {
      mounted = false;
    };
  }, [formattedCode, validateRoom, attemptSilentReconnect, navigate]);

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = playerName.trim();
    if (!cleanName) {
      setJoinError('Please enter your name');
      return;
    }

    setIsJoining(true);
    setJoinError(null);

    const result = await joinRoom(formattedCode, cleanName);
    setIsJoining(false);

    if (result.success) {
      navigate(`/lobby/${formattedCode}`);
    } else {
      setJoinError(result.error || 'Failed to join room');
    }
  };

  const handleConnectSharedDevice = async () => {
    setIsJoining(true);
    setJoinError(null);

    const result = await joinSharedRoom(formattedCode);
    setIsJoining(false);

    if (result.success) {
      navigate(`/lobby/${formattedCode}`);
    } else {
      setJoinError(result.error || 'Failed to connect as shared device');
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-6 sm:py-8 font-sans">
      {/* Back button */}
      <div className="mb-4">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-black hover:text-[#800000] border-2 border-black bg-[#f0ede5] hover:bg-white px-2.5 py-1 shadow-[1px_1px_0px_#000000] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[#800000]" />
          <span>&laquo; Back to Home</span>
        </Link>
      </div>

      {/* Loading state during room verification */}
      {isValidating ? (
        <div className="border-2 border-black bg-white p-6 text-center shadow-[2px_2px_0px_#000000]">
          <Loader2 className="w-6 h-6 text-[#800000] animate-spin mx-auto mb-3" />
          <p className="text-xs font-bold text-black uppercase tracking-wider">Verifying Room {formattedCode}...</p>
          <p className="text-[11px] text-stone-600 mt-0.5">Connecting to game server...</p>
        </div>
      ) : !isRoomValid ? (
        /* Room Not Found / Expired Error State */
        <div className="border-2 border-[#800000] bg-white p-6 text-center shadow-[2px_2px_0px_#800000]">
          <div className="w-10 h-10 bg-red-100 border-2 border-[#800000] flex items-center justify-center text-[#800000] mx-auto mb-3">
            <AlertCircle className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-base text-[#800000] uppercase tracking-wider mb-1">Room Not Found</h3>
          <p className="text-xs text-black mb-2">
            Code <span className="font-mono font-bold bg-stone-100 px-1.5 py-0.5 border border-black">{formattedCode}</span> is invalid or the game has ended.
          </p>
          <p className="text-[11px] text-stone-600 mb-5">{validationError}</p>

          <Link
            to="/"
            className="retro-btn retro-btn-secondary w-full shadow-[1px_1px_0px_#000000]"
          >
            Enter Another Room Code
          </Link>
        </div>
      ) : roomGameMode === 'two_phone' ? (
        /* Two-Phone Mode Detected -> Connect as Shared Device */
        <div className="border-2 border-black bg-white shadow-[2px_2px_0px_#000000]">
          <div className="bg-[#800000] text-white px-3 py-1.5 font-bold text-xs uppercase tracking-wider border-b-2 border-black flex items-center justify-between">
            <span>TWO-PHONE MODE &bull; SHARED DEVICE</span>
            <span className="font-mono text-amber-300">{formattedCode}</span>
          </div>

          <div className="p-5 text-center">
            <div className="w-12 h-12 bg-[#f0ede5] border-2 border-black flex items-center justify-center text-[#800000] mx-auto mb-3 shadow-[1px_1px_0px_#000000]">
              <Smartphone className="w-6 h-6" />
            </div>

            <h3 className="font-bold text-base text-black uppercase tracking-wide mb-1">Shared Player Device</h3>
            <p className="text-xs text-stone-700 mb-5 leading-relaxed">
              Room uses one shared device passed around the group for viewing secret roles and voting.
            </p>

            {joinError && (
              <div className="mb-4 p-2.5 bg-red-100 border-2 border-[#800000] text-black text-xs flex items-start gap-2 text-left">
                <AlertCircle className="w-4 h-4 text-[#800000] shrink-0 mt-0.5" />
                <span>{joinError}</span>
              </div>
            )}

            <button
              onClick={handleConnectSharedDevice}
              disabled={isJoining || !isConnected}
              className="retro-btn retro-btn-primary w-full py-2.5 shadow-[1px_1px_0px_#000000] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Smartphone className="w-4 h-4" />
              {isJoining ? 'Connecting...' : 'Connect as Shared Phone'}
            </button>
          </div>
        </div>
      ) : (
        /* Multi-Phone Mode -> Join Form */
        <div className="border-2 border-black bg-white shadow-[2px_2px_0px_#000000]">
          {/* Room Header */}
          <div className="bg-[#800000] text-white px-3 py-1.5 font-bold text-xs uppercase tracking-wider border-b-2 border-black flex items-center justify-between">
            <span>JOIN ROOM MANIFEST</span>
            <span className="font-mono text-amber-300 font-bold tracking-widest">{formattedCode}</span>
          </div>

          <div className="p-5">
            {/* Join Error Banner */}
            {joinError && (
              <div className="mb-4 p-2.5 bg-red-100 border-2 border-[#800000] text-black text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-[#800000] shrink-0 mt-0.5" />
                <span>{joinError}</span>
              </div>
            )}

            {/* Join Form */}
            <form onSubmit={handleJoinSubmit} className="space-y-4">
              <div>
                <label htmlFor="playerNameInput" className="block text-[11px] uppercase font-bold text-black mb-1">
                  Enter Your Character / Player Name:
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="playerNameInput"
                    type="text"
                    maxLength={20}
                    autoFocus
                    value={playerName}
                    onChange={(e) => {
                      setPlayerName(e.target.value);
                      setJoinError(null);
                    }}
                    placeholder="e.g. Vito, Sonny, Michael"
                    className="w-full pl-9 pr-3 py-2 bg-white border-2 border-black text-black placeholder:text-stone-400 focus:outline-none focus:bg-yellow-50 text-sm font-bold"
                  />
                </div>
                <p className="text-[10px] text-stone-600 mt-1">
                  Max 20 characters &bull; Appears on the town manifest and ballot roster.
                </p>
              </div>

              <button
                type="submit"
                disabled={isJoining || !playerName.trim() || !isConnected}
                className="retro-btn retro-btn-primary w-full py-2.5 shadow-[1px_1px_0px_#000000] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isJoining ? 'Joining Room...' : 'Enter Game Room'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
