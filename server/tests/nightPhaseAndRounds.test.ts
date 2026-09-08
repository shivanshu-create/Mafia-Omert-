import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import http from 'http';
import express from 'express';
import { AddressInfo } from 'net';
import { Server as SocketIOServer } from 'socket.io';
import { io as ClientSocket, Socket as ClientSocketType } from 'socket.io-client';
import { RoomManager } from '../src/roomManager';
import { registerSocketHandlers } from '../src/socketHandlers';
import { ClientToServerEvents, ServerToClientEvents, PublicRoomState, Role, PlayerStatus } from '../src/types';

describe('Night-Phase Status Controls & Round Progression Tests', () => {
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

  it('Unit: Status changes and round progression history work correctly', () => {
    const { roomCode, moderatorToken } = roomManager.createRoom();
    const p1 = roomManager.addPlayer(roomCode, 'Vito', 's1');
    const p2 = roomManager.addPlayer(roomCode, 'Michael', 's2');
    const p3 = roomManager.addPlayer(roomCode, 'Sonny', 's3');

    roomManager.assignRole(roomCode, moderatorToken, p1.player!.id, 'Mafia');
    roomManager.assignRole(roomCode, moderatorToken, p2.player!.id, 'Detective');
    roomManager.assignRole(roomCode, moderatorToken, p3.player!.id, 'Doctor');

    // Start game
    roomManager.startGame(roomCode, moderatorToken);
    const room = roomManager.getRoom(roomCode)!;
    expect(room.round).toBe(1);
    expect(room.rounds).toHaveLength(1);
    expect(room.rounds[0].playerIds).toHaveLength(3);

    // Set statuses
    roomManager.setPlayerStatus(roomCode, moderatorToken, p2.player!.id, 'Detected');
    roomManager.setPlayerStatus(roomCode, moderatorToken, p3.player!.id, 'Saved');

    expect(room.players.get(p2.player!.id)?.status).toBe('Detected');
    expect(room.players.get(p2.player!.id)?.isAlive).toBe(true);
    expect(room.players.get(p3.player!.id)?.status).toBe('Saved');
    expect(room.players.get(p3.player!.id)?.isAlive).toBe(true);

    // Kill Vito in Round 1
    const killRes = roomManager.setPlayerStatus(roomCode, moderatorToken, p1.player!.id, 'Killed');
    expect(killRes.success).toBe(true);
    expect(room.players.get(p1.player!.id)?.status).toBe('Killed');
    expect(room.players.get(p1.player!.id)?.isAlive).toBe(false);

    // Advance to Round 2
    roomManager.advanceRound(roomCode, moderatorToken);
    expect(room.round).toBe(2);
    expect(room.rounds).toHaveLength(2);

    // Round 1 history still contains Vito
    expect(room.rounds[0].playerIds).toContain(p1.player!.id);
    // Round 2 section contains ONLY alive players (Michael and Sonny)
    expect(room.rounds[1].playerIds).not.toContain(p1.player!.id);
    expect(room.rounds[1].playerIds).toEqual([p2.player!.id, p3.player!.id]);
  });

  it('Socket E2E: Status toggles trigger death notifications, role reveal broadcast, and Town win', async () => {
    const modSocket = createClientSocket();
    const vitoSocket = createClientSocket();
    const michaelSocket = createClientSocket();
    const sonnySocket = createClientSocket();

    await Promise.all([
      new Promise<void>((r) => modSocket.on('connect', r)),
      new Promise<void>((r) => vitoSocket.on('connect', r)),
      new Promise<void>((r) => michaelSocket.on('connect', r)),
      new Promise<void>((r) => sonnySocket.on('connect', r)),
    ]);

    // 1. Mod creates room
    const modCreateRes = await new Promise<{ success: boolean; roomCode?: string; moderatorToken?: string }>((resolve) => {
      modSocket.emit('room:create', resolve);
    });
    const roomCode = modCreateRes.roomCode!;
    const moderatorToken = modCreateRes.moderatorToken!;

    // 2. Players join
    const vitoRes = await new Promise<{ success: boolean; player?: any }>((r) => vitoSocket.emit('room:join', { roomCode, playerName: 'Vito' }, r));
    const michaelRes = await new Promise<{ success: boolean; player?: any }>((r) => michaelSocket.emit('room:join', { roomCode, playerName: 'Michael' }, r));
    const sonnyRes = await new Promise<{ success: boolean; player?: any }>((r) => sonnySocket.emit('room:join', { roomCode, playerName: 'Sonny' }, r));

    // Assign roles: Vito -> Mafia, Michael -> Detective, Sonny -> Villager
    await new Promise((r) => modSocket.emit('moderator:assign_role', { roomCode, moderatorToken, playerId: vitoRes.player.id, role: 'Mafia' }, r));
    await new Promise((r) => modSocket.emit('moderator:assign_role', { roomCode, moderatorToken, playerId: michaelRes.player.id, role: 'Detective' }, r));
    await new Promise((r) => modSocket.emit('moderator:assign_role', { roomCode, moderatorToken, playerId: sonnyRes.player.id, role: 'Villager' }, r));

    // Start game
    await new Promise((r) => modSocket.emit('moderator:start_game', { roomCode, moderatorToken }, r));

    // Listeners for events
    let vitoKilledNotification: string | null = null;
    let michaelKilledNotification: string | null = null;
    let revealedRoleToMichael: { playerName: string; role: Role | null } | null = null;
    let gameEndedEvent: { winner: 'Town' | 'Mafia'; reason: string } | null = null;

    vitoSocket.on('player:killed_notification', (p) => { vitoKilledNotification = p.message; });
    michaelSocket.on('player:killed_notification', (p) => { michaelKilledNotification = p.message; });
    michaelSocket.on('game:role_revealed', (p) => { revealedRoleToMichael = { playerName: p.playerName, role: p.role }; });
    michaelSocket.on('game:ended', (p) => { gameEndedEvent = p; });

    // 3. Moderator sets Vito (only Mafia) to "Killed"
    await new Promise((r) => modSocket.emit('moderator:set_player_status', { roomCode, moderatorToken, playerId: vitoRes.player.id, status: 'Killed' }, r));

    await new Promise((r) => setTimeout(r, 60));

    // Vito received death notification popup
    expect(vitoKilledNotification).toContain('You have been killed');
    // Michael did NOT receive personal killed notification
    expect(michaelKilledNotification).toBeNull();

    // All players received role reveal for Vito
    expect(revealedRoleToMichael?.playerName).toBe('Vito');
    expect(revealedRoleToMichael?.role).toBe('Mafia');

    // Win condition triggered: Town Wins because alive Mafia is 0
    expect(gameEndedEvent?.winner).toBe('Town');
    expect(gameEndedEvent?.reason).toContain('Town is victorious');

    modSocket.disconnect();
    vitoSocket.disconnect();
    michaelSocket.disconnect();
    sonnySocket.disconnect();
  });

  it('Socket E2E: Mafia win condition triggers when only 1 Town player remains alive', async () => {
    const modSocket = createClientSocket();
    const vitoSocket = createClientSocket();
    const michaelSocket = createClientSocket();
    const sonnySocket = createClientSocket();

    await Promise.all([
      new Promise<void>((r) => modSocket.on('connect', r)),
      new Promise<void>((r) => vitoSocket.on('connect', r)),
      new Promise<void>((r) => michaelSocket.on('connect', r)),
      new Promise<void>((r) => sonnySocket.on('connect', r)),
    ]);

    const modCreateRes = await new Promise<{ success: boolean; roomCode?: string; moderatorToken?: string }>((resolve) => {
      modSocket.emit('room:create', resolve);
    });
    const roomCode = modCreateRes.roomCode!;
    const moderatorToken = modCreateRes.moderatorToken!;

    const vitoRes = await new Promise<{ success: boolean; player?: any }>((r) => vitoSocket.emit('room:join', { roomCode, playerName: 'Vito' }, r));
    const michaelRes = await new Promise<{ success: boolean; player?: any }>((r) => michaelSocket.emit('room:join', { roomCode, playerName: 'Michael' }, r));
    const sonnyRes = await new Promise<{ success: boolean; player?: any }>((r) => sonnySocket.emit('room:join', { roomCode, playerName: 'Sonny' }, r));

    // Vito -> Mafia, Michael -> Villager, Sonny -> Villager (1 Mafia, 2 Town)
    await new Promise((r) => modSocket.emit('moderator:assign_role', { roomCode, moderatorToken, playerId: vitoRes.player.id, role: 'Mafia' }, r));
    await new Promise((r) => modSocket.emit('moderator:assign_role', { roomCode, moderatorToken, playerId: michaelRes.player.id, role: 'Villager' }, r));
    await new Promise((r) => modSocket.emit('moderator:assign_role', { roomCode, moderatorToken, playerId: sonnyRes.player.id, role: 'Villager' }, r));

    await new Promise((r) => modSocket.emit('moderator:start_game', { roomCode, moderatorToken }, r));

    let gameEndedEvent: { winner: 'Town' | 'Mafia'; reason: string } | null = null;
    vitoSocket.on('game:ended', (p) => { gameEndedEvent = p; });

    // Moderator kills Michael -> Town alive count becomes 1 (Sonny), Mafia alive count is 1 (Vito)
    await new Promise((r) => modSocket.emit('moderator:set_player_status', { roomCode, moderatorToken, playerId: michaelRes.player.id, status: 'Killed' }, r));

    await new Promise((r) => setTimeout(r, 60));

    expect(gameEndedEvent?.winner).toBe('Mafia');
    expect(gameEndedEvent?.reason).toContain('Mafia has overrun the town');

    modSocket.disconnect();
    vitoSocket.disconnect();
    michaelSocket.disconnect();
    sonnySocket.disconnect();
  });
});
