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
          <p className="mt-1 text-stone-500">Eliminated casualties will be archived in the round history above.</p>
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
          <p>Are you sure you want to remove <strong className="text-black font-black">{playerName}</strong> from the room?</p>
          <p className="mt-1 text-stone-500">They will be disconnected and removed from the lobby manifest.</p>
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
          <p className="mt-1 text-stone-500">Roles and round history will be reset, but all connected players will remain in the room.</p>
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
          <p className="mt-1 text-stone-500">All connected players will be disconnected and this room session will end.</p>
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
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <Loader2 className="w-8 h-8 text-red-500 animate-spin mx-auto mb-4" />
        <p className="text-sm font-semibold text-stone-200">Reconnecting to Moderator Dashboard...</p>
      </div>
    );
  }

  if (errorNotice || (!isModerator && !roomState)) {
    return (
      <div className="max-w-md mx-auto px-4 py-12">
        <div className="portal-module text-center p-6 sm:p-8">
          <div className="w-12 h-12 bg-[#800000] border-2 border-black flex items-center justify-center text-white mx-auto mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="font-mono font-black text-xl text-black uppercase mb-2">Access Denied</h3>
          <p className="text-xs text-stone-600 mb-6 font-mono">{errorNotice || 'Moderator session not found.'}</p>
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

  const players = roomState?.players || [];
  const playerCount = players.length;
  const isGameStarted = roomState?.status === 'in_game';
  const currentRound = roomState?.round || 1;
  const isTwoPhoneMode = roomState?.gameMode === 'two_phone';

  return (
    <div className="max-w-4xl mx-auto px-3.5 sm:px-6 py-4 sm:py-6 space-y-4 font-sans">
      {/* Universal Popups */}
      <Popups />

      {/* Voting Modal */}
      <VotingModal />

      {/* Toast Notification when role is sent to shared phone */}
      {revealSuccessNotice && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-3.5 py-2 bg-emerald-100 border-2 border-black text-black text-xs font-bold shadow-[2px_2px_0px_#000000] flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-emerald-800" />
          <span>{revealSuccessNotice}</span>
        </div>
      )}

      {/* Moderator Header Module */}
      <div className="border-2 border-black bg-white shadow-[2px_2px_0px_#000000]">
        <div className="bg-[#800000] text-white px-3 py-1.5 font-bold text-xs uppercase tracking-wider border-b-2 border-black flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="bg-black text-white px-1.5 py-0.5 text-[10px] font-mono">MOD CONSOLE</span>
            {isTwoPhoneMode ? (
              <span className="bg-amber-300 text-black px-1.5 py-0.5 text-[10px] font-bold flex items-center gap-1">
                <Smartphone className="w-3 h-3" />
                <span>TWO-PHONE</span>
              </span>
            ) : (
              <span className="bg-white text-black px-1.5 py-0.5 text-[10px] font-bold">
                MULTI-PHONE
              </span>
            )}
          </div>
          {isGameStarted && (
            <span className="bg-black text-amber-300 px-1.5 py-0.5 font-mono text-[10px]">
              ROUND {currentRound}
            </span>
          )}
        </div>

        <div className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b-2 border-black">
            <div>
              <h2 className="font-black text-xl sm:text-2xl text-black tracking-wide uppercase">
                {isGameStarted ? 'NIGHT & DAY CONTROL STATION' : 'GAME LOBBY & MANIFEST'}
              </h2>
              <p className="text-xs text-stone-600 mt-0.5 uppercase tracking-wider">
                {isGameStarted
                  ? 'Manage night-phase actions, status tags, and day accusations'
                  : 'Assign roles to players, then start Round 1'}
              </p>
            </div>

            {/* Room Code display */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="bg-[#f0ede5] border-2 border-black px-3 py-1.5 text-center shadow-[1px_1px_0px_#000000]">
                <div className="text-[9px] uppercase font-bold text-black">ROOM CODE</div>
                <div className="font-mono text-xl sm:text-2xl font-black text-[#800000] tracking-widest">
                  {formattedCode}
                </div>
              </div>

              <button
                onClick={() => setShowQR(true)}
                className="p-2.5 bg-[#f0ede5] hover:bg-white text-black border-2 border-black shadow-[1px_1px_0px_#000000] active:translate-y-px transition-colors"
                title="Show QR Code"
              >
                <QrCode className="w-5 h-5 text-[#800000]" />
              </button>
            </div>
          </div>

          {/* Share Link Actions */}
          <div className="mt-3 flex flex-col sm:flex-row items-center gap-2">
            <div className="w-full flex-1 px-3 py-1.5 bg-stone-50 border-2 border-black text-xs font-mono text-black truncate select-all">
              {joinUrl}
            </div>

            <button
              onClick={handleCopyLink}
              className="retro-btn retro-btn-secondary w-full sm:w-auto shadow-[1px_1px_0px_#000000] whitespace-nowrap"
            >
              {copiedLink ? (
                <>
                  <Check className="w-4 h-4 text-emerald-700" />
                  <span className="text-emerald-800 font-bold">Link Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-black" />
                  <span>Copy Join Link</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Moderator Quick Reference (Collapsible Accordion) */}
      <div className="border-2 border-black bg-white shadow-[2px_2px_0px_#000000] overflow-hidden">
        <button
          type="button"
          onClick={() => setShowQuickRef(!showQuickRef)}
          className="w-full p-2.5 flex items-center justify-between gap-2 text-left bg-[#f0ede5] hover:bg-white transition-colors border-b-2 border-black"
        >
          <div className="flex items-center gap-2">
            <div className="p-1 bg-white border border-black text-[#800000] shrink-0">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs font-bold text-black uppercase tracking-wider">
                  MODERATOR QUICK REFERENCE
                </h4>
                <span className="text-[10px] font-mono text-stone-600 uppercase">
                  [STATUSES & LOOP]
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[11px] font-bold text-black uppercase hidden sm:inline">
              {showQuickRef ? '[-] HIDE' : '[+] EXPAND'}
            </span>
            {showQuickRef ? (
              <ChevronUp className="w-4 h-4 text-black" />
            ) : (
              <ChevronDown className="w-4 h-4 text-black" />
            )}
          </div>
        </button>

        {showQuickRef && (
          <div className="p-3.5 space-y-3 text-xs bg-white text-black">
            {/* Status Toggles Breakdown */}
            <div>
              <p className="font-mono text-[11px] uppercase tracking-wider font-bold text-[#800000] mb-1.5">
                PLAYER STATUS VALUES (TAP CARD IN ROSTER TO TOGGLE):
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="p-2 border border-black bg-emerald-50 flex items-start gap-2">
                  <span className="w-3 h-3 bg-emerald-600 border border-black mt-0.5 shrink-0" />
                  <div>
                    <strong className="text-black uppercase">Alive:</strong> Default in-game citizen.
                  </div>
                </div>
                <div className="p-2 border border-black bg-[#d8d8d8] flex items-start gap-2">
                  <Skull className="w-3.5 h-3.5 text-stone-800 mt-0.5 shrink-0" />
                  <div>
                    <strong className="text-black uppercase">Killed:</strong> Eliminated casualty; silent.
                  </div>
                </div>
                <div className="p-2 border border-black bg-green-100 flex items-start gap-2">
                  <Heart className="w-3.5 h-3.5 text-green-700 mt-0.5 shrink-0" />
                  <div>
                    <strong className="text-black uppercase">Saved:</strong> Protected by Doctor this round.
                  </div>
                </div>
                <div className="p-2 border border-black bg-indigo-50 flex items-start gap-2">
                  <Search className="w-3.5 h-3.5 text-indigo-700 mt-0.5 shrink-0" />
                  <div>
                    <strong className="text-black uppercase">Detected:</strong> Investigated Mafia (mod only).
                  </div>
                </div>
              </div>
            </div>

            {/* Game Flow & Loop */}
            <div className="p-2.5 bg-stone-50 border border-black space-y-1.5">
              <p className="font-mono text-[11px] uppercase tracking-wider font-bold text-black">
                CORE GAME FLOW:
              </p>
              <ul className="space-y-1 text-black list-disc list-inside text-[11px]">
                <li>
                  <strong className="uppercase">Night Phase:</strong> Call roles, apply Saved/Killed/Detected.
                </li>
                <li>
                  <strong className="uppercase">Start Day Vote:</strong> Pushes live accusation ballots to alive players. Ties re-vote.
                </li>
                <li>
                  <strong className="uppercase">Advance Round:</strong> Archives previous casualties and starts next round.
                </li>
                <li>
                  <strong className="uppercase">Play Again:</strong> Resets all roles and rounds without kicking players.
                </li>
              </ul>
            </div>

            {/* Button to open full modal */}
            <div className="flex justify-end pt-0.5">
              <button
                type="button"
                onClick={() => setShowHelpModal(true)}
                className="text-[11px] text-[#800000] hover:underline font-bold uppercase inline-flex items-center gap-1"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Open Complete Field Manual &raquo;</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Two-Phone Direct Player Addition Bar */}
      {isTwoPhoneMode && (
        <div className="border-2 border-black bg-white p-3 shadow-[2px_2px_0px_#000000] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-[#f0ede5] border border-black text-[#800000] shrink-0">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-black uppercase tracking-wide">
                ADD PLAYER TO ROSTER DIRECTLY
              </h4>
              <p className="text-[10px] text-stone-600">
                Enter name here or let players enter on the shared pass-around phone.
              </p>
            </div>
          </div>

          <form onSubmit={handleAddPlayer} className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              maxLength={20}
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              placeholder="Player Name (e.g. Vito)"
              className="flex-1 sm:w-44 px-2.5 py-1.5 bg-white border-2 border-black text-black font-bold text-xs placeholder:text-stone-400 focus:outline-none focus:bg-yellow-50 uppercase"
            />
            <button
              type="submit"
              disabled={!newPlayerName.trim() || isAddingPlayer}
              className="retro-btn retro-btn-primary shadow-[1px_1px_0px_#000000] disabled:opacity-50 whitespace-nowrap"
            >
              {isAddingPlayer ? 'Adding...' : '+ ADD'}
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
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <button
          onClick={handleLeaveRoom}
          className="retro-btn retro-btn-secondary w-full sm:w-auto shadow-[1px_1px_0px_#000000]"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Exit / End Room</span>
        </button>

        {!isGameStarted ? (
          <button
            onClick={handleStartGame}
            disabled={playerCount === 0}
            className="retro-btn retro-btn-primary w-full sm:w-auto py-2.5 px-5 shadow-[1px_1px_0px_#000000] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="w-4 h-4" />
            <span>Start Game (Round 1)</span>
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {roomState?.winner ? (
              <button
                onClick={handlePlayAgain}
                className="retro-btn bg-emerald-200 hover:bg-emerald-300 text-black border-2 border-black py-2.5 px-4 shadow-[1px_1px_0px_#000000]"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Play Again (Reset)</span>
              </button>
            ) : null}

            {/* Start Day Vote button */}
            <button
              onClick={handleStartVote}
              disabled={activeVote?.isOpen || !!roomState?.winner}
              className="retro-btn retro-btn-primary py-2.5 px-4 shadow-[1px_1px_0px_#000000] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Vote className="w-4 h-4" />
              <span>{activeVote?.isOpen ? 'Vote In Progress...' : 'Start Day Vote'}</span>
            </button>

            {/* Advance to next round button */}
            <button
              onClick={handleAdvanceRound}
              disabled={!!roomState?.winner}
              className="retro-btn bg-amber-200 hover:bg-amber-300 text-black border-2 border-black py-2.5 px-4 shadow-[1px_1px_0px_#000000] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FastForward className="w-4 h-4" />
              <span>Advance Round {currentRound + 1}</span>
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
