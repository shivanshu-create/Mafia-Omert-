import { Server, Socket } from 'socket.io';
import { RoomManager } from './roomManager';
import { ClientToServerEvents, ServerToClientEvents } from './types';

/**
 * Helper to securely broadcast room state to all connected sockets in a room.
 * - Moderator socket receives all player roles.
 * - Each player socket receives ONLY their own role (plus any killed players' revealed roles), with other alive players' roles masked to null.
 */
export function broadcastRoomState(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  roomManager: RoomManager,
  roomCode: string
): void {
  const room = roomManager.getRoom(roomCode);
  if (!room) return;

  const roomChannel = `room:${room.code}`;
  const roomSockets = io.sockets.adapter.rooms.get(roomChannel);
  const handledSockets = new Set<string>();

  // 1. Send full state with all roles to moderator if connected
  if (room.moderatorSocketId) {
    const modSocket = io.sockets.sockets.get(room.moderatorSocketId);
    if (modSocket) {
      modSocket.emit('room:state', roomManager.toPublicRoomState(room)); // Undefined forPlayerId = Moderator view
      handledSockets.add(room.moderatorSocketId);
    }
  }

  // 2. Send privacy-sanitized state to each connected player socket
  for (const player of room.players.values()) {
    if (player.socketId) {
      const playerSocket = io.sockets.sockets.get(player.socketId);
      if (playerSocket) {
        playerSocket.emit('room:state', roomManager.toPublicRoomState(room, player.id));
        playerSocket.emit('player:role_updated', { role: player.role });
        handledSockets.add(player.socketId);
      }
    }
  }

  // 3. For any other connected sockets in the room (e.g. shared device or spectator), send sanitized public state
  if (roomSockets) {
    for (const sId of roomSockets) {
      if (!handledSockets.has(sId)) {
        const otherSocket = io.sockets.sockets.get(sId);
        if (otherSocket) {
          otherSocket.emit('room:state', roomManager.toPublicRoomState(room, 'shared'));
          handledSockets.add(sId);
        }
      }
    }
  }
}

