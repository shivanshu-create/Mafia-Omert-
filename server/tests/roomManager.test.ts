import { describe, it, expect, beforeEach } from 'vitest';
import { RoomManager } from '../src/roomManager';

describe('RoomManager Unit Tests', () => {
  let roomManager: RoomManager;

  beforeEach(() => {
    roomManager = new RoomManager();
  });

  describe('Room Creation & Validation', () => {
    it('creates a room with a 5-character alphanumeric code and moderator token', () => {
      const { room, roomCode, moderatorToken } = roomManager.createRoom('mod-socket-1');

      expect(roomCode).toHaveLength(5);
      expect(roomCode).toBe(roomCode.toUpperCase());
      expect(moderatorToken).toBeDefined();
      expect(room.moderatorSocketId).toBe('mod-socket-1');
      expect(room.moderatorConnected).toBe(true);
      expect(room.status).toBe('lobby');
    });

    it('validates existing and non-existing room codes properly', () => {
      const { roomCode } = roomManager.createRoom();

      // Valid room (exact and lowercase input should normalize)
      expect(roomManager.validateRoom(roomCode)).toEqual({ valid: true, gameMode: 'multi_phone' });
      expect(roomManager.validateRoom(roomCode.toLowerCase())).toEqual({ valid: true, gameMode: 'multi_phone' });

      // Invalid room
      expect(roomManager.validateRoom('INVALID')).toEqual({
        valid: false,
        error: 'Room not found or no longer active',
      });

      // Empty room
      expect(roomManager.validateRoom('')).toEqual({
        valid: false,
        error: 'Room code cannot be empty',
      });
    });
  });

  describe('Player Joining & Name Validation', () => {
    it('allows a player with a unique name to join', () => {
      const { roomCode } = roomManager.createRoom();
      const result = roomManager.addPlayer(roomCode, 'Vito Corleone', 'player-socket-1');

      expect(result.success).toBe(true);
      expect(result.playerToken).toBeDefined();
      expect(result.player).toMatchObject({
        name: 'Vito Corleone',
        isConnected: true,
      });

      const room = roomManager.getRoom(roomCode);
      expect(room?.players.size).toBe(1);
    });

    it('rejects empty or whitespace player names', () => {
      const { roomCode } = roomManager.createRoom();
      const result = roomManager.addPlayer(roomCode, '   ', 'player-socket-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Player name cannot be empty');
    });

    it('rejects duplicate player names (case-insensitive)', () => {
      const { roomCode } = roomManager.createRoom();
      roomManager.addPlayer(roomCode, 'Michael', 'player-socket-1');

      const dupResult = roomManager.addPlayer(roomCode, 'michael', 'player-socket-2');
      expect(dupResult.success).toBe(false);
      expect(dupResult.error).toContain('already in this room');
    });
  });

  describe('Reconnection with Tokens', () => {
    it('reconnects a moderator with a valid token and updates socketId', () => {
      const { roomCode, moderatorToken } = roomManager.createRoom('old-mod-socket');

      const reconnectResult = roomManager.reconnectModerator(roomCode, moderatorToken, 'new-mod-socket');
      expect(reconnectResult.success).toBe(true);
      expect(reconnectResult.roomState?.code).toBe(roomCode);

      const room = roomManager.getRoom(roomCode);
      expect(room?.moderatorSocketId).toBe('new-mod-socket');
      expect(room?.moderatorConnected).toBe(true);
    });

    it('rejects moderator reconnection with invalid token', () => {
      const { roomCode } = roomManager.createRoom('mod-socket');

      const result = roomManager.reconnectModerator(roomCode, 'wrong-token', 'new-socket');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid moderator session token');
    });

    it('reconnects an existing player with a valid playerToken', () => {
      const { roomCode } = roomManager.createRoom();
      const joinResult = roomManager.addPlayer(roomCode, 'Sonny', 'player-socket-1');
      const playerToken = joinResult.playerToken!;

      // Simulate disconnect
      roomManager.handleSocketDisconnect('player-socket-1');
      const roomBefore = roomManager.getRoom(roomCode);
      const playerBefore = Array.from(roomBefore!.players.values())[0];
      expect(playerBefore.isConnected).toBe(false);
      expect(playerBefore.socketId).toBeNull();

      // Silent reconnect with token
      const reconnectResult = roomManager.reconnectPlayer(roomCode, playerToken, 'player-socket-2');
      expect(reconnectResult.success).toBe(true);
      expect(reconnectResult.player?.name).toBe('Sonny');
      expect(reconnectResult.player?.isConnected).toBe(true);

      const roomAfter = roomManager.getRoom(roomCode);
      const playerAfter = Array.from(roomAfter!.players.values())[0];
      expect(playerAfter.isConnected).toBe(true);
      expect(playerAfter.socketId).toBe('player-socket-2');
    });

    it('rejects player reconnection if token is invalid or room not found', () => {
      const { roomCode } = roomManager.createRoom();
      roomManager.addPlayer(roomCode, 'Sonny', 'socket-1');

      const resultWrongToken = roomManager.reconnectPlayer(roomCode, 'invalid-token', 'socket-2');
      expect(resultWrongToken.success).toBe(false);
      expect(resultWrongToken.error).toContain('Session expired');

      const resultWrongRoom = roomManager.reconnectPlayer('NOTREAL', 'any-token', 'socket-2');
      expect(resultWrongRoom.success).toBe(false);
      expect(resultWrongRoom.error).toContain('Room not found');
    });
  });

  describe('Moderator Kick & Voluntary Leave', () => {
    it('allows moderator to kick a player', () => {
      const { roomCode, moderatorToken } = roomManager.createRoom();
      const joinResult = roomManager.addPlayer(roomCode, 'Fredo', 'fredo-socket');
      const playerId = joinResult.player!.id;

      const kickResult = roomManager.kickPlayer(roomCode, moderatorToken, playerId);
      expect(kickResult.success).toBe(true);
      expect(kickResult.kickedPlayerSocketId).toBe('fredo-socket');

      const room = roomManager.getRoom(roomCode);
      expect(room?.players.size).toBe(0);
    });

    it('prevents non-moderators from kicking players', () => {
      const { roomCode } = roomManager.createRoom();
      const joinResult = roomManager.addPlayer(roomCode, 'Fredo', 'fredo-socket');
      const playerId = joinResult.player!.id;

      const kickResult = roomManager.kickPlayer(roomCode, 'fake-token', playerId);
      expect(kickResult.success).toBe(false);
      expect(kickResult.error).toContain('Unauthorized');
    });

    it('allows a player to leave voluntarily using their token', () => {
      const { roomCode } = roomManager.createRoom();
      const joinResult = roomManager.addPlayer(roomCode, 'Tom Hagen', 'tom-socket');
      const playerToken = joinResult.playerToken!;

      const leaveResult = roomManager.removePlayer(roomCode, playerToken);
      expect(leaveResult.success).toBe(true);

      const room = roomManager.getRoom(roomCode);
      expect(room?.players.size).toBe(0);
    });
  });
});
