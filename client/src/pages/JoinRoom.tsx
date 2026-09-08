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
    <div className="max-w-md mx-auto px-4 py-6 font-mono space-y-4">
      {/* Back button */}
      <div>
        <Link
          to="/"
          className="hud-btn hud-btn-secondary px-3 py-1.5 text-xs inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[#fcee0a]" />
          <span>{'[ < BACK ]'}</span>
        </Link>
      </div>

      {/* Loading state during room verification */}
      {isValidating ? (
        <div className="bg-[#101216] border border-[#fcee0a]/30 p-8 text-center hud-cut space-y-3 animate-hud-fade">
          <Loader2 className="w-8 h-8 text-[#fcee0a] animate-spin mx-auto mb-3" />
          <p className="text-sm font-bold text-white tracking-wider uppercase">[ CHECKING ROOM // {formattedCode} ]</p>
          <p className="text-xs text-[#7d8799] mt-1">Connecting to server...</p>
        </div>
      ) : !isRoomValid ? (
        /* Room Not Found / Expired Error State */
        <div className="bg-[#101216] border border-[#ff003c]/40 p-6 text-center hud-cut space-y-4 animate-hud-fade">
          <div className="w-12 h-12 bg-[#ff003c]/15 border border-[#ff003c]/40 flex items-center justify-center text-[#ff003c] mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-[#ff003c] mb-1 tracking-wider uppercase">[ ROOM NOT FOUND ]</h3>
            <p className="text-xs text-stone-300">
              Room code <span className="font-bold bg-[#0c0e12] px-2 py-0.5 border border-[#ff003c]/50 text-[#fcee0a]">{formattedCode}</span> is invalid or no longer active.
            </p>
            <p className="text-xs text-[#7d8799] mt-1">{validationError}</p>
          </div>

          <Link
            to="/"
            className="hud-btn hud-btn-secondary w-full py-2.5 text-xs inline-block text-center"
          >
            [ ENTER ANOTHER CODE ]
          </Link>
        </div>
      ) : roomGameMode === 'two_phone' ? (
        /* Two-Phone Mode Detected -> Connect as Shared Device */
        <div className="bg-[#101216] border border-[#fcee0a]/30 p-6 hud-cut space-y-5 animate-hud-fade">
          <div className="flex items-center justify-between pb-3 border-b border-[#fcee0a]/20">
            <span className="text-xs font-bold text-[#7d8799] uppercase tracking-wider">[ TWO-PHONE MODE ]</span>
            <span className="font-bold text-[#fcee0a] bg-[#0c0e12] px-2.5 py-0.5 border border-[#fcee0a]/40 tracking-widest">{formattedCode}</span>
          </div>

          <div className="text-center space-y-4">
            <div className="w-14 h-14 bg-[#fcee0a]/10 border border-[#fcee0a]/40 flex items-center justify-center text-[#fcee0a] mx-auto">
              <Smartphone className="w-7 h-7" />
            </div>

            <div>
              <h3 className="font-bold text-sm text-white uppercase tracking-wider mb-1">[ SHARED PLAYER PHONE ]</h3>
              <p className="text-xs text-[#7d8799] leading-relaxed max-w-xs mx-auto">
                Room uses one shared phone passed around the group for viewing secret roles and casting private votes.
              </p>
            </div>

            {joinError && (
              <div className="p-3 bg-[#ff003c]/10 border border-[#ff003c]/40 text-[#ff003c] text-xs flex items-start gap-2 text-left">
                <AlertCircle className="w-4 h-4 text-[#ff003c] shrink-0 mt-0.5" />
                <span>{joinError}</span>
              </div>
            )}

            <button
              onClick={handleConnectSharedDevice}
              disabled={isJoining || !isConnected}
              className="hud-btn hud-btn-primary w-full py-3 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Smartphone className="w-4 h-4" />
              {isJoining ? '[ CONNECTING... ]' : '[ CONNECT AS SHARED PHONE ]'}
            </button>
          </div>
        </div>
      ) : (
        /* Multi-Phone Mode -> Join Form */
        <div className="bg-[#101216] border border-[#fcee0a]/30 p-6 hud-cut space-y-5 animate-hud-fade">
          {/* Room Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#fcee0a]/20">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-[#00ff9f]" />
              <span className="font-bold text-xs text-white uppercase tracking-wider">[ JOIN ROOM ]</span>
            </div>
            <span className="font-bold text-[#fcee0a] bg-[#0c0e12] px-2.5 py-0.5 border border-[#fcee0a]/40 tracking-widest">{formattedCode}</span>
          </div>

          <div>
            {/* Join Error Banner */}
            {joinError && (
              <div className="mb-4 p-3 bg-[#ff003c]/10 border border-[#ff003c]/40 text-[#ff003c] text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-[#ff003c] shrink-0 mt-0.5" />
                <span>{joinError}</span>
              </div>
            )}

            {/* Join Form */}
            <form onSubmit={handleJoinSubmit} className="space-y-4">
              <div>
                <label htmlFor="playerNameInput" className="block text-[10px] uppercase font-bold text-[#7d8799] mb-2 tracking-wider">
                  ENTER YOUR NAME:
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#7d8799]">
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
                    placeholder="E.G. VITO, SONNY, MICHAEL"
                    className="w-full pl-10 pr-4 py-3 bg-[#08090b] border border-[#fcee0a]/30 text-[#fcee0a] placeholder:text-stone-600 text-sm font-mono font-bold tracking-wider focus:outline-none focus:border-[#fcee0a] focus:ring-1 focus:ring-[#fcee0a] uppercase transition-all"
                  />
                </div>
                <p className="text-[10px] text-[#7d8799] mt-1.5 px-0.5 uppercase">
                  Max 20 characters • Visible to all players
                </p>
              </div>

              <button
                type="submit"
                disabled={isJoining || !playerName.trim() || !isConnected}
                className="hud-btn hud-btn-primary w-full py-3 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isJoining ? '[ JOINING... ]' : '[ JOIN ROOM ]'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
