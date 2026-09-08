import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import http from 'http';
import express from 'express';
import { AddressInfo } from 'net';
import { Server as SocketIOServer } from 'socket.io';
import { io as ClientSocket, Socket as ClientSocketType } from 'socket.io-client';
import { RoomManager } from '../src/roomManager';
import { registerSocketHandlers } from '../src/socketHandlers';
import { ClientToServerEvents, ServerToClientEvents, PublicRoomState } from '../src/types';

describe('Socket.io Integration Tests', () => {
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

  it('handles room creation and room validation via socket', async () => {
    const modSocket = createClientSocket();

    await new Promise<void>((resolve) => {
      modSocket.on('connect', resolve);
    });

    // 1. Create Room
    const createRes = await new Promise<{ success: boolean; roomCode?: string; moderatorToken?: string }>((resolve) => {
      modSocket.emit('room:create', resolve);
    });

    expect(createRes.success).toBe(true);
    expect(createRes.roomCode).toBeDefined();
    expect(createRes.moderatorToken).toBeDefined();

    const roomCode = createRes.roomCode!;

    // 2. Validate Room
    const validateRes = await new Promise<{ valid: boolean; error?: string }>((resolve) => {
      modSocket.emit('room:validate', { roomCode }, resolve);
    });
    expect(validateRes.valid).toBe(true);

    const invalidRes = await new Promise<{ valid: boolean; error?: string }>((resolve) => {
      modSocket.emit('room:validate', { roomCode: 'FAKECD' }, resolve);
    });
    expect(invalidRes.valid).toBe(false);

    modSocket.disconnect();
  });

  it('handles full lifecycle: create room -> player join -> room:state broadcast -> kick player -> session reconnect', async () => {
    const modSocket = createClientSocket();
    const player1Socket = createClientSocket();
    const player2Socket = createClientSocket();

    await Promise.all([
      new Promise<void>((resolve) => modSocket.on('connect', resolve)),
      new Promise<void>((resolve) => player1Socket.on('connect', resolve)),
      new Promise<void>((resolve) => player2Socket.on('connect', resolve)),
    ]);

    // 1. Mod creates room
    const modCreateRes = await new Promise<{ success: boolean; roomCode?: string; moderatorToken?: string }>((resolve) => {
      modSocket.emit('room:create', resolve);
    });
    const roomCode = modCreateRes.roomCode!;
    const moderatorToken = modCreateRes.moderatorToken!;

    // 2. Player 1 joins
    let modReceivedState: PublicRoomState | null = null;
    modSocket.on('room:state', (state) => {
      modReceivedState = state;
    });

    const join1Res = await new Promise<{ success: boolean; playerToken?: string; player?: any }>((resolve) => {
      player1Socket.emit('room:join', { roomCode, playerName: 'Don Vito' }, resolve);
    });

    expect(join1Res.success).toBe(true);
    expect(join1Res.playerToken).toBeDefined();
    expect(join1Res.player.name).toBe('Don Vito');

    // Wait short tick for broadcast
    await new Promise((r) => setTimeout(r, 50));
    expect(modReceivedState?.playerCount).toBe(1);
    expect(modReceivedState?.players[0].name).toBe('Don Vito');

    // 3. Player 2 joins
    const join2Res = await new Promise<{ success: boolean; playerToken?: string; player?: any }>((resolve) => {
      player2Socket.emit('room:join', { roomCode, playerName: 'Michael Corleone' }, resolve);
    });
    expect(join2Res.success).toBe(true);
    const player2Token = join2Res.playerToken!;
    const player2Id = join2Res.player.id;

    await new Promise((r) => setTimeout(r, 50));
    expect(modReceivedState?.playerCount).toBe(2);

    // 4. Moderator kicks Player 2
    let player2KickedReason: string | null = null;
    player2Socket.on('player:kicked', (payload) => {
      player2KickedReason = payload.reason;
    });

    const kickRes = await new Promise<{ success: boolean }>((resolve) => {
      modSocket.emit('moderator:kick_player', { roomCode, moderatorToken, playerId: player2Id }, resolve);
    });
    expect(kickRes.success).toBe(true);

    await new Promise((r) => setTimeout(r, 50));
    expect(player2KickedReason).toContain('removed from the room');
    expect(modReceivedState?.playerCount).toBe(1);

    // 5. Silent Reconnect for Player 1 with a new socket
    player1Socket.disconnect();
    const player1ReconnectSocket = createClientSocket();
    await new Promise<void>((resolve) => player1ReconnectSocket.on('connect', resolve));

    const reconnectRes = await new Promise<{ success: boolean; isModerator: boolean; player?: any }>((resolve) => {
      player1ReconnectSocket.emit(
        'session:reconnect_player',
        { roomCode, playerToken: join1Res.playerToken! },
        resolve
      );
    });

    expect(reconnectRes.success).toBe(true);
    expect(reconnectRes.isModerator).toBe(false);
    expect(reconnectRes.player.name).toBe('Don Vito');

    // 6. Silent Reconnect for Moderator with a new socket
    modSocket.disconnect();
    const modReconnectSocket = createClientSocket();
    await new Promise<void>((resolve) => modReconnectSocket.on('connect', resolve));

    const modReconnectRes = await new Promise<{ success: boolean; isModerator: boolean; roomState?: any }>((resolve) => {
      modReconnectSocket.emit(
        'session:reconnect_moderator',
        { roomCode, moderatorToken },
        resolve
      );
    });

    expect(modReconnectRes.success).toBe(true);
    expect(modReconnectRes.isModerator).toBe(true);
    expect(modReconnectRes.roomState.code).toBe(roomCode);

    player1ReconnectSocket.disconnect();
    player2Socket.disconnect();
    modReconnectSocket.disconnect();
  });
});
