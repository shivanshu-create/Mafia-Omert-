import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { ActiveVoteState, GameMode, PlayerStatus, PublicPlayer, PublicRoomState, Role } from '../types';
import { storage } from '../utils/storage';
import { fetchServerConfig, getBaseUrl, buildJoinUrl, subscribeBaseUrl } from '../utils/config';

interface RoleRevealedPayload {
  playerId: string;
  playerName: string;
  role: Role | null;
}

interface GameOverPayload {
  winner: 'Town' | 'Mafia';
  reason: string;
}

interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
  isReconnecting: boolean;
  roomState: PublicRoomState | null;
  currentPlayer: PublicPlayer | null;
  isModerator: boolean;
  baseUrl: string;
  buildJoinUrl: (roomCode: string, reconnectToken?: string | null) => string;
  kickedReason: string | null;
  selfKilledNotice: string | null;
  roleRevealedNotice: RoleRevealedPayload | null;
  gameOverNotice: GameOverPayload | null;
  activeVote: ActiveVoteState | null;
  sharedRoleRevealNotice: { playerId: string; playerName: string; role: Role | null } | null;
  createRoom: (gameMode?: GameMode) => Promise<{ success: boolean; roomCode?: string; error?: string }>;
  validateRoom: (code: string) => Promise<{ valid: boolean; error?: string; gameMode?: GameMode; isConnectionError?: boolean }>;
  joinRoom: (code: string, name: string) => Promise<{ success: boolean; error?: string }>;
  joinSharedRoom: (code: string) => Promise<{ success: boolean; error?: string }>;
  addPlayerDirectly: (playerName: string) => Promise<{ success: boolean; player?: PublicPlayer; error?: string }>;
  kickPlayer: (playerId: string) => Promise<{ success: boolean; error?: string }>;
  startGame: () => Promise<{ success: boolean; error?: string }>;
  assignRole: (playerId: string, role: Role | null) => Promise<{ success: boolean; error?: string }>;
  revealRoleToShared: (playerId: string) => Promise<{ success: boolean; error?: string }>;
  clearSharedRoleReveal: () => Promise<{ success: boolean }>;
  setPlayerStatus: (playerId: string, status: PlayerStatus) => Promise<{ success: boolean; error?: string }>;
  togglePlayerAlive: (playerId: string, isAlive: boolean) => Promise<{ success: boolean; error?: string }>;
  advanceRound: () => Promise<{ success: boolean; error?: string }>;
  startVote: () => Promise<{ success: boolean; error?: string }>;
  castVote: (candidateId: string) => Promise<{ success: boolean; error?: string }>;
  castSharedVote: (voterId: string, candidateId: string) => Promise<{ success: boolean; error?: string }>;
  cancelVote: () => Promise<{ success: boolean; error?: string }>;
  playAgain: () => Promise<{ success: boolean; error?: string }>;
  leaveRoom: () => Promise<{ success: boolean }>;
  clearKickedReason: () => void;
  dismissSelfKilledNotice: () => void;
  dismissRoleRevealedNotice: () => void;
  dismissGameOverNotice: () => void;
  dismissSharedRoleReveal: () => void;
  attemptSilentReconnect: () => Promise<boolean>;
  reconnectWithToken: (roomCode: string, token: string) => Promise<boolean>;
  waitForConnection: (timeoutMs?: number) => Promise<boolean>;
}

