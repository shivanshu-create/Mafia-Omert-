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
      <div className="max-w-md mx-auto px-4 py-16 text-center font-mono">
        <Loader2 className="w-8 h-8 text-[#fcee0a] animate-spin mx-auto mb-4" />
        <p className="text-xs font-bold uppercase tracking-wider text-stone-300">Reconnecting to room [{formattedCode}]...</p>
      </div>
    );
  }

  if (errorNotice || !roomState) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 font-mono">
        <div className="bg-[#101216] hud-cut border border-[#ff003c] p-6 sm:p-8 text-center shadow-[0_0_35px_rgba(255,0,60,0.2)] animate-hud-modal-snap">
          <div className="w-12 h-12 bg-[#ff003c]/20 border border-[#ff003c] flex items-center justify-center text-[#ff003c] mx-auto mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-lg text-[#ff003c] mb-2 uppercase tracking-wider">[ ROOM EXPIRED ]</h3>
          <p className="text-xs text-stone-400 mb-6 leading-relaxed font-mono uppercase">{errorNotice || 'Session disconnected or room no longer active.'}</p>
          <button
            onClick={() => navigate('/')}
            className="hud-btn hud-btn-primary w-full py-2.5 text-xs"
          >
            [ RETURN TO HOME ]
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
    <div className="max-w-4xl mx-auto px-3.5 sm:px-6 py-4 sm:py-6 space-y-4 font-mono">
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
        <div className="bg-[#101216] hud-cut border border-[#fcee0a]/30 overflow-hidden">
          <div className="bg-[#0c0e12] border-b border-[#fcee0a]/20 px-4 py-2 flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 font-bold text-stone-300 uppercase tracking-wider">
              <Smartphone className="w-3.5 h-3.5 text-[#fcee0a]" />
              <span>[ SHARED PLAYER PHONE ]</span>
            </span>
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-[#fcee0a]/15 text-[#fcee0a] border border-[#fcee0a]/40">
              {isGameStarted ? `[ ROUND ${currentRound} ]` : '[ LOBBY ]'}
            </span>
          </div>

          <div className="p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#fcee0a]/20">
              <div>
                <h2 className="font-bold text-xl sm:text-2xl text-white uppercase tracking-wider">
                  SHARED PLAYER PHONE
                </h2>
                <p className="text-xs text-[#7d8799] mt-1">
                  Shared phone • Pass around when prompted to view roles and vote
                </p>
              </div>

              <div className="bg-[#08090b] border border-[#fcee0a]/40 px-4 py-2 text-center shrink-0">
                <div className="text-[10px] uppercase font-bold text-[#7d8799] tracking-wider">ROOM CODE</div>
                <div className="font-mono text-xl sm:text-2xl font-bold text-[#fcee0a] tracking-widest">
                  {formattedCode}
                </div>
              </div>
            </div>

            {/* Status Callout */}
            <div className="mt-4 p-3 bg-[#08090b] border border-[#fcee0a]/20 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-[#fcee0a] shrink-0" />
                <div className="text-xs text-stone-300 font-mono">
                  <p>
                    {isGameStarted
                      ? 'Game in progress • Pass phone when prompted.'
                      : 'Lobby ready • Waiting for moderator to start game.'}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] uppercase text-[#7d8799] block font-bold">PLAYERS</span>
                <span className="text-xs font-bold text-[#fcee0a]">
                  {players.length} PLAYERS
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#101216] hud-cut border border-[#fcee0a]/30 overflow-hidden">
          <div className="bg-[#0c0e12] border-b border-[#fcee0a]/20 px-4 py-2 flex items-center justify-between text-xs">
            <span className="font-bold text-stone-300 uppercase tracking-wider">[ PLAYER LOBBY ]</span>
            {isGameStarted && (
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-[#fcee0a]/15 text-[#fcee0a] border border-[#fcee0a]/40">
                [ ROUND ${currentRound} ]
              </span>
            )}
          </div>

          <div className="p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#fcee0a]/20">
              <div>
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="text-[10px] uppercase font-bold bg-[#08090b] border border-[#fcee0a]/30 px-2 py-0.5 text-[#fcee0a]">
                    CONNECTED
                  </span>
                  {myRole && (
                    <span className="text-[10px] font-bold text-[#ff003c] bg-[#ff003c]/10 border border-[#ff003c]/30 px-2 py-0.5 uppercase">
                      [ ROLE ASSIGNED ]
                    </span>
                  )}
                </div>
                <h2 className="font-bold text-xl sm:text-2xl text-white uppercase tracking-wider">
                  {myPlayerName}
                </h2>
              </div>

              <div className="bg-[#08090b] border border-[#fcee0a]/40 px-4 py-2 text-center shrink-0">
                <div className="text-[10px] uppercase font-bold text-[#7d8799] tracking-wider">ROOM CODE</div>
                <div className="font-mono text-xl sm:text-2xl font-bold text-[#fcee0a] tracking-widest">
                  {formattedCode}
                </div>
              </div>
            </div>

            {/* Status Callout */}
            <div className="mt-4 p-3 bg-[#08090b] border border-[#fcee0a]/20 flex items-center justify-between gap-3 font-mono">
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-[#fcee0a] shrink-0" />
                <div className="text-xs text-stone-300">
                  <p>
                    {isGameStarted
                      ? myStatus === 'Killed'
                        ? 'You have been killed. Please observe the code of silence.'
                        : myRole
                        ? 'Role assigned • Keep your phone screen hidden from others.'
                        : 'Game in progress • Follow the moderator\'s instructions.'
                      : 'Lobby ready • Waiting for game to start.'}
                  </p>
                </div>
              </div>

              {myRole && (
                <div className="text-right shrink-0">
                  <span className="text-[10px] uppercase text-[#7d8799] block font-bold">STATUS</span>
                  <span className={`text-xs font-bold uppercase ${myStatus === 'Killed' ? 'text-[#ff003c] line-through' : 'text-[#00ff9f]'}`}>
                    [ {myStatus} ]
                  </span>
                </div>
              )}
            </div>

            {/* Dedicated Private Role Dossier Strip */}
            {myRole && isGameStarted && (
              <div className="mt-4 p-4 hud-cut-sm bg-[#141824] border-2 border-[#fcee0a] flex items-center justify-between shadow-[0_0_15px_rgba(252,238,10,0.15)] font-mono">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 bg-[#fcee0a] animate-pulse" />
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-[#7d8799] block font-bold">
                      YOUR SECRET ROLE:
                    </span>
                    <span className="text-lg sm:text-xl font-bold uppercase tracking-wider text-[#fcee0a]">
                      {myRole}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-black border border-[#fcee0a] px-2 py-0.5 bg-[#fcee0a] uppercase">
                  [ SECRET ]
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Two-Phone Mode: Direct Player Entry in Lobby */}
      {isTwoPhoneMode && !isGameStarted && (
        <div className="bg-[#101216] hud-cut border border-[#fcee0a]/30 p-5 font-mono">
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-[#fcee0a]/20">
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-[#fcee0a]" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-white">
                ADD PLAYER TO ROOM
              </h3>
            </div>
            <span className="text-[10px] text-[#7d8799] uppercase font-bold">
              Pass phone to next player after adding
            </span>
          </div>

          {addPlayerError && (
            <p className="text-xs text-[#ff003c] bg-[#ff003c]/10 border border-[#ff003c]/30 px-3 py-2 mb-3 font-bold uppercase">
              {addPlayerError}
            </p>
          )}

          <form onSubmit={handleAddPlayer} className="flex gap-2">
            <input
              type="text"
              maxLength={20}
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              placeholder="ENTER PLAYER NAME..."
              className="flex-1 px-3.5 py-2 bg-[#08090b] border border-[#fcee0a]/30 text-[#fcee0a] text-xs uppercase placeholder:text-stone-600 focus:outline-none focus:border-[#fcee0a]"
            />
            <button
              type="submit"
              disabled={isAddingPlayer || !newPlayerName.trim()}
              className="hud-btn hud-btn-primary px-4 py-2 text-xs disabled:opacity-40 flex items-center gap-1.5 shrink-0"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{isAddingPlayer ? '[ ADDING... ]' : '[ + ADD PLAYER ]'}</span>
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
      <div className="pt-2 flex justify-start font-mono">
        <button
          onClick={handleLeave}
          className="hud-btn hud-btn-danger px-4 py-2 text-xs flex items-center gap-2"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>{isTwoPhoneMode ? '[ DISCONNECT DEVICE ]' : '[ LEAVE ROOM ]'}</span>
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
