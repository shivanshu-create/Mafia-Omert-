import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { storage } from '../utils/storage';
import { TrainScheduleBoard } from '../components/TrainScheduleBoard';
import { StatusSelectorModal } from '../components/StatusSelectorModal';
import { QRCodeModal } from '../components/QRCodeModal';
import { VotingModal } from '../components/VotingModal';
import { Popups } from '../components/Popups';
import { HowToPlayModal } from '../components/HowToPlayModal';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { PlayerStatus, PublicPlayer, Role } from '../types';
import {
  QrCode,
  Copy,
  Check,
  Play,
  LogOut,
  AlertTriangle,
  Loader2,
  FastForward,
  Vote,
  RotateCcw,
  Smartphone,
  UserPlus,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Heart,
  Skull,
  Search,
  Shield,
} from 'lucide-react';

export const ModeratorLobby: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const {
    roomState,
    isModerator,
    buildJoinUrl,
    kickPlayer,
    leaveRoom,
    attemptSilentReconnect,
    startGame,
    assignRole,
    revealRoleToShared,
    addPlayerDirectly,
    setPlayerStatus,
    advanceRound,
    startVote,
    activeVote,
    playAgain,
  } = useSocket();

  const [showQR, setShowQR] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [isAddingPlayer, setIsAddingPlayer] = useState(false);
  const [revealSuccessNotice, setRevealSuccessNotice] = useState<string | null>(null);
  const [showQuickRef, setShowQuickRef] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Status Modal State
  const [selectedPlayerForStatus, setSelectedPlayerForStatus] = useState<PublicPlayer | null>(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

  // Destructive Action Confirmation Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: React.ReactNode;
    confirmLabel: string;
    cancelLabel?: string;
    confirmVariant?: 'danger' | 'warning' | 'primary';
    onConfirm: () => Promise<void> | void;
  } | null>(null);
  const [isConfirmingAction, setIsConfirmingAction] = useState(false);

  const formattedCode = (code || '').trim().toUpperCase();
  const joinUrl = buildJoinUrl(formattedCode);

  useEffect(() => {
    let mounted = true;

    async function verifyModerator() {
      const modSession = storage.getModeratorSession();
      if (!modSession || modSession.roomCode !== formattedCode) {
        setIsVerifying(false);
        setErrorNotice('You do not have active moderator access for this room.');
        return;
      }

      const reconnected = await attemptSilentReconnect();
      if (!mounted) return;

      setIsVerifying(false);
      if (!reconnected) {
        setErrorNotice('Moderator session expired or room no longer exists.');
      }
    }

    verifyModerator();

    return () => {
      mounted = false;
    };
  }, [formattedCode, attemptSilentReconnect]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleStartGame = async () => {
    const result = await startGame();
    if (!result.success) {
      alert(result.error || 'Failed to start game');
    }
  };

  const handleAdvanceRound = () => {
    const nextRound = (roomState?.round || 1) + 1;
    setConfirmDialog({
      title: `Advance to Round ${nextRound}?`,
      message: (
        <div>
          <p>Advance the game to Round {nextRound}?</p>
          <p className="mt-1 text-stone-400">Eliminated casualties will be archived in the round history above.</p>
        </div>
      ),
      confirmLabel: `Advance Round`,
      cancelLabel: 'Cancel',
      confirmVariant: 'warning',
      onConfirm: async () => {
        setIsConfirmingAction(true);
        const result = await advanceRound();
        setIsConfirmingAction(false);
        setConfirmDialog(null);
        if (!result.success) {
          alert(result.error || 'Failed to advance round');
        }
      },
    });
  };

  const handleStartVote = async () => {
    const result = await startVote();
    if (!result.success) {
      alert(result.error || 'Failed to start vote');
    }
  };

  const handleRoleChange = async (playerId: string, role: Role | null) => {
    await assignRole(playerId, role);
  };

  const handleRevealOnShared = async (playerId: string) => {
    const target = players.find((p) => p.id === playerId);
    const result = await revealRoleToShared(playerId);
    if (result.success) {
      setRevealSuccessNotice(`Secret role for "${target?.name || 'player'}" sent to shared phone!`);
      setTimeout(() => setRevealSuccessNotice(null), 3000);
    } else {
      alert(result.error || 'Failed to reveal role on shared phone');
    }
  };

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newPlayerName.trim();
    if (!clean || isAddingPlayer) return;

    setIsAddingPlayer(true);
    const result = await addPlayerDirectly(clean);
    setIsAddingPlayer(false);

    if (result.success) {
      setNewPlayerName('');
    } else {
      alert(result.error || 'Failed to add player');
    }
  };

  const handleOpenStatusModal = (player: PublicPlayer) => {
    setSelectedPlayerForStatus(player);
    setIsStatusModalOpen(true);
  };

  const handleSelectStatus = async (playerId: string, status: PlayerStatus) => {
    await setPlayerStatus(playerId, status);
  };

  const handleKick = (playerId: string) => {
    const player = (roomState?.players || []).find((p) => p.id === playerId);
    const playerName = player?.name || 'this player';

    setConfirmDialog({
      title: `Remove ${playerName}?`,
      message: (
        <div>
          <p>Are you sure you want to remove <strong className="text-white font-semibold">{playerName}</strong> from the room?</p>
          <p className="mt-1 text-stone-400">They will be disconnected and removed from the lobby roster.</p>
        </div>
      ),
      confirmLabel: `Remove ${playerName}`,
      cancelLabel: 'Cancel',
      confirmVariant: 'danger',
      onConfirm: async () => {
        setIsConfirmingAction(true);
        const result = await kickPlayer(playerId);
        setIsConfirmingAction(false);
        setConfirmDialog(null);
        if (!result.success) {
          alert(result.error || 'Failed to kick player');
        }
      },
    });
  };

  const handlePlayAgain = () => {
    setConfirmDialog({
      title: 'Reset & Play Again?',
      message: (
        <div>
          <p>Start a new game with the current players?</p>
          <p className="mt-1 text-stone-400">Roles and round history will be reset, but all connected players will remain in the room.</p>
        </div>
      ),
      confirmLabel: 'Reset Game',
      cancelLabel: 'Cancel',
      confirmVariant: 'primary',
      onConfirm: async () => {
        setIsConfirmingAction(true);
        const result = await playAgain();
        setIsConfirmingAction(false);
        setConfirmDialog(null);
        if (!result.success) {
          alert(result.error || 'Failed to reset game');
        }
      },
    });
  };

  const handleLeaveRoom = () => {
    setConfirmDialog({
      title: 'Exit / End Room?',
      message: (
        <div>
          <p>Are you sure you want to exit and close this game lobby?</p>
          <p className="mt-1 text-stone-400">All connected players will be disconnected and this room session will end.</p>
        </div>
      ),
      confirmLabel: 'Exit Room',
      cancelLabel: 'Cancel',
      confirmVariant: 'danger',
      onConfirm: async () => {
        setIsConfirmingAction(true);
        await leaveRoom();
        setIsConfirmingAction(false);
        setConfirmDialog(null);
        navigate('/');
      },
    });
  };

  if (isVerifying) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center font-mono">
        <Loader2 className="w-8 h-8 text-[#fcee0a] animate-spin mx-auto mb-4" />
        <p className="text-xs font-bold uppercase tracking-wider text-stone-300">Reconnecting to moderator view...</p>
      </div>
    );
  }

  if (errorNotice || (!isModerator && !roomState)) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 font-mono">
        <div className="bg-[#101216] hud-cut border border-[#ff003c] p-6 sm:p-8 text-center shadow-[0_0_35px_rgba(255,0,60,0.2)] animate-hud-modal-snap">
          <div className="w-12 h-12 bg-[#ff003c]/20 border border-[#ff003c] flex items-center justify-center text-[#ff003c] mx-auto mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-lg text-[#ff003c] mb-2 uppercase tracking-wider">[ ROOM NOT FOUND ]</h3>
          <p className="text-xs text-stone-400 mb-6 leading-relaxed font-mono uppercase">{errorNotice || 'Moderator session expired or disconnected.'}</p>
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

  const players = roomState?.players || [];
  const playerCount = players.length;
  const isGameStarted = roomState?.status === 'in_game';
  const currentRound = roomState?.round || 1;
  const isTwoPhoneMode = roomState?.gameMode === 'two_phone';

  return (
    <div className="max-w-4xl mx-auto px-3.5 sm:px-6 py-4 sm:py-6 space-y-4 font-mono">
      {/* Universal Popups */}
      <Popups />

      {/* Voting Modal */}
      <VotingModal />

      {/* Toast Notification when role is sent to shared phone */}
      {revealSuccessNotice && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 bg-[#101216] border border-[#00ff9f] text-[#00ff9f] text-xs font-bold hud-cut shadow-2xl flex items-center gap-2.5 animate-hud-modal-snap uppercase tracking-wider">
          <Smartphone className="w-4 h-4 text-[#00ff9f]" />
          <span>// {revealSuccessNotice}</span>
        </div>
      )}

      {/* Moderator Header Module */}
      <div className="bg-[#101216] hud-cut border border-[#fcee0a]/30 overflow-hidden">
        <div className="bg-[#0c0e12] border-b border-[#fcee0a]/20 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="bg-[#fcee0a] text-black px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">[ MODERATOR ]</span>
            {isTwoPhoneMode ? (
              <span className="bg-[#08090b] text-[#fcee0a] border border-[#fcee0a]/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <Smartphone className="w-3" />
                <span>[ TWO-PHONE ]</span>
              </span>
            ) : (
              <span className="bg-[#08090b] text-[#7d8799] border border-stone-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                [ MULTI-PHONE ]
              </span>
            )}
          </div>
          {isGameStarted && (
            <span className="bg-[#ff003c]/20 text-[#ff003c] border border-[#ff003c]/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
              [ ROUND {currentRound} ]
            </span>
          )}
        </div>

        <div className="p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#fcee0a]/20">
            <div>
              <h2 className="font-bold text-xl sm:text-2xl text-white tracking-wider uppercase">
                {isGameStarted ? 'MODERATOR CONTROL STATION' : 'ROOM LOBBY'}
              </h2>
              <p className="text-xs text-[#7d8799] mt-1">
                {isGameStarted
                  ? 'Manage player statuses, role reveals, and day votes'
                  : 'Assign roles before starting Round 1'}
              </p>
            </div>

            {/* Room Code display */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="bg-[#08090b] border border-[#fcee0a]/40 px-4 py-2 text-center">
                <div className="text-[10px] uppercase font-bold text-[#7d8799] tracking-wider">ROOM CODE</div>
                <div className="font-mono text-xl sm:text-2xl font-bold text-[#fcee0a] tracking-widest">
                  {formattedCode}
                </div>
              </div>

              <button
                onClick={() => setShowQR(true)}
                className="p-3 bg-[#08090b] hover:bg-[#141720] text-[#fcee0a] border border-[#fcee0a]/40 transition-none"
                title="Show QR Code"
              >
                <QrCode className="w-5 h-5 text-[#fcee0a]" />
              </button>
            </div>
          </div>

          {/* Share Link Actions */}
          <div className="mt-4 flex flex-col sm:flex-row items-center gap-2.5">
            <div className="w-full flex-1 px-3.5 py-2 bg-[#08090b] border border-[#fcee0a]/30 text-xs font-mono text-[#fcee0a] truncate select-all">
              {joinUrl}
            </div>

            <button
              onClick={handleCopyLink}
              className="hud-btn hud-btn-primary w-full sm:w-auto px-4 py-2 text-xs flex items-center justify-center gap-2 whitespace-nowrap"
            >
              {copiedLink ? (
                <>
                  <Check className="w-4 h-4 text-black" />
                  <span>[ LINK COPIED ]</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-black" />
                  <span>[ COPY JOIN LINK ]</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Moderator Quick Reference (Collapsible Accordion) */}
      <div className="bg-[#101216] hud-cut-sm border border-[#fcee0a]/20 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowQuickRef(!showQuickRef)}
          className="w-full p-3.5 sm:p-4 flex items-center justify-between gap-3 text-left bg-[#0c0e12] hover:bg-[#141720] transition-none"
        >
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-[#08090b] border border-[#fcee0a]/40 text-[#fcee0a] shrink-0">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  MODERATOR QUICK REFERENCE
                </h4>
                <span className="text-[10px] text-[#7d8799] uppercase font-bold">
                  [RULES & ACTIONS]
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 text-[#7d8799]">
            <span className="text-xs font-bold uppercase hidden sm:inline">
              {showQuickRef ? '[ COLLAPSE ]' : '[ EXPAND ]'}
            </span>
            {showQuickRef ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </button>

        {showQuickRef && (
          <div className="p-4 sm:p-5 space-y-4 text-xs bg-[#101216] text-stone-300 border-t border-[#fcee0a]/20 font-mono">
            {/* Status Toggles Breakdown */}
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-[#7d8799] mb-2">
                PLAYER STATUSES (TAP CARD IN ROSTER TO CHANGE):
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-2.5 bg-[#00ff9f]/10 border border-[#00ff9f]/30 flex items-start gap-2.5">
                  <span className="w-2 h-2 bg-[#00ff9f] mt-1 shrink-0" />
                  <div>
                    <strong className="text-[#00ff9f] uppercase">[ ALIVE ]:</strong> Default active state for living players.
                  </div>
                </div>
                <div className="p-2.5 bg-[#ff003c]/10 border border-[#ff003c]/30 flex items-start gap-2.5">
                  <Skull className="w-3.5 h-3.5 text-[#ff003c] mt-0.5 shrink-0" />
                  <div>
                    <strong className="text-[#ff003c] uppercase">[ KILLED ]:</strong> Eliminated player; role is revealed.
                  </div>
                </div>
                <div className="p-2.5 bg-[#00ff9f]/10 border border-[#00ff9f]/30 flex items-start gap-2.5">
                  <Heart className="w-3.5 h-3.5 text-[#00ff9f] mt-0.5 shrink-0" />
                  <div>
                    <strong className="text-[#00ff9f] uppercase">[ SAVED ]:</strong> Protected by Doctor for this round.
                  </div>
                </div>
                <div className="p-2.5 bg-[#00e5ff]/10 border border-[#00e5ff]/30 flex items-start gap-2.5">
                  <Search className="w-3.5 h-3.5 text-[#00e5ff] mt-0.5 shrink-0" />
                  <div>
                    <strong className="text-[#00e5ff] uppercase">[ DETECTED ]:</strong> Found by Detective (visible to moderator only).
                  </div>
                </div>
              </div>
            </div>

            {/* Game Flow & Loop */}
            <div className="p-3.5 bg-[#08090b] border border-[#fcee0a]/20 space-y-2">
              <p className="text-[10px] uppercase tracking-wider font-bold text-[#fcee0a]">
                ROUND SEQUENCE:
              </p>
              <ul className="space-y-1.5 text-stone-300 list-disc list-inside text-xs leading-relaxed">
                <li>
                  <strong className="text-white uppercase">Night Phase:</strong> Call roles, set Saved / Killed / Detected.
                </li>
                <li>
                  <strong className="text-white uppercase">Start Day Vote:</strong> Begin town elimination vote on all phones.
                </li>
                <li>
                  <strong className="text-white uppercase">Advance Round:</strong> Conclude the day and move to the next night phase.
                </li>
                <li>
                  <strong className="text-white uppercase">Play Again:</strong> Resets roles and starts a new game at Round 1.
                </li>
              </ul>
            </div>

            {/* Button to open full modal */}
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setShowHelpModal(true)}
                className="text-xs text-[#fcee0a] hover:text-white font-bold uppercase inline-flex items-center gap-1.5 transition-none"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>[ OPEN RULES & GUIDE &raquo; ]</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Two-Phone Direct Player Addition Bar */}
      {isTwoPhoneMode && (
        <div className="bg-[#101216] hud-cut border border-[#fcee0a]/30 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-[#08090b] border border-[#fcee0a]/40 text-[#fcee0a] shrink-0">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                ADD PLAYER DIRECTLY
              </h4>
              <p className="text-[10px] text-[#7d8799]">
                Enter player name or have them join from their phone.
              </p>
            </div>
          </div>

          <form onSubmit={handleAddPlayer} className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              maxLength={20}
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              placeholder="PLAYER NAME"
              className="flex-1 sm:w-48 px-3.5 py-2 bg-[#08090b] border border-[#fcee0a]/30 text-[#fcee0a] text-xs uppercase placeholder:text-stone-600 focus:outline-none focus:border-[#fcee0a]"
            />
            <button
              type="submit"
              disabled={!newPlayerName.trim() || isAddingPlayer}
              className="hud-btn hud-btn-primary px-4 py-2 text-xs disabled:opacity-40 whitespace-nowrap"
            >
              {isAddingPlayer ? '[ ADDING... ]' : '[ + ADD PLAYER ]'}
            </button>
          </form>
        </div>
      )}

      {/* Train Schedule Live Board with multi-round history */}
      <TrainScheduleBoard
        rounds={roomState?.rounds}
        players={players}
        currentRound={currentRound}
        roomCode={formattedCode}
        isModerator={true}
        isTwoPhoneMode={isTwoPhoneMode}
        onRoleChange={handleRoleChange}
        onRevealOnShared={handleRevealOnShared}
        onOpenStatusModal={handleOpenStatusModal}
        onKick={handleKick}
      />

      {/* Moderator Action Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 font-mono">
        <button
          onClick={handleLeaveRoom}
          className="hud-btn hud-btn-danger px-4 py-2.5 text-xs flex items-center justify-center gap-2 w-full sm:w-auto"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>[ EXIT ROOM ]</span>
        </button>

        {!isGameStarted ? (
          <button
            onClick={handleStartGame}
            disabled={playerCount === 0}
            className="hud-btn hud-btn-primary w-full sm:w-auto py-2.5 px-6 text-xs disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4" />
            <span>[ START GAME (ROUND 1) ]</span>
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            {roomState?.winner ? (
              <button
                onClick={handlePlayAgain}
                className="hud-btn hud-btn-primary px-4 py-2.5 text-xs flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>[ PLAY AGAIN (RESET) ]</span>
              </button>
            ) : null}

            {/* Start Day Vote button */}
            <button
              onClick={handleStartVote}
              disabled={activeVote?.isOpen || !!roomState?.winner}
              className="hud-btn hud-btn-primary px-4 py-2.5 text-xs disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Vote className="w-4 h-4" />
              <span>{activeVote?.isOpen ? '[ VOTE IN PROGRESS... ]' : '[ START DAY VOTE ]'}</span>
            </button>

            {/* Advance to next round button */}
            <button
              onClick={handleAdvanceRound}
              disabled={!!roomState?.winner}
              className="hud-btn hud-btn-secondary px-4 py-2.5 text-xs disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <FastForward className="w-4 h-4" />
              <span>[ ADVANCE TO ROUND {currentRound + 1} ]</span>
            </button>
          </div>
        )}
      </div>

      {/* Status Selector Modal */}
      <StatusSelectorModal
        player={selectedPlayerForStatus}
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        onSelectStatus={handleSelectStatus}
      />

      {/* QR Code Modal */}
      <QRCodeModal
        roomCode={formattedCode}
        joinUrl={joinUrl}
        isOpen={showQR}
        onClose={() => setShowQR(false)}
      />

      {/* How to Play / Moderator Guide Modal */}
      <HowToPlayModal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
        defaultTab="moderator"
      />

      {/* Confirmation Modal for Destructive Moderator Actions */}
      <ConfirmationModal
        isOpen={!!confirmDialog}
        title={confirmDialog?.title || ''}
        message={confirmDialog?.message}
        confirmLabel={confirmDialog?.confirmLabel || 'Confirm'}
        cancelLabel={confirmDialog?.cancelLabel || 'Cancel'}
        confirmVariant={confirmDialog?.confirmVariant || 'danger'}
        isConfirming={isConfirmingAction}
        onConfirm={confirmDialog?.onConfirm || (() => {})}
        onCancel={() => {
          if (!isConfirmingAction) setConfirmDialog(null);
        }}
      />
    </div>
  );
};
