import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { storage } from '../utils/storage';
import { TrainScheduleBoard } from '../components/TrainScheduleBoard';
import { VotingModal } from '../components/VotingModal';
import { SharedVotingModal } from '../components/SharedVotingModal';
import { SharedRoleReveal } from '../components/SharedRoleReveal';
import { Popups } from '../components/Popups';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { LogOut, Clock, AlertTriangle, Loader2, Smartphone, UserPlus } from 'lucide-react';

export const PlayerLobby: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const {
    roomState,
    currentPlayer,
    leaveRoom,
    attemptSilentReconnect,
    kickedReason,
    addPlayerDirectly,
  } = useSocket();

  const [isVerifying, setIsVerifying] = useState(true);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Form state for adding players on shared device
  const [newPlayerName, setNewPlayerName] = useState('');
  const [isAddingPlayer, setIsAddingPlayer] = useState(false);
  const [addPlayerError, setAddPlayerError] = useState<string | null>(null);

  const formattedCode = (code || '').trim().toUpperCase();

  useEffect(() => {
    let mounted = true;

    async function verifyPlayer() {
      // If already kicked, redirect immediately
      if (kickedReason) {
        navigate('/', { replace: true });
        return;
      }

      const playerSession = storage.getPlayerSession();
      const sharedSession = storage.getSharedSession();

      const isPlayerForThisRoom = playerSession && playerSession.roomCode === formattedCode;
      const isSharedForThisRoom = sharedSession && sharedSession.roomCode === formattedCode;

      if (!isPlayerForThisRoom && !isSharedForThisRoom) {
        setIsVerifying(false);
        setErrorNotice('No active player or shared device session found for this room.');
        return;
      }

      // If roomState is already loaded:
      // For shared session: roomState is sufficient
      // For player session: roomState and currentPlayer are needed
      if (roomState) {
        if (isSharedForThisRoom || (isPlayerForThisRoom && currentPlayer)) {
          setIsVerifying(false);
          return;
        }
      }

      const reconnected = await attemptSilentReconnect();
      if (!mounted) return;

      setIsVerifying(false);
      if (!reconnected) {
        setErrorNotice('Session expired or room no longer active.');
      }
    }

    verifyPlayer();

    return () => {
      mounted = false;
    };
  }, [formattedCode, attemptSilentReconnect, kickedReason, navigate, roomState, currentPlayer]);

  // Handle kicked redirect
  useEffect(() => {
    if (kickedReason) {
      navigate('/', { replace: true });
    }
  }, [kickedReason, navigate]);

  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  const handleLeave = () => {
    setShowLeaveConfirm(true);
  };

  const handleConfirmLeave = async () => {
    setIsLeaving(true);
    await leaveRoom();
    setIsLeaving(false);
    setShowLeaveConfirm(false);
    navigate('/');
  };

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newPlayerName.trim();
    if (!clean || isAddingPlayer) return;

    setIsAddingPlayer(true);
    setAddPlayerError(null);

    const res = await addPlayerDirectly(clean);
    setIsAddingPlayer(false);

    if (res.success) {
      setNewPlayerName('');
    } else {
      setAddPlayerError(res.error || 'Failed to add player');
    }
  };

  if (isVerifying) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <Loader2 className="w-8 h-8 text-red-500 animate-spin mx-auto mb-4" />
        <p className="text-sm font-semibold text-stone-200">Reconnecting to Room {formattedCode}...</p>
      </div>
    );
  }

  if (errorNotice || !roomState) {
    return (
      <div className="max-w-md mx-auto px-4 py-12">
        <div className="portal-module text-center p-6 sm:p-8">
          <div className="w-12 h-12 bg-[#800000] border-2 border-black flex items-center justify-center text-white mx-auto mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="font-mono font-black text-xl text-black uppercase mb-2">Session Not Found</h3>
          <p className="text-xs text-stone-600 mb-6 font-mono">{errorNotice || 'Room not found or no longer active.'}</p>
          <button
            onClick={() => navigate('/')}
            className="retro-btn-primary w-full py-2.5 px-4 text-xs font-mono font-black uppercase tracking-wider"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  const isTwoPhoneMode = roomState.gameMode === 'two_phone';
  const players = roomState.players || [];
  const isGameStarted = roomState.status === 'in_game';
  const currentRound = roomState.round || 1;

  // Multi-phone player values
  const myPlayerId = currentPlayer?.id || storage.getPlayerSession()?.playerId;
  const myPlayerName = currentPlayer?.name || storage.getPlayerSession()?.playerName;
  const myPlayer = players.find((p) => p.id === myPlayerId);
  const myRole = currentPlayer?.role || myPlayer?.role;
  const myStatus = myPlayer?.status || (myPlayer?.isAlive ? 'Alive' : 'Killed');

  return (
    <div className="max-w-4xl mx-auto px-3.5 sm:px-6 py-4 sm:py-6 space-y-4 font-sans">
      {/* Universal Popups: Role reveals upon death, GameOver win screen */}
      <Popups />

      {/* Two-Phone Modals vs Multi-Phone Modal */}
      {isTwoPhoneMode ? (
        <>
          <SharedRoleReveal />
          <SharedVotingModal />
        </>
      ) : (
        <VotingModal />
      )}

      {/* Header Banner: Two-Phone Shared Device vs Multi-Phone Player Identity */}
      {isTwoPhoneMode ? (
        <div className="border-2 border-black bg-white shadow-[2px_2px_0px_#000000]">
          <div className="bg-[#800000] text-white px-3 py-1.5 font-bold text-xs uppercase tracking-wider border-b-2 border-black flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5" />
              <span>SHARED PLAYER CONSOLE</span>
            </span>
            <span className="bg-black text-amber-300 px-1.5 py-0.2 font-mono text-[10px]">
              {isGameStarted ? `ROUND ${currentRound}` : 'LOBBY'}
            </span>
          </div>

          <div className="p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b-2 border-black">
              <div>
                <h2 className="font-black text-xl sm:text-2xl text-black uppercase">
                  Pass-Around Device
                </h2>
                <p className="text-xs text-stone-600 mt-0.5 uppercase tracking-wide">
                  Group device for viewing secret roles and casting private ballots
                </p>
              </div>

              <div className="bg-[#f0ede5] border-2 border-black px-3 py-1.5 text-center shadow-[1px_1px_0px_#000000] shrink-0">
                <div className="text-[9px] uppercase font-bold text-black">ROOM CODE</div>
                <div className="font-mono text-xl sm:text-2xl font-black text-[#800000] tracking-widest">
                  {formattedCode}
                </div>
              </div>
            </div>

            {/* Status Callout */}
            <div className="mt-3 p-2.5 bg-stone-50 border border-black flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#800000] shrink-0" />
                <div className="text-xs">
                  <p className="font-bold text-black uppercase">
                    {isGameStarted
                      ? 'Game in progress &bull; Pass device when prompted.'
                      : 'Lobby open &bull; Waiting for moderator to begin match.'}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] uppercase font-mono text-stone-600 block">Manifest</span>
                <span className="font-mono text-xs font-bold text-black uppercase">
                  {players.length} Players
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="border-2 border-black bg-white shadow-[2px_2px_0px_#000000]">
          <div className="bg-[#800000] text-white px-3 py-1.5 font-bold text-xs uppercase tracking-wider border-b-2 border-black flex items-center justify-between">
            <span>ACTIVE PLAYER CONSOLE</span>
            {isGameStarted && (
              <span className="bg-black text-amber-300 px-1.5 py-0.2 font-mono text-[10px]">
                ROUND {currentRound}
              </span>
            )}
          </div>

          <div className="p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b-2 border-black">
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-[10px] uppercase font-mono font-bold bg-[#f0ede5] border border-black px-1.5 py-0.5 text-black">
                    PLAYER SEAT
                  </span>
                  {myRole && (
                    <span className="text-[10px] font-mono uppercase font-bold text-[#800000] bg-red-50 border border-[#800000] px-1.5 py-0.5">
                      ROLE CONFIDENTIAL
                    </span>
                  )}
                </div>
                <h2 className="font-black text-xl sm:text-2xl text-black uppercase">
                  {myPlayerName}
                </h2>
              </div>

              <div className="bg-[#f0ede5] border-2 border-black px-3 py-1.5 text-center shadow-[1px_1px_0px_#000000] shrink-0">
                <div className="text-[9px] uppercase font-bold text-black">ROOM CODE</div>
                <div className="font-mono text-xl sm:text-2xl font-black text-[#800000] tracking-widest">
                  {formattedCode}
                </div>
              </div>
            </div>

            {/* Status Callout */}
            <div className="mt-3 p-2.5 bg-stone-50 border border-black flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#800000] shrink-0" />
                <div className="text-xs">
                  <p className="font-bold text-black uppercase">
                    {isGameStarted
                      ? myStatus === 'Killed'
                        ? 'Casualty notice: You have been eliminated. Maintain Omertà.'
                        : myRole
                        ? 'Secret role active &bull; Keep screen private.'
                        : 'Game in progress &bull; Standby for moderator.'
                      : 'Lobby open &bull; Waiting for moderator to assign roles and begin.'}
                  </p>
                </div>
              </div>

              {myRole && (
                <div className="text-right shrink-0">
                  <span className="text-[10px] uppercase font-mono text-stone-600 block">Status</span>
                  <span className={`font-mono text-xs font-bold uppercase ${myStatus === 'Killed' ? 'text-stone-500 line-through' : 'text-emerald-800'}`}>
                    {myStatus}
                  </span>
                </div>
              )}
            </div>

            {/* Dedicated Private Role Dossier Strip */}
            {myRole && isGameStarted && (
              <div className="mt-3 p-3 bg-yellow-50 border-2 border-black flex items-center justify-between shadow-[1px_1px_0px_#000000]">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">🕵️</span>
                  <div>
                    <span className="text-[10px] uppercase font-mono tracking-wider text-black block font-bold">
                      CONFIDENTIAL ROLE ASSIGNMENT:
                    </span>
                    <span className="font-mono text-base sm:text-lg font-black uppercase tracking-wider text-[#800000]">
                      {myRole}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-stone-600 uppercase border border-black px-1.5 py-0.5 bg-white">
                  CONFIDENTIAL
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Two-Phone Mode: Direct Player Entry in Lobby */}
      {isTwoPhoneMode && !isGameStarted && (
        <div className="border-2 border-black bg-white p-4 shadow-[2px_2px_0px_#000000]">
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-black">
            <div className="flex items-center gap-1.5">
              <UserPlus className="w-4 h-4 text-[#800000]" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-black">
                ADD PLAYER TO ROSTER
              </h3>
            </div>
            <span className="text-[10px] text-stone-600 uppercase font-mono">
              Pass phone after entering
            </span>
          </div>

          {addPlayerError && (
            <p className="text-xs text-[#800000] bg-red-100 border border-[#800000] px-2 py-1 mb-2.5 font-bold">
              {addPlayerError}
            </p>
          )}

          <form onSubmit={handleAddPlayer} className="flex gap-2">
            <input
              type="text"
              maxLength={20}
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              placeholder="Enter player character name..."
              className="flex-1 px-3 py-1.5 bg-white border-2 border-black text-black font-bold text-xs placeholder:text-stone-400 focus:outline-none focus:bg-yellow-50 uppercase"
            />
            <button
              type="submit"
              disabled={isAddingPlayer || !newPlayerName.trim()}
              className="retro-btn retro-btn-primary shadow-[1px_1px_0px_#000000] disabled:opacity-50 flex items-center gap-1 shrink-0"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{isAddingPlayer ? 'Adding...' : '+ Add'}</span>
            </button>
          </form>
        </div>
      )}

      {/* Train Schedule Live Board */}
      <TrainScheduleBoard
        rounds={roomState.rounds}
        players={players}
        currentRound={currentRound}
        isModerator={false}
        currentPlayerId={isTwoPhoneMode ? undefined : myPlayerId}
        isTwoPhoneMode={isTwoPhoneMode}
      />

      {/* Footer Action */}
      <div className="pt-2 flex justify-start">
        <button
          onClick={handleLeave}
          className="retro-btn retro-btn-secondary shadow-[1px_1px_0px_#000000]"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>{isTwoPhoneMode ? 'Disconnect Device' : 'Leave Room'}</span>
        </button>
      </div>

      {/* Leave Room Confirmation Modal */}
      <ConfirmationModal
        isOpen={showLeaveConfirm}
        title={isTwoPhoneMode ? 'Disconnect Shared Phone?' : 'Leave Game Room?'}
        message={
          isTwoPhoneMode
            ? 'Are you sure you want to disconnect this shared device from the lobby?'
            : 'Are you sure you want to leave this game room? You will be disconnected from the lobby.'
        }
        confirmLabel={isTwoPhoneMode ? 'Disconnect' : 'Leave Room'}
        cancelLabel="Cancel"
        confirmVariant="danger"
        isConfirming={isLeaving}
        onConfirm={handleConfirmLeave}
        onCancel={() => {
          if (!isLeaving) setShowLeaveConfirm(false);
        }}
      />
    </div>
  );
};