const SocketContext = createContext<SocketContextValue | null>(null);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [roomState, setRoomState] = useState<PublicRoomState | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<PublicPlayer | null>(null);
  const [isModerator, setIsModerator] = useState(false);
  const [kickedReason, setKickedReason] = useState<string | null>(null);

  // Popup / Notification States
  const [selfKilledNotice, setSelfKilledNotice] = useState<string | null>(null);
  const [roleRevealedNotice, setRoleRevealedNotice] = useState<RoleRevealedPayload | null>(null);
  const [gameOverNotice, setGameOverNotice] = useState<GameOverPayload | null>(null);
  const [activeVote, setActiveVote] = useState<ActiveVoteState | null>(null);
  const [sharedRoleRevealNotice, setSharedRoleRevealNotice] = useState<{
    playerId: string;
    playerName: string;
    role: Role | null;
  } | null>(null);

  const [baseUrl, setBaseUrl] = useState<string>(getBaseUrl());
  const socketRef = useRef<Socket | null>(null);
  const playerTokenRef = useRef<string | null>(null);

  useEffect(() => {
    // Subscribe to base URL updates when runtime server config is fetched
    const unsubscribe = subscribeBaseUrl((newBase) => {
      setBaseUrl(newBase);
    });

    fetchServerConfig()
      .then((url) => setBaseUrl(url))
      .catch(() => {});

    const socketInstance: Socket = io({
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      transports: ['polling', 'websocket'],
    });

    socketRef.current = socketInstance;
    setSocket(socketInstance);

    socketInstance.on('connect', () => {
      setIsConnected(true);
      silentReconnect(socketInstance);
    });

    socketInstance.on('connect_error', () => {
      setIsConnected(false);
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
    });

    socketInstance.on('room:state', (updatedState: PublicRoomState) => {
      setRoomState(updatedState);
      setActiveVote(updatedState.activeVote || null);
      if (updatedState.winner) {
        setGameOverNotice({
          winner: updatedState.winner,
          reason:
            updatedState.winner === 'Town'
              ? 'All Mafia members have been eliminated! Town wins!'
              : 'The Mafia has overrun the town! Mafia wins!',
        });
      } else {
        // If winner is cleared (Play Again), clear gameOverNotice
        setGameOverNotice(null);
      }
    });

    socketInstance.on('player:role_updated', (payload: { role: Role | null }) => {
      setCurrentPlayer((prev) => (prev ? { ...prev, role: payload.role } : null));
    });

    socketInstance.on('shared:show_role_reveal', (payload: { playerId: string; playerName: string; role: Role | null }) => {
      setSharedRoleRevealNotice(payload);
    });

    socketInstance.on('shared:clear_role_reveal', () => {
      setSharedRoleRevealNotice(null);
    });

    socketInstance.on('vote:started', (voteState: ActiveVoteState) => {
      setActiveVote(voteState);
    });

    socketInstance.on('vote:updated', (voteState: ActiveVoteState) => {
      setActiveVote(voteState);
    });

    socketInstance.on('vote:tie_break', (payload: { tiedCandidates: string[]; activeVote: ActiveVoteState }) => {
      setActiveVote(payload.activeVote);
    });

    socketInstance.on('vote:resolved', () => {
      setActiveVote(null);
    });

    socketInstance.on('player:killed_notification', (payload: { message: string }) => {
      setSelfKilledNotice(payload.message || 'You have been killed! You cannot act in upcoming rounds.');
    });

    socketInstance.on('game:role_revealed', (payload: RoleRevealedPayload) => {
      setRoleRevealedNotice(payload);
    });

    socketInstance.on('game:ended', (payload: GameOverPayload) => {
      setGameOverNotice(payload);
    });

    socketInstance.on('player:kicked', (payload: { reason: string }) => {
      setKickedReason(payload.reason || 'You have been removed from the lobby.');
      storage.clearPlayerSession();
      setCurrentPlayer(null);
      setRoomState(null);
      setIsModerator(false);
    });

    socketInstance.on('room:closed', (payload: { reason: string }) => {
      setKickedReason(payload.reason || 'The room has been closed.');
      storage.clearAllSessions();
      setCurrentPlayer(null);
      setRoomState(null);
      setIsModerator(false);
    });

    return () => {
      unsubscribe();
      socketInstance.disconnect();
    };
  }, []);

  const silentReconnect = async (s: Socket): Promise<boolean> => {
    const modSession = storage.getModeratorSession();
    if (modSession) {
      setIsReconnecting(true);
      return new Promise((resolve) => {
        s.emit(
          'session:reconnect_moderator',
          { roomCode: modSession.roomCode, moderatorToken: modSession.moderatorToken },
          (response: { success: boolean; roomState?: PublicRoomState; error?: string }) => {
            setIsReconnecting(false);
            if (response.success && response.roomState) {
              setIsModerator(true);
              setRoomState(response.roomState);
              setActiveVote(response.roomState.activeVote || null);
              resolve(true);
            } else {
              storage.clearModeratorSession();
              setIsModerator(false);
              resolve(false);
            }
          }
        );
      });
    }

    const sharedSession = storage.getSharedSession();
    if (sharedSession) {
      setIsReconnecting(true);
      return new Promise((resolve) => {
        s.emit(
          'room:join_shared',
          { roomCode: sharedSession.roomCode },
          (response: { success: boolean; roomState?: PublicRoomState; error?: string }) => {
            setIsReconnecting(false);
            if (response.success && response.roomState) {
              setIsModerator(false);
              setCurrentPlayer(null);
              setRoomState(response.roomState);
              setActiveVote(response.roomState.activeVote || null);
              resolve(true);
            } else {
              storage.clearSharedSession();
              resolve(false);
            }
          }
        );
      });
    }

    const playerSession = storage.getPlayerSession();
    if (playerSession) {
      setIsReconnecting(true);
      return new Promise((resolve) => {
        s.emit(
          'session:reconnect_player',
          { roomCode: playerSession.roomCode, playerToken: playerSession.playerToken },
          (response: { success: boolean; player?: PublicPlayer; roomState?: PublicRoomState; error?: string }) => {
            setIsReconnecting(false);
            if (response.success && response.player && response.roomState) {
              setIsModerator(false);
              playerTokenRef.current = playerSession.playerToken;
              setCurrentPlayer(response.player);
              setRoomState(response.roomState);
              setActiveVote(response.roomState.activeVote || null);
              resolve(true);
            } else {
              storage.clearPlayerSession();
              playerTokenRef.current = null;
              setCurrentPlayer(null);
              resolve(false);
            }
          }
        );
      });
    }

    return false;
  };

  const attemptSilentReconnect = useCallback(async (): Promise<boolean> => {
    if (!socketRef.current || !socketRef.current.connected) return false;
    return silentReconnect(socketRef.current);
  }, []);

  const reconnectWithToken = useCallback(
    async (roomCode: string, token: string): Promise<boolean> => {
      if (!socketRef.current) return false;
      setIsReconnecting(true);
      return new Promise((resolve) => {
        socketRef.current!.emit(
          'session:reconnect_player',
          { roomCode, playerToken: token },
          (response: { success: boolean; player?: PublicPlayer; roomState?: PublicRoomState; error?: string }) => {
            setIsReconnecting(false);
            if (response.success && response.player && response.roomState) {
              playerTokenRef.current = token;
              storage.clearAllSessions();
              storage.savePlayerSession({
                roomCode,
                playerToken: token,
                playerId: response.player.id,
                playerName: response.player.name,
              });
              setIsModerator(false);
              setCurrentPlayer(response.player);
              setRoomState(response.roomState);
              setActiveVote(response.roomState.activeVote || null);
              resolve(true);
            } else {
              resolve(false);
            }
          }
        );
      });
    },
    []
  );

  const waitForConnection = useCallback((timeoutMs: number = 12000): Promise<boolean> => {
    if (socketRef.current?.connected) {
      return Promise.resolve(true);
    }

    return new Promise((resolve) => {
      let resolved = false;
      let checkInterval: ReturnType<typeof setInterval> | null = null;
      let timer: ReturnType<typeof setTimeout> | null = null;

      const finish = (result: boolean) => {
        if (!resolved) {
          resolved = true;
          if (timer) clearTimeout(timer);
          if (checkInterval) clearInterval(checkInterval);
          if (socketRef.current) {
            socketRef.current.off('connect', onConnect);
          }
          resolve(result);
        }
      };

      const onConnect = () => {
        finish(true);
      };

      timer = setTimeout(() => {
        finish(socketRef.current?.connected ?? false);
      }, timeoutMs);

      // Check every 50ms in case socketRef is being instantiated or connects
      checkInterval = setInterval(() => {
        if (socketRef.current) {
          if (socketRef.current.connected) {
            finish(true);
          } else {
            // Trigger connect if not currently attempting
            if (!socketRef.current.connected && !socketRef.current.active) {
              socketRef.current.connect();
            }
            socketRef.current.off('connect', onConnect);
            socketRef.current.once('connect', onConnect);
          }
        }
      }, 50);

      if (socketRef.current) {
        if (socketRef.current.connected) {
          finish(true);
          return;
        }
        socketRef.current.once('connect', onConnect);
        if (!socketRef.current.connected && !socketRef.current.active) {
          socketRef.current.connect();
        }
      }
    });
  }, []);

  const createRoom = useCallback(
    async (gameMode: GameMode = 'multi_phone') => {
      const connected = await waitForConnection(12000);
      if (!connected || !socketRef.current) {
        return { success: false, error: 'Unable to connect to game server' };
      }

      return new Promise<{ success: boolean; roomCode?: string; error?: string }>((resolve) => {
        const timer = setTimeout(() => {
          resolve({ success: false, error: 'Server request timed out' });
        }, 10000);

        socketRef.current!.emit(
          'room:create',
          { gameMode },
          (response: { success: boolean; roomCode?: string; moderatorToken?: string; error?: string }) => {
            clearTimeout(timer);
            if (response.success && response.roomCode && response.moderatorToken) {
              storage.clearAllSessions();
              storage.saveModeratorSession(response.roomCode, response.moderatorToken);
              setIsModerator(true);
              setCurrentPlayer(null);
              resolve({ success: true, roomCode: response.roomCode });
            } else {
              resolve({ success: false, error: response.error || 'Failed to create room' });
            }
          }
        );
      });
    },
    [waitForConnection]
  );

  const validateRoom = useCallback(
    async (code: string): Promise<{ valid: boolean; error?: string; gameMode?: GameMode; isConnectionError?: boolean }> => {
      const normalizedCode = (code || '').trim().toUpperCase();
      if (!normalizedCode) {
        return { valid: false, error: 'Invalid room code' };
      }

      const connected = await waitForConnection(12000);
      if (!connected || !socketRef.current) {
        return {
          valid: false,
          error: 'Unable to connect to game server',
          isConnectionError: true,
        };
      }

      return new Promise((resolve) => {
        const timer = setTimeout(() => {
          resolve({
            valid: false,
            error: 'Server verification timed out',
            isConnectionError: true,
          });
        }, 10000);

        socketRef.current!.emit(
          'room:validate',
          { roomCode: normalizedCode },
          (response: { valid: boolean; error?: string; gameMode?: GameMode }) => {
            clearTimeout(timer);
            resolve(response);
          }
        );
      });
    },
    [waitForConnection]
  );

  const joinRoom = useCallback(
    async (code: string, name: string) => {
      const connected = await waitForConnection(12000);
      if (!connected || !socketRef.current) {
        return { success: false, error: 'Unable to connect to game server' };
      }

      return new Promise<{ success: boolean; error?: string }>((resolve) => {
        const timer = setTimeout(() => {
          resolve({ success: false, error: 'Server request timed out' });
        }, 10000);

        socketRef.current!.emit(
          'room:join',
          { roomCode: code, playerName: name },
          (response: { success: boolean; roomCode?: string; playerToken?: string; player?: PublicPlayer; error?: string }) => {
            clearTimeout(timer);
            if (response.success && response.roomCode && response.playerToken && response.player) {
              playerTokenRef.current = response.playerToken;
              storage.clearAllSessions();
              storage.savePlayerSession({
                roomCode: response.roomCode,
                playerToken: response.playerToken,
                playerName: response.player.name,
                playerId: response.player.id,
              });
              setIsModerator(false);
              setCurrentPlayer(response.player);
              resolve({ success: true });
            } else {
              resolve({ success: false, error: response.error || 'Failed to join room' });
            }
          }
        );
      });
    },
    [waitForConnection]
  );

  const startGame = useCallback(async () => {
    const modSession = storage.getModeratorSession();
    if (!socketRef.current || !modSession) {
      return { success: false, error: 'Not authorized as moderator' };
    }

    return new Promise<{ success: boolean; error?: string }>((resolve) => {
      socketRef.current!.emit(
        'moderator:start_game',
        { roomCode: modSession.roomCode, moderatorToken: modSession.moderatorToken },
        (response: { success: boolean; error?: string }) => {
          resolve(response || { success: true });
        }
      );
    });
  }, []);

  const assignRole = useCallback(async (playerId: string, role: Role | null) => {
    const modSession = storage.getModeratorSession();
    if (!socketRef.current || !modSession) {
      return { success: false, error: 'Not authorized as moderator' };
    }

    return new Promise<{ success: boolean; error?: string }>((resolve) => {
      socketRef.current!.emit(
        'moderator:assign_role',
        { roomCode: modSession.roomCode, moderatorToken: modSession.moderatorToken, playerId, role },
        (response: { success: boolean; error?: string }) => {
          resolve(response || { success: true });
        }
      );
    });
  }, []);

  const setPlayerStatus = useCallback(async (playerId: string, status: PlayerStatus) => {
    const modSession = storage.getModeratorSession();
    if (!socketRef.current || !modSession) {
      return { success: false, error: 'Not authorized as moderator' };
    }

    return new Promise<{ success: boolean; error?: string }>((resolve) => {
      socketRef.current!.emit(
        'moderator:set_player_status',
        { roomCode: modSession.roomCode, moderatorToken: modSession.moderatorToken, playerId, status },
        (response: { success: boolean; error?: string }) => {
          resolve(response || { success: true });
        }
      );
    });
  }, []);

  const togglePlayerAlive = useCallback(async (playerId: string, isAlive: boolean) => {
    const modSession = storage.getModeratorSession();
    if (!socketRef.current || !modSession) {
      return { success: false, error: 'Not authorized as moderator' };
    }

    return new Promise<{ success: boolean; error?: string }>((resolve) => {
      socketRef.current!.emit(
        'moderator:toggle_player_alive',
        { roomCode: modSession.roomCode, moderatorToken: modSession.moderatorToken, playerId, isAlive },
        (response: { success: boolean; error?: string }) => {
          resolve(response || { success: true });
        }
      );
    });
  }, []);

  const advanceRound = useCallback(async () => {
    const modSession = storage.getModeratorSession();
    if (!socketRef.current || !modSession) {
      return { success: false, error: 'Not authorized as moderator' };
    }

    return new Promise<{ success: boolean; error?: string }>((resolve) => {
      socketRef.current!.emit(
        'moderator:advance_round',
        { roomCode: modSession.roomCode, moderatorToken: modSession.moderatorToken },
        (response: { success: boolean; error?: string }) => {
          resolve(response || { success: true });
        }
      );
    });
  }, []);

  const startVote = useCallback(async () => {
    const modSession = storage.getModeratorSession();
    if (!socketRef.current || !modSession) {
      return { success: false, error: 'Not authorized as moderator' };
    }

    return new Promise<{ success: boolean; error?: string }>((resolve) => {
      socketRef.current!.emit(
        'moderator:start_vote',
        { roomCode: modSession.roomCode, moderatorToken: modSession.moderatorToken },
        (response: { success: boolean; error?: string }) => {
          resolve(response || { success: true });
        }
      );
    });
  }, []);

  const castVote = useCallback(
    async (candidateId: string) => {
      const playerSession = storage.getPlayerSession();
      const token = playerTokenRef.current || playerSession?.playerToken;
      const code = roomState?.code || playerSession?.roomCode;

      if (!socketRef.current || !token || !code) {
        return { success: false, error: 'Player session not found' };
      }

      if (currentPlayer && currentPlayer.id === candidateId) {
        return { success: false, error: 'Players cannot vote for themselves' };
      }

      return new Promise<{ success: boolean; error?: string }>((resolve) => {
        socketRef.current!.emit(
          'player:cast_vote',
          { roomCode: code, playerToken: token, candidateId },
          (response: { success: boolean; error?: string }) => {
            resolve(response || { success: true });
          }
        );
      });
    },
    [roomState, currentPlayer]
  );

  const cancelVote = useCallback(async () => {
    const modSession = storage.getModeratorSession();
    if (!socketRef.current || !modSession) {
      return { success: false, error: 'Not authorized as moderator' };
    }

    return new Promise<{ success: boolean; error?: string }>((resolve) => {
      socketRef.current!.emit(
        'moderator:cancel_vote',
        { roomCode: modSession.roomCode, moderatorToken: modSession.moderatorToken },
        (response: { success: boolean; error?: string }) => {
          resolve(response || { success: true });
        }
      );
    });
  }, []);

  const playAgain = useCallback(async () => {
    const modSession = storage.getModeratorSession();
    if (!socketRef.current || !modSession) {
      return { success: false, error: 'Not authorized as moderator' };
    }

    setGameOverNotice(null);
    setSelfKilledNotice(null);
    setRoleRevealedNotice(null);
    setActiveVote(null);

    return new Promise<{ success: boolean; error?: string }>((resolve) => {
      socketRef.current!.emit(
        'moderator:play_again',
        { roomCode: modSession.roomCode, moderatorToken: modSession.moderatorToken },
        (response: { success: boolean; error?: string }) => {
          resolve(response || { success: true });
        }
      );
    });
  }, []);

  const kickPlayer = useCallback(async (playerId: string) => {
    const modSession = storage.getModeratorSession();
    if (!socketRef.current || !modSession || !roomState) {
      return { success: false, error: 'Not authorized as moderator' };
    }

    return new Promise<{ success: boolean; error?: string }>((resolve) => {
      socketRef.current!.emit(
        'moderator:kick_player',
        { roomCode: modSession.roomCode, moderatorToken: modSession.moderatorToken, playerId },
        (response: { success: boolean; error?: string }) => {
          resolve(response || { success: true });
        }
      );
    });
  }, [roomState]);

  const joinSharedRoom = useCallback(
    async (code: string) => {
      const connected = await waitForConnection(12000);
      if (!connected || !socketRef.current) {
        return { success: false, error: 'Unable to connect to game server' };
      }

      return new Promise<{ success: boolean; error?: string }>((resolve) => {
        const timer = setTimeout(() => {
          resolve({ success: false, error: 'Server request timed out' });
        }, 10000);

        socketRef.current!.emit(
          'room:join_shared',
          { roomCode: code },
          (response: { success: boolean; roomState?: PublicRoomState; error?: string }) => {
            clearTimeout(timer);
            if (response.success && response.roomState) {
              storage.clearAllSessions();
              storage.saveSharedSession(code);
              setIsModerator(false);
              setCurrentPlayer(null);
              setRoomState(response.roomState);
              resolve({ success: true });
            } else {
              resolve({ success: false, error: response.error || 'Failed to connect as shared device' });
            }
          }
        );
      });
    },
    [waitForConnection]
  );

  const addPlayerDirectly = useCallback(
    async (playerName: string) => {
      if (!socketRef.current || !roomState) return { success: false, error: 'Not connected to room' };

      const modSession = storage.getModeratorSession();
      if (modSession) {
        return new Promise<{ success: boolean; player?: PublicPlayer; error?: string }>((resolve) => {
          socketRef.current!.emit(
            'moderator:add_player',
            { roomCode: modSession.roomCode, moderatorToken: modSession.moderatorToken, playerName },
            (response: { success: boolean; player?: PublicPlayer; error?: string }) => {
              resolve(response || { success: true });
            }
          );
        });
      }

      return new Promise<{ success: boolean; player?: PublicPlayer; error?: string }>((resolve) => {
        socketRef.current!.emit(
          'shared:add_player',
          { roomCode: roomState.code, playerName },
          (response: { success: boolean; player?: PublicPlayer; error?: string }) => {
            resolve(response || { success: true });
          }
        );
      });
    },
    [roomState]
  );

  const revealRoleToShared = useCallback(async (playerId: string) => {
    const modSession = storage.getModeratorSession();
    if (!socketRef.current || !modSession) {
      return { success: false, error: 'Not authorized as moderator' };
    }

    return new Promise<{ success: boolean; error?: string }>((resolve) => {
      socketRef.current!.emit(
        'moderator:reveal_role_to_shared',
        { roomCode: modSession.roomCode, moderatorToken: modSession.moderatorToken, playerId },
        (response: { success: boolean; error?: string }) => {
          resolve(response || { success: true });
        }
      );
    });
  }, []);

  const clearSharedRoleReveal = useCallback(async () => {
    setSharedRoleRevealNotice(null);
    if (socketRef.current && roomState) {
      socketRef.current.emit('shared:clear_role_reveal', { roomCode: roomState.code });
    }
    return { success: true };
  }, [roomState]);

  const castSharedVote = useCallback(
    async (voterId: string, candidateId: string) => {
      if (!socketRef.current || !roomState) {
        return { success: false, error: 'Not connected to room' };
      }

      if (voterId === candidateId) {
        return { success: false, error: 'Players cannot vote for themselves' };
      }

      return new Promise<{ success: boolean; error?: string }>((resolve) => {
        socketRef.current!.emit(
          'shared:cast_vote',
          { roomCode: roomState.code, voterId, candidateId },
          (response: { success: boolean; error?: string }) => {
            resolve(response || { success: true });
          }
        );
      });
    },
    [roomState]
  );

  const dismissSharedRoleReveal = useCallback(() => {
    clearSharedRoleReveal();
  }, [clearSharedRoleReveal]);

  const leaveRoom = useCallback(async () => {
    const playerSession = storage.getPlayerSession();
    if (socketRef.current && playerSession) {
      socketRef.current.emit('player:leave', {
        roomCode: playerSession.roomCode,
        playerToken: playerSession.playerToken,
      });
    }
    playerTokenRef.current = null;
    storage.clearAllSessions();
    setCurrentPlayer(null);
    setRoomState(null);
    setActiveVote(null);
    setIsModerator(false);
    return { success: true };
  }, []);

  const clearKickedReason = useCallback(() => {
    setKickedReason(null);
  }, []);

  const dismissSelfKilledNotice = useCallback(() => {
    setSelfKilledNotice(null);
  }, []);

  const dismissRoleRevealedNotice = useCallback(() => {
    setRoleRevealedNotice(null);
  }, []);

  const dismissGameOverNotice = useCallback(() => {
    setGameOverNotice(null);
  }, []);

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        isReconnecting,
        roomState,
        currentPlayer,
        isModerator,
        baseUrl,
        buildJoinUrl,
        kickedReason,
        selfKilledNotice,
        roleRevealedNotice,
        gameOverNotice,
        activeVote,
        sharedRoleRevealNotice,
        createRoom,
        validateRoom,
        joinRoom,
        joinSharedRoom,
        addPlayerDirectly,
        kickPlayer,
        startGame,
        assignRole,
        revealRoleToShared,
        clearSharedRoleReveal,
        setPlayerStatus,
        togglePlayerAlive,
        advanceRound,
        startVote,
        castVote,
        castSharedVote,
        cancelVote,
        playAgain,
        leaveRoom,
        clearKickedReason,
        dismissSelfKilledNotice,
        dismissRoleRevealedNotice,
        dismissGameOverNotice,
        dismissSharedRoleReveal,
        attemptSilentReconnect,
        reconnectWithToken,
        waitForConnection,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
