import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import http from 'http';
import express from 'express';
import { AddressInfo } from 'net';
import { Server as SocketIOServer } from 'socket.io';
import { io as ClientSocket, Socket as ClientSocketType } from 'socket.io-client';
import { RoomManager } from '../src/roomManager';
import { registerSocketHandlers } from '../src/socketHandlers';
import { ClientToServerEvents, ServerToClientEvents, PublicRoomState } from '../src/types';

describe('Two-Phone Mode Tests', () => {
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

  it('Unit: RoomManager creates Two-Phone room and supports direct player additions', () => {
    const { room, roomCode } = roomManager.createRoom(undefined, 'two_phone');
    expect(room.gameMode).toBe('two_phone');

    // Add players directly without requiring separate sockets
    const p1 = roomManager.addPlayerDirect(roomCode, 'Vito');
    const p2 = roomManager.addPlayerDirect(roomCode, 'Michael');
    const p3 = roomManager.addPlayerDirect(roomCode, 'Sonny');

    expect(p1.success).toBe(true);
    expect(p2.success).toBe(true);
    expect(p3.success).toBe(true);

    const publicState = roomManager.toPublicRoomState(room);
    expect(publicState.gameMode).toBe('two_phone');
    expect(publicState.playerCount).toBe(3);
    expect(publicState.players.map((p) => p.name)).toEqual(['Vito', 'Michael', 'Sonny']);
  });

  it('Unit: castVoteForPlayer allows sequential voting and resolves correctly', () => {
    const { roomCode, moderatorToken } = roomManager.createRoom(undefined, 'two_phone');
    const p1 = roomManager.addPlayerDirect(roomCode, 'Vito');
    const p2 = roomManager.addPlayerDirect(roomCode, 'Michael');
    const p3 = roomManager.addPlayerDirect(roomCode, 'Sonny');

    roomManager.assignRole(roomCode, moderatorToken, p1.player!.id, 'Mafia');
    roomManager.assignRole(roomCode, moderatorToken, p2.player!.id, 'Villager');
    roomManager.assignRole(roomCode, moderatorToken, p3.player!.id, 'Villager');

    roomManager.startGame(roomCode, moderatorToken);
    const voteRes = roomManager.startVote(roomCode, moderatorToken);
    expect(voteRes.success).toBe(true);
    expect(voteRes.activeVote?.totalVotersNeeded).toBe(3);

    // Vote 1: Vito votes for Michael
    const v1 = roomManager.castVoteForPlayer(roomCode, p1.player!.id, p2.player!.id);
    expect(v1.success).toBe(true);
    expect(v1.activeVote?.totalVotesCast).toBe(1);

    // Vote 2: Michael votes for Vito
    const v2 = roomManager.castVoteForPlayer(roomCode, p2.player!.id, p1.player!.id);
    expect(v2.success).toBe(true);
    expect(v2.activeVote?.totalVotesCast).toBe(2);

    // Vote 3: Sonny votes for Vito -> Vito has 2 votes, Michael 1 -> Auto-resolve elimination
    const v3 = roomManager.castVoteForPlayer(roomCode, p3.player!.id, p1.player!.id);
    expect(v3.success).toBe(true);
    expect(v3.isResolved).toBe(true);
    expect(v3.eliminatedPlayer?.name).toBe('Vito');
    expect(v3.gameOver?.winner).toBe('Town');
  });

  it('Socket E2E: Two-Phone mode setup, role reveal on shared phone, sequential voting and elimination', async () => {
    const modSocket = createClientSocket();
    const sharedPhoneSocket = createClientSocket();

    await Promise.all([
      new Promise<void>((r) => modSocket.on('connect', r)),
      new Promise<void>((r) => sharedPhoneSocket.on('connect', r)),
    ]);

    // 1. Moderator creates room with gameMode: 'two_phone'
    const createRes = await new Promise<{ success: boolean; roomCode?: string; moderatorToken?: string }>((resolve) => {
      modSocket.emit('room:create', { gameMode: 'two_phone' }, resolve);
    });
    const roomCode = createRes.roomCode!;
    const moderatorToken = createRes.moderatorToken!;

    // 2. Shared device joins the room
    await new Promise<{ success: boolean }>((resolve) => {
      sharedPhoneSocket.emit('room:join_shared', { roomCode }, resolve);
    });

    // 3. Moderator adds players directly
    const addVito = await new Promise<{ success: boolean; player?: any }>((r) =>
      modSocket.emit('moderator:add_player', { roomCode, moderatorToken, playerName: 'Vito' }, r)
    );
    const addMichael = await new Promise<{ success: boolean; player?: any }>((r) =>
      modSocket.emit('moderator:add_player', { roomCode, moderatorToken, playerName: 'Michael' }, r)
    );
    const addSonny = await new Promise<{ success: boolean; player?: any }>((r) =>
      modSocket.emit('moderator:add_player', { roomCode, moderatorToken, playerName: 'Sonny' }, r)
    );

    expect(addVito.success).toBe(true);
    expect(addMichael.success).toBe(true);
    expect(addSonny.success).toBe(true);

    // 4. Moderator assigns roles
    await new Promise((r) =>
      modSocket.emit('moderator:assign_role', { roomCode, moderatorToken, playerId: addVito.player.id, role: 'Mafia' }, r)
    );
    await new Promise((r) =>
      modSocket.emit('moderator:assign_role', { roomCode, moderatorToken, playerId: addMichael.player.id, role: 'Detective' }, r)
    );
    await new Promise((r) =>
      modSocket.emit('moderator:assign_role', { roomCode, moderatorToken, playerId: addSonny.player.id, role: 'Villager' }, r)
    );

    // 5. Test Private Role Reveal on Shared Phone:
    // Moderator triggers reveal for Vito
    let receivedReveal: any = null;
    sharedPhoneSocket.on('shared:show_role_reveal', (p) => {
      receivedReveal = p;
    });

    await new Promise((r) =>
      modSocket.emit('moderator:reveal_role_to_shared', { roomCode, moderatorToken, playerId: addVito.player.id }, r)
    );
    await new Promise((r) => setTimeout(r, 40));

    expect(receivedReveal).not.toBeNull();
    expect(receivedReveal.playerName).toBe('Vito');
    expect(receivedReveal.role).toBe('Mafia');

    // Shared device confirms and clears screen
    let clearReceived = false;
    sharedPhoneSocket.on('shared:clear_role_reveal', () => {
      clearReceived = true;
    });
    await new Promise((r) => sharedPhoneSocket.emit('shared:clear_role_reveal', { roomCode }, r));
    await new Promise((r) => setTimeout(r, 40));
    expect(clearReceived).toBe(true);

    // 6. Start Game & Start Day Vote
    await new Promise((r) => modSocket.emit('moderator:start_game', { roomCode, moderatorToken }, r));
    await new Promise((r) => modSocket.emit('moderator:start_vote', { roomCode, moderatorToken }, r));

    // Listen for casualty / death notification on shared phone
    let sharedKilledNotification: any = null;
    let sharedGameOver: any = null;
    sharedPhoneSocket.on('player:killed_notification', (p) => {
      sharedKilledNotification = p;
    });
    sharedPhoneSocket.on('game:ended', (p) => {
      sharedGameOver = p;
    });

    // 7. Sequential voting from shared device
    // Vito votes for Michael
    await new Promise((r) =>
      sharedPhoneSocket.emit('shared:cast_vote', { roomCode, voterId: addVito.player.id, candidateId: addMichael.player.id }, r)
    );
    // Michael votes for Vito
    await new Promise((r) =>
      sharedPhoneSocket.emit('shared:cast_vote', { roomCode, voterId: addMichael.player.id, candidateId: addVito.player.id }, r)
    );
    // Sonny votes for Vito -> Vito is eliminated, Town wins!
    await new Promise((r) =>
      sharedPhoneSocket.emit('shared:cast_vote', { roomCode, voterId: addSonny.player.id, candidateId: addVito.player.id }, r)
    );
    await new Promise((r) => setTimeout(r, 60));

    expect(sharedKilledNotification).not.toBeNull();
    expect(sharedKilledNotification.message).toContain('Vito');
    expect(sharedGameOver?.winner).toBe('Town');

    modSocket.disconnect();
    sharedPhoneSocket.disconnect();
  });
});