export function registerSocketHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  roomManager: RoomManager
): void {
  io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
    // 1. Create Room (Moderator)
    socket.on('room:create', (payloadOrCallback: any, maybeCallback?: any) => {
      const callback = typeof payloadOrCallback === 'function' ? payloadOrCallback : maybeCallback;
      const gameMode =
        typeof payloadOrCallback === 'object' && payloadOrCallback?.gameMode
          ? payloadOrCallback.gameMode
          : 'multi_phone';

      try {
        const { roomCode, moderatorToken } = roomManager.createRoom(socket.id, gameMode);
        const roomChannel = `room:${roomCode}`;
        socket.join(roomChannel);

        if (callback) {
          callback({
            success: true,
            roomCode,
            moderatorToken,
          });
        }

        broadcastRoomState(io, roomManager, roomCode);
      } catch (err: any) {
        if (callback) {
          callback({
            success: false,
            error: err.message || 'Failed to create room',
          });
        }
      }
    });

    // 1a. Moderator Adds Player Directly (Two-Phone Mode)
    socket.on('moderator:add_player', ({ roomCode, moderatorToken, playerName }, callback) => {
      const normalizedCode = (roomCode || '').trim().toUpperCase();
      const room = roomManager.getRoom(normalizedCode);

      if (!room || room.moderatorToken !== moderatorToken) {
        if (callback) callback({ success: false, error: 'Unauthorized: invalid moderator token' });
        return;
      }

      const result = roomManager.addPlayerDirect(normalizedCode, playerName);
      if (!result.success || !result.player) {
        if (callback) callback({ success: false, error: result.error || 'Failed to add player' });
        return;
      }

      broadcastRoomState(io, roomManager, normalizedCode);
      if (callback) callback({ success: true, player: result.player });
    });

    // 2. Validate Room
    socket.on('room:validate', ({ roomCode }, callback) => {
      const result = roomManager.validateRoom(roomCode);
      callback({
        valid: result.valid,
        error: result.error,
        roomCode: (roomCode || '').trim().toUpperCase(),
        gameMode: result.gameMode,
      });
    });

    // 3. Join Room (Player)
    socket.on('room:join', ({ roomCode, playerName }, callback) => {
      const normalizedCode = (roomCode || '').trim().toUpperCase();
      const result = roomManager.addPlayer(normalizedCode, playerName, socket.id);

      if (!result.success || !result.player || !result.playerToken) {
        return callback({
          success: false,
          error: result.error || 'Failed to join room',
        });
      }

      const roomChannel = `room:${normalizedCode}`;
      socket.join(roomChannel);

      callback({
        success: true,
        roomCode: normalizedCode,
        playerToken: result.playerToken,
        player: result.player,
      });

      broadcastRoomState(io, roomManager, normalizedCode);
    });

    // 3a. Join Room as Shared Player Device (Two-Phone Mode)
    socket.on('room:join_shared', ({ roomCode }, callback) => {
      const normalizedCode = (roomCode || '').trim().toUpperCase();
      const room = roomManager.getRoom(normalizedCode);

      if (!room) {
        if (callback) callback({ success: false, error: 'Room not found' });
        return;
      }

      const roomChannel = `room:${normalizedCode}`;
      socket.join(roomChannel);
      room.sharedSocketId = socket.id;

      const publicState = roomManager.toPublicRoomState(room, 'shared');
      if (callback) {
        callback({
          success: true,
          roomState: publicState,
        });
      }

      broadcastRoomState(io, roomManager, normalizedCode);
    });

    // 3b. Shared Device Adds Player to Manifest (Two-Phone Mode)
    socket.on('shared:add_player', ({ roomCode, playerName }, callback) => {
      const normalizedCode = (roomCode || '').trim().toUpperCase();
      const result = roomManager.addPlayerDirect(normalizedCode, playerName);

      if (!result.success || !result.player) {
        if (callback) callback({ success: false, error: result.error || 'Failed to add player' });
        return;
      }

      broadcastRoomState(io, roomManager, normalizedCode);
      if (callback) callback({ success: true, player: result.player });
    });

    // 4. Reconnect Moderator
    socket.on('session:reconnect_moderator', ({ roomCode, moderatorToken }, callback) => {
      const normalizedCode = (roomCode || '').trim().toUpperCase();
      const result = roomManager.reconnectModerator(normalizedCode, moderatorToken, socket.id);

      if (!result.success || !result.roomState) {
        return callback({
          success: false,
          isModerator: true,
          error: result.error || 'Failed to reconnect moderator',
        });
      }

      const roomChannel = `room:${normalizedCode}`;
      socket.join(roomChannel);

      callback({
        success: true,
        isModerator: true,
        roomState: result.roomState,
      });

      broadcastRoomState(io, roomManager, normalizedCode);
    });

    // 5. Reconnect Player
    socket.on('session:reconnect_player', ({ roomCode, playerToken }, callback) => {
      const normalizedCode = (roomCode || '').trim().toUpperCase();
      const result = roomManager.reconnectPlayer(normalizedCode, playerToken, socket.id);

      if (!result.success || !result.player || !result.roomState) {
        return callback({
          success: false,
          isModerator: false,
          error: result.error || 'Failed to reconnect player',
        });
      }

      const roomChannel = `room:${normalizedCode}`;
      socket.join(roomChannel);

      callback({
        success: true,
        isModerator: false,
        player: result.player,
        roomState: result.roomState,
      });

      broadcastRoomState(io, roomManager, normalizedCode);
    });

    // 6. Moderator Starts Game
    socket.on('moderator:start_game', ({ roomCode, moderatorToken }, callback) => {
      const normalizedCode = (roomCode || '').trim().toUpperCase();
      const result = roomManager.startGame(normalizedCode, moderatorToken);

      if (!result.success) {
        if (callback) callback({ success: false, error: result.error });
        return;
      }

      broadcastRoomState(io, roomManager, normalizedCode);
      if (callback) callback({ success: true });
    });

    // 7. Moderator Assigns Role
    socket.on('moderator:assign_role', ({ roomCode, moderatorToken, playerId, role }, callback) => {
      const normalizedCode = (roomCode || '').trim().toUpperCase();
      const result = roomManager.assignRole(normalizedCode, moderatorToken, playerId, role);

      if (!result.success) {
        if (callback) callback({ success: false, error: result.error });
        return;
      }

      broadcastRoomState(io, roomManager, normalizedCode);
      if (callback) callback({ success: true });
    });

    // 7a. Moderator Reveals Role on Shared Device (Two-Phone Mode)
    socket.on('moderator:reveal_role_to_shared', ({ roomCode, moderatorToken, playerId }, callback) => {
      const normalizedCode = (roomCode || '').trim().toUpperCase();
      const room = roomManager.getRoom(normalizedCode);

      if (!room || room.moderatorToken !== moderatorToken) {
        if (callback) callback({ success: false, error: 'Unauthorized: invalid moderator token' });
        return;
      }

      if (room.gameMode !== 'two_phone') {
        if (callback) callback({ success: false, error: 'Reveal on shared device is only allowed in Two-Phone mode' });
        return;
      }

      const player = room.players.get(playerId);
      if (!player) {
        if (callback) callback({ success: false, error: 'Player not found' });
        return;
      }

      if (!room.sharedSocketId) {
        if (callback) callback({ success: false, error: 'Shared player device is not connected' });
        return;
      }

      // STRICT SECURITY: Send exclusively to the shared device socket ID, never broadcast to room channel
      io.to(room.sharedSocketId).emit('shared:show_role_reveal', {
        playerId: player.id,
        playerName: player.name,
        role: player.role,
      });

      if (callback) callback({ success: true });
    });

    // 7b. Shared Device Clears Role Reveal Screen
    socket.on('shared:clear_role_reveal', ({ roomCode }, callback) => {
      const normalizedCode = (roomCode || '').trim().toUpperCase();
      const room = roomManager.getRoom(normalizedCode);
      if (room && room.sharedSocketId) {
        io.to(room.sharedSocketId).emit('shared:clear_role_reveal');
      } else {
        const roomChannel = `room:${normalizedCode}`;
        io.to(roomChannel).emit('shared:clear_role_reveal');
      }
      if (callback) callback({ success: true });
    });

    // 8. Moderator Sets Player Status (Alive, Killed, Saved, Detected)
    socket.on('moderator:set_player_status', ({ roomCode, moderatorToken, playerId, status }, callback) => {
      const normalizedCode = (roomCode || '').trim().toUpperCase();
      const result = roomManager.setPlayerStatus(normalizedCode, moderatorToken, playerId, status);

      if (!result.success || !result.player) {
        if (callback) callback({ success: false, error: result.error });
        return;
      }

      const roomChannel = `room:${normalizedCode}`;
      const room = roomManager.getRoom(normalizedCode);

      if (status === 'Killed') {
        if (room?.gameMode === 'two_phone') {
          socket.to(roomChannel).emit('player:killed_notification', {
            message: `${result.player.name} has been killed! They cannot take actions in the upcoming rounds.`,
          });
        } else if (result.player.socketId) {
          const targetSocket = io.sockets.sockets.get(result.player.socketId);
          if (targetSocket) {
            targetSocket.emit('player:killed_notification', {
              message: "You have been killed! You cannot take actions in the upcoming rounds.",
            });
          }
        }

        io.to(roomChannel).emit('game:role_revealed', {
          playerId: result.player.id,
          playerName: result.player.name,
          role: result.revealedRole || null,
        });

        if (result.gameOver) {
          io.to(roomChannel).emit('game:ended', {
            winner: result.gameOver.winner,
            reason: result.gameOver.reason,
          });
        }
      }

      broadcastRoomState(io, roomManager, normalizedCode);
      if (callback) callback({ success: true });
    });

    // 9. Moderator Toggles Player Alive / Killed
    socket.on('moderator:toggle_player_alive', ({ roomCode, moderatorToken, playerId, isAlive }, callback) => {
      const normalizedCode = (roomCode || '').trim().toUpperCase();
      const status = isAlive ? 'Alive' : 'Killed';
      const result = roomManager.setPlayerStatus(normalizedCode, moderatorToken, playerId, status);

      if (!result.success || !result.player) {
        if (callback) callback({ success: false, error: result.error });
        return;
      }

      const roomChannel = `room:${normalizedCode}`;
      const room = roomManager.getRoom(normalizedCode);

      if (status === 'Killed') {
        if (room?.gameMode === 'two_phone') {
          socket.to(roomChannel).emit('player:killed_notification', {
            message: `${result.player.name} has been killed! They cannot take actions in the upcoming rounds.`,
          });
        } else if (result.player.socketId) {
          const targetSocket = io.sockets.sockets.get(result.player.socketId);
          if (targetSocket) {
            targetSocket.emit('player:killed_notification', {
              message: "You have been killed! You cannot take actions in the upcoming rounds.",
            });
          }
        }

        io.to(roomChannel).emit('game:role_revealed', {
          playerId: result.player.id,
          playerName: result.player.name,
          role: result.revealedRole || null,
        });

        if (result.gameOver) {
          io.to(roomChannel).emit('game:ended', {
            winner: result.gameOver.winner,
            reason: result.gameOver.reason,
          });
        }
      }

      broadcastRoomState(io, roomManager, normalizedCode);
      if (callback) callback({ success: true });
    });

    // 10. Moderator Advances Round
    socket.on('moderator:advance_round', ({ roomCode, moderatorToken }, callback) => {
      const normalizedCode = (roomCode || '').trim().toUpperCase();
      const result = roomManager.advanceRound(normalizedCode, moderatorToken);

      if (!result.success) {
        if (callback) callback({ success: false, error: result.error });
        return;
      }

      broadcastRoomState(io, roomManager, normalizedCode);
      if (callback) callback({ success: true });
    });

    // 11. Moderator Starts Day Vote
    socket.on('moderator:start_vote', ({ roomCode, moderatorToken }, callback) => {
      const normalizedCode = (roomCode || '').trim().toUpperCase();
      const result = roomManager.startVote(normalizedCode, moderatorToken);

      if (!result.success || !result.activeVote) {
        if (callback) callback({ success: false, error: result.error });
        return;
      }

      const roomChannel = `room:${normalizedCode}`;
      io.to(roomChannel).emit('vote:started', result.activeVote);

      broadcastRoomState(io, roomManager, normalizedCode);
      if (callback) callback({ success: true });
    });

    // 12. Player Casts Vote
    socket.on('player:cast_vote', ({ roomCode, playerToken, candidateId }, callback) => {
      const normalizedCode = (roomCode || '').trim().toUpperCase();
      const result = roomManager.castVote(normalizedCode, playerToken, candidateId);

      if (!result.success) {
        if (callback) callback({ success: false, error: result.error });
        return;
      }

      const roomChannel = `room:${normalizedCode}`;

      if (result.isTieBreak && result.activeVote) {
        io.to(roomChannel).emit('vote:tie_break', {
          tiedCandidates: result.tiedCandidateNames || [],
          activeVote: result.activeVote,
        });
      } else if (result.isResolved && result.eliminatedPlayer) {
        io.to(roomChannel).emit('vote:resolved', {
          eliminatedPlayer: roomManager.toPublicPlayer(result.eliminatedPlayer, true),
          role: result.revealedRole || null,
        });

        const room = roomManager.getRoom(normalizedCode);
        if (room?.gameMode === 'two_phone') {
          socket.to(roomChannel).emit('player:killed_notification', {
            message: `${result.eliminatedPlayer.name} was voted out and eliminated! Maintain the Omertà code of silence.`,
          });
        } else if (result.eliminatedPlayer.socketId) {
          const targetSocket = io.sockets.sockets.get(result.eliminatedPlayer.socketId);
          if (targetSocket) {
            targetSocket.emit('player:killed_notification', {
              message: "You have been voted out and eliminated! Maintain the Omertà code of silence.",
            });
          }
        }

        io.to(roomChannel).emit('game:role_revealed', {
          playerId: result.eliminatedPlayer.id,
          playerName: result.eliminatedPlayer.name,
          role: result.revealedRole || null,
        });

        if (result.gameOver) {
          io.to(roomChannel).emit('game:ended', {
            winner: result.gameOver.winner,
            reason: result.gameOver.reason,
          });
        }
      } else if (result.activeVote) {
        io.to(roomChannel).emit('vote:updated', result.activeVote);
      }

      broadcastRoomState(io, roomManager, normalizedCode);
      if (callback) callback({ success: true });
    });

    // 12a. Shared Device Casts Vote (Two-Phone Mode)
    socket.on('shared:cast_vote', ({ roomCode, voterId, candidateId }, callback) => {
      const normalizedCode = (roomCode || '').trim().toUpperCase();
      const result = roomManager.castVoteForPlayer(normalizedCode, voterId, candidateId);

      if (!result.success) {
        if (callback) callback({ success: false, error: result.error });
        return;
      }

      const roomChannel = `room:${normalizedCode}`;

      if (result.isTieBreak && result.activeVote) {
        io.to(roomChannel).emit('vote:tie_break', {
          tiedCandidates: result.tiedCandidateNames || [],
          activeVote: result.activeVote,
        });
      } else if (result.isResolved && result.eliminatedPlayer) {
        io.to(roomChannel).emit('vote:resolved', {
          eliminatedPlayer: roomManager.toPublicPlayer(result.eliminatedPlayer, true),
          role: result.revealedRole || null,
        });

        // In Two-Phone Mode, notify the shared device
        io.to(roomChannel).emit('player:killed_notification', {
          message: `${result.eliminatedPlayer.name} was voted out and eliminated! Maintain the Omertà code of silence.`,
        });

        io.to(roomChannel).emit('game:role_revealed', {
          playerId: result.eliminatedPlayer.id,
          playerName: result.eliminatedPlayer.name,
          role: result.revealedRole || null,
        });

        if (result.gameOver) {
          io.to(roomChannel).emit('game:ended', {
            winner: result.gameOver.winner,
            reason: result.gameOver.reason,
          });
        }
      } else if (result.activeVote) {
        io.to(roomChannel).emit('vote:updated', result.activeVote);
      }

      broadcastRoomState(io, roomManager, normalizedCode);
      if (callback) callback({ success: true });
    });

    // 13. Moderator Cancels Vote
    socket.on('moderator:cancel_vote', ({ roomCode, moderatorToken }, callback) => {
      const normalizedCode = (roomCode || '').trim().toUpperCase();
      const result = roomManager.cancelVote(normalizedCode, moderatorToken);

      if (!result.success) {
        if (callback) callback({ success: false, error: result.error });
        return;
      }

      broadcastRoomState(io, roomManager, normalizedCode);
      if (callback) callback({ success: true });
    });

    // 14. Moderator Plays Again / Resets Game
    socket.on('moderator:play_again', ({ roomCode, moderatorToken }, callback) => {
      const normalizedCode = (roomCode || '').trim().toUpperCase();
      const result = roomManager.playAgain(normalizedCode, moderatorToken);

      if (!result.success) {
        if (callback) callback({ success: false, error: result.error });
        return;
      }

      broadcastRoomState(io, roomManager, normalizedCode);
      if (callback) callback({ success: true });
    });

    // 15. Moderator Kick Player
    socket.on('moderator:kick_player', ({ roomCode, moderatorToken, playerId }, callback) => {
      const normalizedCode = (roomCode || '').trim().toUpperCase();
      const result = roomManager.kickPlayer(normalizedCode, moderatorToken, playerId);

      if (!result.success) {
        if (callback) callback({ success: false, error: result.error });
        return;
      }

      if (result.kickedPlayerSocketId) {
        const targetSocket = io.sockets.sockets.get(result.kickedPlayerSocketId);
        if (targetSocket) {
          targetSocket.emit('player:kicked', { reason: 'You were removed from the room by the moderator.' });
          targetSocket.leave(`room:${normalizedCode}`);
        }
      }

      broadcastRoomState(io, roomManager, normalizedCode);
      if (callback) callback({ success: true });
    });

    // 16. Player Voluntarily Leaves
    socket.on('player:leave', ({ roomCode, playerToken }, callback) => {
      const normalizedCode = (roomCode || '').trim().toUpperCase();
      const result = roomManager.removePlayer(normalizedCode, playerToken);

      socket.leave(`room:${normalizedCode}`);

      if (result.success) {
        broadcastRoomState(io, roomManager, normalizedCode);
      }

      if (callback) {
        callback({ success: result.success, error: result.error });
      }
    });

    // 17. Disconnect Handler
    socket.on('disconnect', () => {
      const disconnectInfo = roomManager.handleSocketDisconnect(socket.id);
      if (disconnectInfo && disconnectInfo.roomCode) {
        broadcastRoomState(io, roomManager, disconnectInfo.roomCode);
      }
    });
  });
}
