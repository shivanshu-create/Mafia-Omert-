import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import http from 'http';
import express from 'express';
import { AddressInfo } from 'net';
import { Server as SocketIOServer } from 'socket.io';
import { io as ClientSocket, Socket as ClientSocketType } from 'socket.io-client';
import { RoomManager } from '../src/roomManager';
import { registerSocketHandlers } from '../src/socketHandlers';
import { ClientToServerEvents, ServerToClientEvents, PublicRoomState, Role } from '../src/types';

describe('Role Assignment & Server-Authoritative Privacy Tests', () => {
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

  it('Unit: assigns roles freely and serializes privacy states correctly', () => {
    const { roomCode, moderatorToken } = roomManager.createRoom();
    const p1 = roomManager.addPlayer(roomCode, 'Vito', 's1');
    const p2 = roomManager.addPlayer(roomCode, 'Michael', 's2');
    const p3 = roomManager.addPlayer(roomCode, 'Sonny', 's3');

    // Assign roles
    roomManager.assignRole(roomCode, moderatorToken, p1.player!.id, 'Mafia');
    roomManager.assignRole(roomCode, moderatorToken, p2.player!.id, 'Detective');
    roomManager.assignRole(roomCode, moderatorToken, p3.player!.id, 'Doctor');

    const room = roomManager.getRoom(roomCode)!;

    // 1. Moderator state includes ALL roles
    const modState = roomManager.toPublicRoomState(room);
    expect(modState.players.find((p) => p.name === 'Vito')?.role).toBe('Mafia');
    expect(modState.players.find((p) => p.name === 'Michael')?.role).toBe('Detective');
    expect(modState.players.find((p) => p.name === 'Sonny')?.role).toBe('Doctor');

    // 2. Player 1 (Vito) state includes Vito's role ONLY, others are null
    const vitoState = roomManager.toPublicRoomState(room, p1.player!.id);
    expect(vitoState.players.find((p) => p.name === 'Vito')?.role).toBe('Mafia');
    expect(vitoState.players.find((p) => p.name === 'Michael')?.role).toBeNull();
    expect(vitoState.players.find((p) => p.name === 'Sonny')?.role).toBeNull();

    // 3. Player 2 (Michael) state includes Michael's role ONLY
    const michaelState = roomManager.toPublicRoomState(room, p2.player!.id);
    expect(michaelState.players.find((p) => p.name === 'Vito')?.role).toBeNull();
    expect(michaelState.players.find((p) => p.name === 'Michael')?.role).toBe('Detective');
    expect(michaelState.players.find((p) => p.name === 'Sonny')?.role).toBeNull();
  });

  it('Socket E2E: Server-authoritative delivery ensures Player A never receives Player B role over network', async () => {
    const modSocket = createClientSocket();
    const vitoSocket = createClientSocket();
    const michaelSocket = createClientSocket();

    await Promise.all([
      new Promise<void>((r) => modSocket.on('connect', r)),
      new Promise<void>((r) => vitoSocket.on('connect', r)),
      new Promise<void>((r) => michaelSocket.on('connect', r)),
    ]);

    // 1. Mod creates room
    const modCreateRes = await new Promise<{ success: boolean; roomCode?: string; moderatorToken?: string }>((resolve) => {
      modSocket.emit('room:create', resolve);
    });
    const roomCode = modCreateRes.roomCode!;
    const moderatorToken = modCreateRes.moderatorToken!;

    // 2. Players join
    const vitoJoinRes = await new Promise<{ success: boolean; player?: any; playerToken?: string }>((resolve) => {
      vitoSocket.emit('room:join', { roomCode, playerName: 'Vito Corleone' }, resolve);
    });
    const vitoId = vitoJoinRes.player.id;
    const vitoToken = vitoJoinRes.playerToken!;

    const michaelJoinRes = await new Promise<{ success: boolean; player?: any; playerToken?: string }>((resolve) => {
      michaelSocket.emit('room:join', { roomCode, playerName: 'Michael Corleone' }, resolve);
    });
    const michaelId = michaelJoinRes.player.id;

    // Track latest state received by each client
    let modState: PublicRoomState | null = null;
    let vitoState: PublicRoomState | null = null;
    let michaelState: PublicRoomState | null = null;
    let vitoRoleEvent: Role | null = null;
    let michaelRoleEvent: Role | null = null;

    modSocket.on('room:state', (s) => { modState = s; });
    vitoSocket.on('room:state', (s) => { vitoState = s; });
    michaelSocket.on('room:state', (s) => { michaelState = s; });
    vitoSocket.on('player:role_updated', (p) => { vitoRoleEvent = p.role; });
    michaelSocket.on('player:role_updated', (p) => { michaelRoleEvent = p.role; });

    // 3. Moderator starts game
    await new Promise<{ success: boolean }>((resolve) => {
      modSocket.emit('moderator:start_game', { roomCode, moderatorToken }, resolve);
    });

    // 4. Moderator assigns roles: Vito -> Mafia, Michael -> Detective
    await new Promise<{ success: boolean }>((resolve) => {
      modSocket.emit('moderator:assign_role', { roomCode, moderatorToken, playerId: vitoId, role: 'Mafia' }, resolve);
    });

    await new Promise<{ success: boolean }>((resolve) => {
      modSocket.emit('moderator:assign_role', { roomCode, moderatorToken, playerId: michaelId, role: 'Detective' }, resolve);
    });

    // Allow socket tick
    await new Promise((r) => setTimeout(r, 60));

    // Verify Moderator socket view
    expect(modState?.players.find((p) => p.name === 'Vito Corleone')?.role).toBe('Mafia');
    expect(modState?.players.find((p) => p.name === 'Michael Corleone')?.role).toBe('Detective');

    // Verify Vito's socket view (Server-Authoritative Check)
    expect(vitoRoleEvent).toBe('Mafia');
    expect(vitoState?.players.find((p) => p.name === 'Vito Corleone')?.role).toBe('Mafia');
    // CRITICAL: Vito MUST NOT know Michael is Detective
    expect(vitoState?.players.find((p) => p.name === 'Michael Corleone')?.role).toBeNull();

    // Verify Michael's socket view (Server-Authoritative Check)
    expect(michaelRoleEvent).toBe('Detective');
    expect(michaelState?.players.find((p) => p.name === 'Michael Corleone')?.role).toBe('Detective');
    // CRITICAL: Michael MUST NOT know Vito is Mafia
    expect(michaelState?.players.find((p) => p.name === 'Vito Corleone')?.role).toBeNull();

    // 5. Test Role Re-assignment
    await new Promise<{ success: boolean }>((resolve) => {
      modSocket.emit('moderator:assign_role', { roomCode, moderatorToken, playerId: vitoId, role: 'Doctor' }, resolve);
    });

    await new Promise((r) => setTimeout(r, 60));
    expect(vitoRoleEvent).toBe('Doctor');
    expect(vitoState?.players.find((p) => p.name === 'Vito Corleone')?.role).toBe('Doctor');
    expect(michaelState?.players.find((p) => p.name === 'Vito Corleone')?.role).toBeNull();

    // 6. Test Alive / Killed status toggle
    await new Promise<{ success: boolean }>((resolve) => {
      modSocket.emit('moderator:toggle_player_alive', { roomCode, moderatorToken, playerId: vitoId, isAlive: false }, resolve);
    });

    await new Promise((r) => setTimeout(r, 60));
    expect(modState?.players.find((p) => p.name === 'Vito Corleone')?.isAlive).toBe(false);
    expect(vitoState?.players.find((p) => p.name === 'Vito Corleone')?.isAlive).toBe(false);
    expect(michaelState?.players.find((p) => p.name === 'Vito Corleone')?.isAlive).toBe(false);

    // 7. Test Silent Reconnect preserves role for that player and hides for others
    vitoSocket.disconnect();
    const vitoReconnectSocket = createClientSocket();
    await new Promise<void>((r) => vitoReconnectSocket.on('connect', r));

    const reconnectRes = await new Promise<{ success: boolean; player?: any; roomState?: PublicRoomState }>((resolve) => {
      vitoReconnectSocket.emit('session:reconnect_player', { roomCode, playerToken: vitoToken }, resolve);
    });

    expect(reconnectRes.success).toBe(true);
    expect(reconnectRes.player.role).toBe('Doctor');
    expect(reconnectRes.roomState?.players.find((p) => p.name === 'Vito Corleone')?.role).toBe('Doctor');
    expect(reconnectRes.roomState?.players.find((p) => p.name === 'Michael Corleone')?.role).toBeNull();

    modSocket.disconnect();
    michaelSocket.disconnect();
    vitoReconnectSocket.disconnect();
  });
});
