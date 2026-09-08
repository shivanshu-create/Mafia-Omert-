import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import http from 'http';
import express from 'express';
import { AddressInfo } from 'net';
import { Server as SocketIOServer } from 'socket.io';
import { io as ClientSocket, Socket as ClientSocketType } from 'socket.io-client';
import { RoomManager } from '../src/roomManager';
import { registerSocketHandlers } from '../src/socketHandlers';
import { ClientToServerEvents, ServerToClientEvents, PublicRoomState } from '../src/types';

describe('Play Again / Game Restart Flow Tests', () => {
  let server: http.Server;
  let io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>;
  let roomManager: RoomManager;
  let port: number;

  beforeAll(async () => {
    const app = express();
    server = http.createServer(app);
    io = new SocketIOServer(server, { cors: { origin: '*' } });
    roomManager = new RoomManager();
    registerSocketHandlers(io, roomManager);

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        port = (server.address() as AddressInfo).port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    io.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  beforeEach(() => {
    roomManager.clearAllRooms();
  });

  const createClientSocket = (): ClientSocketType<ServerToClientEvents, ClientToServerEvents> => {
    return ClientSocket(`http://localhost:${port}`, {
      transports: ['websocket'],
      forceNew: true,
    });
  };

  it('Unit: playAgain cleanly resets all player roles, statuses, and room history', () => {
    const { roomCode, moderatorToken } = roomManager.createRoom();
    const p1 = roomManager.addPlayer(roomCode, 'Vito', 's1');
    const p2 = roomManager.addPlayer(roomCode, 'Michael', 's2');

    // Assign roles & start game
    roomManager.assignRole(roomCode, moderatorToken, p1.player!.id, 'Mafia');
    roomManager.assignRole(roomCode, moderatorToken, p2.player!.id, 'Villager');
    roomManager.startGame(roomCode, moderatorToken);

    // Advance round and kill player
    roomManager.advanceRound(roomCode, moderatorToken);
    roomManager.setPlayerStatus(roomCode, moderatorToken, p1.player!.id, 'Killed');

    const roomBefore = roomManager.getRoom(roomCode)!;
    expect(roomBefore.round).toBe(2);
    expect(roomBefore.winner).toBe('Town');
    expect(roomBefore.players.get(p1.player!.id)?.status).toBe('Killed');

    // Play Again Reset
    const resetRes = roomManager.playAgain(roomCode, moderatorToken);
    expect(resetRes.success).toBe(true);

    const roomAfter = roomManager.getRoom(roomCode)!;
    expect(roomAfter.round).toBe(1);
    expect(roomAfter.winner).toBeNull();
    expect(roomAfter.status).toBe('in_game');
    expect(roomAfter.rounds).toHaveLength(1);
    expect(roomAfter.rounds[0].playerIds).toHaveLength(2);

    // All players are alive and unassigned
    for (const player of roomAfter.players.values()) {
      expect(player.role).toBeNull();
      expect(player.status).toBe('Alive');
      expect(player.isAlive).toBe(true);
    }
  });

  it('Socket E2E: Full loop -> win -> Play Again -> clean role re-assignment in same room', async () => {
    const modSocket = createClientSocket();
    const vitoSocket = createClientSocket();
    const michaelSocket = createClientSocket();

    await Promise.all([
      new Promise<void>((r) => modSocket.on('connect', r)),
      new Promise<void>((r) => vitoSocket.on('connect', r)),
      new Promise<void>((r) => michaelSocket.on('connect', r)),
    ]);

    // 1. Moderator creates room
    const modCreateRes = await new Promise<{ success: boolean; roomCode?: string; moderatorToken?: string }>((resolve) => {
      modSocket.emit('room:create', resolve);
    });
    const roomCode = modCreateRes.roomCode!;
    const moderatorToken = modCreateRes.moderatorToken!;

    // 2. Players join
    const vitoRes = await new Promise<{ success: boolean; player?: any }>((r) => vitoSocket.emit('room:join', { roomCode, playerName: 'Vito' }, r));
    const michaelRes = await new Promise<{ success: boolean; player?: any }>((r) => michaelSocket.emit('room:join', { roomCode, playerName: 'Michael' }, r));

    // Assign roles: Vito -> Mafia, Michael -> Villager
    await new Promise((r) => modSocket.emit('moderator:assign_role', { roomCode, moderatorToken, playerId: vitoRes.player.id, role: 'Mafia' }, r));
    await new Promise((r) => modSocket.emit('moderator:assign_role', { roomCode, moderatorToken, playerId: michaelRes.player.id, role: 'Villager' }, r));
    await new Promise((r) => modSocket.emit('moderator:start_game', { roomCode, moderatorToken }, r));

    // Kill Vito -> Town wins
    let gameEndedEvent: any = null;
    michaelSocket.on('game:ended', (p) => { gameEndedEvent = p; });

    await new Promise((r) => modSocket.emit('moderator:set_player_status', { roomCode, moderatorToken, playerId: vitoRes.player.id, status: 'Killed' }, r));
    await new Promise((r) => setTimeout(r, 50));

    expect(gameEndedEvent?.winner).toBe('Town');

    // 3. Moderator triggers Play Again
    let latestVitoState: PublicRoomState | null = null;
    let latestModState: PublicRoomState | null = null;
    vitoSocket.on('room:state', (s) => { latestVitoState = s; });
    modSocket.on('room:state', (s) => { latestModState = s; });

    const playAgainRes = await new Promise<{ success: boolean }>((resolve) => {
      modSocket.emit('moderator:play_again', { roomCode, moderatorToken }, resolve);
    });

    expect(playAgainRes.success).toBe(true);
    await new Promise((r) => setTimeout(r, 60));

    // Assert Vito's state is reset: role is null, isAlive is true, round is 1, winner is null
    expect(latestVitoState?.round).toBe(1);
    expect(latestVitoState?.winner).toBeNull();
    const vitoInState = latestVitoState?.players.find((p) => p.name === 'Vito');
    expect(vitoInState?.role).toBeNull();
    expect(vitoInState?.isAlive).toBe(true);

    // 4. Start Next Game with new role assignments: Michael -> Mafia, Vito -> Detective
    await new Promise((r) => modSocket.emit('moderator:assign_role', { roomCode, moderatorToken, playerId: michaelRes.player.id, role: 'Mafia' }, r));
    await new Promise((r) => modSocket.emit('moderator:assign_role', { roomCode, moderatorToken, playerId: vitoRes.player.id, role: 'Detective' }, r));
    await new Promise((r) => setTimeout(r, 50));

    expect(latestModState?.players.find((p) => p.name === 'Michael')?.role).toBe('Mafia');
    expect(latestModState?.players.find((p) => p.name === 'Vito')?.role).toBe('Detective');

    modSocket.disconnect();
    vitoSocket.disconnect();
    michaelSocket.disconnect();
  });
});
