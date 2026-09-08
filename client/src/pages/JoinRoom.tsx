import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { storage } from '../utils/storage';
import { GameMode } from '../types';
import { ArrowLeft, User, AlertCircle, Loader2, Smartphone, RefreshCw, WifiOff } from 'lucide-react';

type JoinPageStatus = 'connecting' | 'validating' | 'ready' | 'room_not_found' | 'connection_error';

export const JoinRoom: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const {
    validateRoom,
    joinRoom,
    joinSharedRoom,
    isConnected,
    attemptSilentReconnect,
    reconnectWithToken,
    waitForConnection,
  } = useSocket();

  const [playerName, setPlayerName] = useState('');
  const [roomGameMode, setRoomGameMode] = useState<GameMode | null>(null);
  const [pageStatus, setPageStatus] = useState<JoinPageStatus>('connecting');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const formattedCode = (code || '').trim().toUpperCase();

  // Validate room code on load and check existing session
  useEffect(() => {
    let mounted = true;

    async function checkRoom() {
      if (!formattedCode) {
        setPageStatus('room_not_found');
        setErrorMessage('Invalid or missing room code');
        return;
      }

      // Step 1: Ensure socket connection is established first
      setPageStatus('connecting');
      setErrorMessage(null);

      const connected = await waitForConnection(12000);
      if (!mounted) return;

      if (!connected) {
        setPageStatus('connection_error');
        setErrorMessage('Unable to reach the game server. Your mobile data or Wi-Fi network may be slow or unstable.');
        return;
      }

      // Step 2: Socket is connected! Now verify existing sessions or validate room
      setPageStatus('validating');

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

      // Step 3: Validate room existence on the server
      const result = await validateRoom(formattedCode);
      if (!mounted) return;

      if (result.valid) {
        if (result.gameMode) {
          setRoomGameMode(result.gameMode);
        }
        setPageStatus('ready');
      } else if (result.isConnectionError) {
        setPageStatus('connection_error');
        setErrorMessage(result.error || 'Connection timed out while verifying room.');
      } else {
        // Socket successfully connected, and server explicitly responded that room does not exist
        setPageStatus('room_not_found');
        setErrorMessage(result.error || 'Room not found or no longer active');
      }
    }

    checkRoom();

    return () => {
      mounted = false;
    };
  }, [formattedCode, retryCount, waitForConnection, validateRoom, attemptSilentReconnect, reconnectWithToken, navigate]);

  const handleRetry = () => {
    setPageStatus('connecting');
    setErrorMessage(null);
    setJoinError(null);
    setRetryCount((prev) => prev + 1);
  };

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

      {/* State 1: Connecting to server */}
      {pageStatus === 'connecting' && (
        <div className="bg-[#101216] border border-[#00e5ff]/40 p-8 text-center hud-cut space-y-4 animate-hud-fade">
          <div className="w-12 h-12 bg-[#00e5ff]/10 border border-[#00e5ff]/40 flex items-center justify-center text-[#00e5ff] mx-auto">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
          <div>
            <p className="text-xs text-[#00e5ff] font-bold tracking-widest uppercase mb-1">
              [ CONNECTING TO SERVER ]
            </p>
            <p className="text-sm font-bold text-white tracking-wider uppercase">
              ROOM // <span className="text-[#fcee0a]">{formattedCode}</span>
            </p>
            <p className="text-xs text-[#7d8799] mt-2">
              Establishing connection to game server...
            </p>
            <p className="text-[10px] text-[#7d8799]/80 mt-1">
              Mobile connection detected • Please wait a moment
            </p>
          </div>
        </div>
      )}

      {/* State 2: Verifying room with server */}
      {pageStatus === 'validating' && (
        <div className="bg-[#101216] border border-[#fcee0a]/40 p-8 text-center hud-cut space-y-4 animate-hud-fade">
          <div className="w-12 h-12 bg-[#fcee0a]/10 border border-[#fcee0a]/40 flex items-center justify-center text-[#fcee0a] mx-auto">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
          <div>
            <p className="text-xs text-[#fcee0a] font-bold tracking-widest uppercase mb-1">
              [ VERIFYING ROOM ]
            </p>
            <p className="text-sm font-bold text-white tracking-wider uppercase">
              ROOM // <span className="text-[#fcee0a]">{formattedCode}</span>
            </p>
            <p className="text-xs text-[#7d8799] mt-2">
              Connected • Checking room status with server...
            </p>
          </div>
        </div>
      )}

      {/* State 3: Connection Timeout / Mobile Network Error */}
      {pageStatus === 'connection_error' && (
        <div className="bg-[#101216] border border-[#ff003c]/40 p-6 text-center hud-cut space-y-4 animate-hud-fade">
          <div className="w-12 h-12 bg-[#ff003c]/15 border border-[#ff003c]/40 flex items-center justify-center text-[#ff003c] mx-auto">
            <WifiOff className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-[#ff003c] mb-1 tracking-wider uppercase">
              [ CONNECTION ERROR ]
            </h3>
            <p className="text-xs text-stone-300">
              Unable to establish a reliable connection to the game server.
            </p>
            <p className="text-xs text-[#7d8799] mt-1.5 leading-relaxed">
              {errorMessage || 'Your mobile data or Wi-Fi network may be slow or blocking connections.'}
            </p>
          </div>

          <div className="space-y-2 pt-2">
            <button
              onClick={handleRetry}
              className="hud-btn hud-btn-primary w-full py-2.5 text-xs flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>[ RETRY CONNECTION ]</span>
            </button>
            <Link
              to="/"
              className="hud-btn hud-btn-secondary w-full py-2.5 text-xs inline-block text-center"
            >
              [ RETURN TO HOME ]
            </Link>
          </div>
        </div>
      )}

      {/* State 4: Room Not Found (Only shown when server explicitly reports invalid) */}
      {pageStatus === 'room_not_found' && (
        <div className="bg-[#101216] border border-[#ff003c]/40 p-6 text-center hud-cut space-y-4 animate-hud-fade">
          <div className="w-12 h-12 bg-[#ff003c]/15 border border-[#ff003c]/40 flex items-center justify-center text-[#ff003c] mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-[#ff003c] mb-1 tracking-wider uppercase">[ ROOM NOT FOUND ]</h3>
            <p className="text-xs text-stone-300">
              Room code <span className="font-bold bg-[#0c0e12] px-2 py-0.5 border border-[#ff003c]/50 text-[#fcee0a]">{formattedCode}</span> is invalid or no longer active.
            </p>
            <p className="text-xs text-[#7d8799] mt-1">{errorMessage || 'The room has ended or the code was mistyped.'}</p>
          </div>

          <Link
            to="/"
            className="hud-btn hud-btn-secondary w-full py-2.5 text-xs inline-block text-center"
          >
            [ ENTER ANOTHER CODE ]
          </Link>
        </div>
      )}

      {/* State 5: Room is verified and ready */}
      {pageStatus === 'ready' && (
        roomGameMode === 'two_phone' ? (
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
        )
      )}
    </div>
  );
};
