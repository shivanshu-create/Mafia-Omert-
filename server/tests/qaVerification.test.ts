import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import http from 'http';
import express from 'express';
import { AddressInfo } from 'net';
import { Server as SocketIOServer } from 'socket.io';
import { io as ClientSocket, Socket as ClientSocketType } from 'socket.io-client';
import { RoomManager } from '../src/roomManager';
import { registerSocketHandlers } from '../src/socketHandlers';
import { ClientToServerEvents, ServerToClientEvents, PublicRoomState, Role } from '../src/types';

describe('QA & Security Verification Test Suite', () => {
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

  describe('1. Hidden-Info Verification (Core Trust Mechanic)', () => {
    it('guarantees no player ever receives another player\'s role in any payload or event', async () => {
      const modSocket = createClientSocket();
      const aliceSocket = createClientSocket();
      const bobSocket = createClientSocket();
      const charlieSocket = createClientSocket();

      await Promise.all([
        new Promise<void>((r) => modSocket.on('connect', r)),
        new Promise<void>((r) => aliceSocket.on('connect', r)),
        new Promise<void>((r) => bobSocket.on('connect', r)),
        new Promise<void>((r) => charlieSocket.on('connect', r)),
      ]);

      // Create room
      const createRes = await new Promise<{ success: boolean; roomCode?: string; moderatorToken?: string }>((r) => {
        modSocket.emit('room:create', r);
      });
      const roomCode = createRes.roomCode!;
      const moderatorToken = createRes.moderatorToken!;

      // Join players
      const aliceJoin = await new Promise<{ success: boolean; player?: any }>((r) =>
        aliceSocket.emit('room:join', { roomCode, playerName: 'Alice' }, r)
      );
      const bobJoin = await new Promise<{ success: boolean; player?: any }>((r) =>
        bobSocket.emit('room:join', { roomCode, playerName: 'Bob' }, r)
      );
      const charlieJoin = await new Promise<{ success: boolean; player?: any }>((r) =>
        charlieSocket.emit('room:join', { roomCode, playerName: 'Charlie' }, r)
      );

      // Track all room:state and player:role_updated payloads received by Alice and Bob
      const aliceReceivedStates: PublicRoomState[] = [];
      const bobReceivedStates: PublicRoomState[] = [];
      const aliceRoleUpdates: { role: Role }[] = [];
      const bobRoleUpdates: { role: Role }[] = [];
      let modLatestState: PublicRoomState | null = null;

      aliceSocket.on('room:state', (state) => aliceReceivedStates.push(state));
      bobSocket.on('room:state', (state) => bobReceivedStates.push(state));
      modSocket.on('room:state', (state) => {
        modLatestState = state;
      });

      aliceSocket.on('player:role_updated', (p) => aliceRoleUpdates.push(p));
      bobSocket.on('player:role_updated', (p) => bobRoleUpdates.push(p));

      // Moderator assigns roles:
      // Alice = Mafia, Bob = Detective, Charlie = Villager
      await new Promise((r) =>
        modSocket.emit('moderator:assign_role', { roomCode, moderatorToken, playerId: aliceJoin.player.id, role: 'Mafia' }, r)
      );
      await new Promise((r) =>
        modSocket.emit('moderator:assign_role', { roomCode, moderatorToken, playerId: bobJoin.player.id, role: 'Detective' }, r)
      );
      await new Promise((r) =>
        modSocket.emit('moderator:assign_role', { roomCode, moderatorToken, playerId: charlieJoin.player.id, role: 'Villager' }, r)
      );

      await new Promise((r) => setTimeout(r, 60));

      // 1. Check Moderator State: Moderator MUST see all player roles
      expect(modLatestState).not.toBeNull();
      const modPlayers = modLatestState!.players;
      expect(modPlayers.find((p) => p.name === 'Alice')?.role).toBe('Mafia');
      expect(modPlayers.find((p) => p.name === 'Bob')?.role).toBe('Detective');
      expect(modPlayers.find((p) => p.name === 'Charlie')?.role).toBe('Villager');

      // 2. Check Alice State: In every single room:state packet Alice received,
      // only Alice's own role may be visible; Bob and Charlie roles MUST be null (redacted)
      expect(aliceReceivedStates.length).toBeGreaterThan(0);
      for (const state of aliceReceivedStates) {
        const bob = state.players.find((p) => p.name === 'Bob');
        const charlie = state.players.find((p) => p.name === 'Charlie');
        const alice = state.players.find((p) => p.name === 'Alice');

        if (bob) expect(bob.role).toBeNull();
        if (charlie) expect(charlie.role).toBeNull();
        // Alice only sees her own role once assigned
        if (alice && alice.role) expect(alice.role).toBe('Mafia');
      }

      // 3. Check Bob State: In every single room:state packet Bob received,
      // Alice and Charlie roles MUST be null (redacted)
      expect(bobReceivedStates.length).toBeGreaterThan(0);
      for (const state of bobReceivedStates) {
        const alice = state.players.find((p) => p.name === 'Alice');
        const charlie = state.players.find((p) => p.name === 'Charlie');
        const bob = state.players.find((p) => p.name === 'Bob');

        if (alice) expect(alice.role).toBeNull();
        if (charlie) expect(charlie.role).toBeNull();
        if (bob && bob.role) expect(bob.role).toBe('Detective');
      }

      // 4. Check targeted role updates: Alice received only her role update, Bob received only his
      expect(aliceRoleUpdates.every((u) => u.role === null || u.role === 'Mafia')).toBe(true);
      expect(bobRoleUpdates.every((u) => u.role === null || u.role === 'Detective')).toBe(true);
      expect(aliceRoleUpdates.some((u) => u.role === 'Detective')).toBe(false);
      expect(bobRoleUpdates.some((u) => u.role === 'Mafia')).toBe(false);

      // 5. Check Two-Phone mode: reveal is targeted to shared socket ONLY, never leaked to other sockets
      const twoPhoneCreate = await new Promise<{ success: boolean; roomCode?: string; moderatorToken?: string }>((r) => {
        modSocket.emit('room:create', { gameMode: 'two_phone' }, r);
      });
      const tpRoomCode = twoPhoneCreate.roomCode!;
      const tpModToken = twoPhoneCreate.moderatorToken!;

      const sharedSocket = createClientSocket();
      const eavesdropperSocket = createClientSocket();
      await Promise.all([
        new Promise<void>((r) => sharedSocket.on('connect', r)),
        new Promise<void>((r) => eavesdropperSocket.on('connect', r)),
      ]);

      await new Promise((r) => sharedSocket.emit('room:join_shared', { roomCode: tpRoomCode }, r));
      await new Promise((r) => eavesdropperSocket.emit('room:validate', { roomCode: tpRoomCode }, r));

      const addPlayerRes = await new Promise<{ success: boolean; player?: any }>((r) =>
        modSocket.emit('moderator:add_player', { roomCode: tpRoomCode, moderatorToken: tpModToken, playerName: 'SecretMafia' }, r)
      );
      await new Promise((r) =>
        modSocket.emit('moderator:assign_role', { roomCode: tpRoomCode, moderatorToken: tpModToken, playerId: addPlayerRes.player.id, role: 'Mafia' }, r)
      );

      let sharedReceivedReveal: any = null;
      let eavesdropperReceivedReveal: any = null;

      sharedSocket.on('shared:show_role_reveal', (p) => {
        sharedReceivedReveal = p;
      });
      eavesdropperSocket.on('shared:show_role_reveal', (p) => {
        eavesdropperReceivedReveal = p;
      });

      await new Promise((r) =>
        modSocket.emit('moderator:reveal_role_to_shared', { roomCode: tpRoomCode, moderatorToken: tpModToken, playerId: addPlayerRes.player.id }, r)
      );
      await new Promise((r) => setTimeout(r, 60));

      expect(sharedReceivedReveal).not.toBeNull();
      expect(sharedReceivedReveal.playerName).toBe('SecretMafia');
      expect(sharedReceivedReveal.role).toBe('Mafia');
      // Eavesdropper NEVER receives the reveal packet!
      expect(eavesdropperReceivedReveal).toBeNull();

      modSocket.disconnect();
      aliceSocket.disconnect();
      bobSocket.disconnect();
      charlieSocket.disconnect();
      sharedSocket.disconnect();
      eavesdropperSocket.disconnect();
    });
  });

  describe('2. Reconnect Testing', () => {
    it('restores seat, role, and alive/dead status without duplicate players when tab closes and reconnects', async () => {
      const modSocket = createClientSocket();
      const playerSocket = createClientSocket();

      await Promise.all([
        new Promise<void>((r) => modSocket.on('connect', r)),
        new Promise<void>((r) => playerSocket.on('connect', r)),
      ]);

      const createRes = await new Promise<{ success: boolean; roomCode?: string; moderatorToken?: string }>((r) =>
        modSocket.emit('room:create', r)
      );
      const roomCode = createRes.roomCode!;
      const moderatorToken = createRes.moderatorToken!;

      const joinRes = await new Promise<{ success: boolean; player?: any; playerToken?: string }>((r) =>
        playerSocket.emit('room:join', { roomCode, playerName: 'Vito' }, r)
      );
      const playerToken = joinRes.playerToken!;
      const originalPlayerId = joinRes.player.id;

      // Moderator assigns role and starts game
      await new Promise((r) =>
        modSocket.emit('moderator:assign_role', { roomCode, moderatorToken, playerId: originalPlayerId, role: 'Mafia' }, r)
      );
      await new Promise((r) => modSocket.emit('moderator:start_game', { roomCode, moderatorToken }, r));
      await new Promise((r) =>
        modSocket.emit('moderator:set_player_status', { roomCode, moderatorToken, playerId: originalPlayerId, status: 'Saved' }, r)
      );

      // Player closes tab (disconnects socket)
      playerSocket.disconnect();
      await new Promise((r) => setTimeout(r, 40));

      // Player opens new tab (new socket) and reconnects with token via session:reconnect_player
      const newPlayerSocket = createClientSocket();
      await new Promise<void>((r) => newPlayerSocket.on('connect', r));

      const reconnectRes = await new Promise<{ success: boolean; player?: any; roomState?: PublicRoomState }>((r) =>
        newPlayerSocket.emit('session:reconnect_player', { roomCode, playerToken }, r)
      );

      expect(reconnectRes.success).toBe(true);
      expect(reconnectRes.player.id).toBe(originalPlayerId);
      expect(reconnectRes.player.name).toBe('Vito');
      expect(reconnectRes.player.role).toBe('Mafia');
      expect(reconnectRes.player.status).toBe('Saved');

      // Check room state has exactly 1 player (no duplicate seat created)
      expect(reconnectRes.roomState?.playerCount).toBe(1);
      expect(reconnectRes.roomState?.players.length).toBe(1);

      modSocket.disconnect();
      newPlayerSocket.disconnect();
    });

    it('lands in the current advanced round state when reconnecting after round advancement', async () => {
      const modSocket = createClientSocket();
      const playerSocket = createClientSocket();

      await Promise.all([
        new Promise<void>((r) => modSocket.on('connect', r)),
        new Promise<void>((r) => playerSocket.on('connect', r)),
      ]);

      const createRes = await new Promise<{ success: boolean; roomCode?: string; moderatorToken?: string }>((r) =>
        modSocket.emit('room:create', r)
      );
      const roomCode = createRes.roomCode!;
      const moderatorToken = createRes.moderatorToken!;

      const joinRes = await new Promise<{ success: boolean; player?: any; playerToken?: string }>((r) =>
        playerSocket.emit('room:join', { roomCode, playerName: 'Michael' }, r)
      );
      const playerToken = joinRes.playerToken!;

      await new Promise((r) => modSocket.emit('moderator:start_game', { roomCode, moderatorToken }, r));

      // Disconnect player
      playerSocket.disconnect();

      // Moderator advances round twice while player is disconnected
      await new Promise((r) => modSocket.emit('moderator:advance_round', { roomCode, moderatorToken }, r));
      await new Promise((r) => modSocket.emit('moderator:advance_round', { roomCode, moderatorToken }, r));

      // Player reconnects
      const reconnectedSocket = createClientSocket();
      await new Promise<void>((r) => reconnectedSocket.on('connect', r));

      const reconnectRes = await new Promise<{ success: boolean; player?: any; roomState?: PublicRoomState }>((r) =>
        reconnectedSocket.emit('session:reconnect_player', { roomCode, playerToken }, r)
      );

      expect(reconnectRes.success).toBe(true);
      expect(reconnectRes.roomState?.round).toBe(3);
      expect(reconnectRes.roomState?.status).toBe('in_game');

      modSocket.disconnect();
      reconnectedSocket.disconnect();
    });

    it('moderator "Resend Join Link" fallback reconnects a player whose token/localStorage was lost', async () => {
      const modSocket = createClientSocket();
      const playerSocket = createClientSocket();

      await Promise.all([
        new Promise<void>((r) => modSocket.on('connect', r)),
        new Promise<void>((r) => playerSocket.on('connect', r)),
      ]);

      const createRes = await new Promise<{ success: boolean; roomCode?: string; moderatorToken?: string }>((r) =>
        modSocket.emit('room:create', r)
      );
      const roomCode = createRes.roomCode!;
      const moderatorToken = createRes.moderatorToken!;

      const joinRes = await new Promise<{ success: boolean; player?: any }>((r) =>
        playerSocket.emit('room:join', { roomCode, playerName: 'Sonny' }, r)
      );
      const originalPlayerId = joinRes.player.id;

      await new Promise((r) =>
        modSocket.emit('moderator:assign_role', { roomCode, moderatorToken, playerId: originalPlayerId, role: 'Detective' }, r)
      );

      // Player disconnects and completely loses localStorage / cookies
      playerSocket.disconnect();

      // Moderator retrieves player's reconnect token from moderator state
      let modState: PublicRoomState | null = null;
      await new Promise((r) => {
        modSocket.on('room:state', (s) => {
          modState = s;
          r(null);
        });
        // Trigger a state push
        modSocket.emit('moderator:set_player_status', { roomCode, moderatorToken, playerId: originalPlayerId, status: 'Alive' });
      });

      const sonnyCard = modState!.players.find((p) => p.name === 'Sonny');
      expect(sonnyCard).toBeDefined();
      expect(sonnyCard!.reconnectToken).toBeDefined();

      // Using the moderator's copy-link token fallback, player rejoins from a fresh browser session
      const freshSocket = createClientSocket();
      await new Promise<void>((r) => freshSocket.on('connect', r));

      const fallbackReconnect = await new Promise<{ success: boolean; player?: any; roomState?: PublicRoomState }>((r) =>
        freshSocket.emit('session:reconnect_player', { roomCode, playerToken: sonnyCard!.reconnectToken! }, r)
      );

      expect(fallbackReconnect.success).toBe(true);
      expect(fallbackReconnect.player.id).toBe(originalPlayerId);
      expect(fallbackReconnect.player.name).toBe('Sonny');
      expect(fallbackReconnect.player.role).toBe('Detective');
      expect(fallbackReconnect.roomState?.playerCount).toBe(1);

      modSocket.disconnect();
      freshSocket.disconnect();
    });
  });

  describe('3. Win-Condition & Multi-Mafia Verification', () => {
    it('requires eliminating ALL Mafia before Town wins, and immediately ends on last Mafia death', () => {
      const { roomCode, moderatorToken } = roomManager.createRoom();

      // 2 Mafia + 3 Villagers = 5 players
      const m1 = roomManager.addPlayerDirect(roomCode, 'MafiaBoss');
      const m2 = roomManager.addPlayerDirect(roomCode, 'MafiaUnderboss');
      const v1 = roomManager.addPlayerDirect(roomCode, 'Villager1');
      const v2 = roomManager.addPlayerDirect(roomCode, 'Villager2');
      const v3 = roomManager.addPlayerDirect(roomCode, 'Villager3');

      roomManager.assignRole(roomCode, moderatorToken, m1.player!.id, 'Mafia');
      roomManager.assignRole(roomCode, moderatorToken, m2.player!.id, 'Mafia');
      roomManager.assignRole(roomCode, moderatorToken, v1.player!.id, 'Villager');
      roomManager.assignRole(roomCode, moderatorToken, v2.player!.id, 'Villager');
      roomManager.assignRole(roomCode, moderatorToken, v3.player!.id, 'Villager');

      roomManager.startGame(roomCode, moderatorToken);
      const room = roomManager.getRoom(roomCode)!;
      expect(room.status).toBe('in_game');

      // Eliminate 1st Mafia
      const res1 = roomManager.setPlayerStatus(roomCode, moderatorToken, m1.player!.id, 'Killed');
      expect(res1.success).toBe(true);
      // Game must NOT end yet because 1 Mafia is still alive!
      expect(room.status).toBe('in_game');
      expect(room.winner).toBeNull();
      expect(res1.gameOver).toBeNull();

      // Eliminate 2nd (last) Mafia
      const res2 = roomManager.setPlayerStatus(roomCode, moderatorToken, m2.player!.id, 'Killed');
      expect(res2.success).toBe(true);
      // Game MUST now immediately end with Town victory!
      expect(room.status).toBe('ended');
      expect(room.winner).toBe('Town');
      expect(res2.gameOver?.winner).toBe('Town');

      // Test Un-kill / Revival bug fix: Moderator accidentally toggled m2 to Killed, toggles back to Alive
      const reviveRes = roomManager.setPlayerStatus(roomCode, moderatorToken, m2.player!.id, 'Alive');
      expect(reviveRes.success).toBe(true);
      expect(room.status).toBe('in_game');
      expect(room.winner).toBeNull();
    });

    it('triggers Mafia win immediately when Town count drops to 1', () => {
      const { roomCode, moderatorToken } = roomManager.createRoom();

      // 2 Mafia + 2 Villagers
      const m1 = roomManager.addPlayerDirect(roomCode, 'M1');
      const m2 = roomManager.addPlayerDirect(roomCode, 'M2');
      const v1 = roomManager.addPlayerDirect(roomCode, 'V1');
      const v2 = roomManager.addPlayerDirect(roomCode, 'V2');

      roomManager.assignRole(roomCode, moderatorToken, m1.player!.id, 'Mafia');
      roomManager.assignRole(roomCode, moderatorToken, m2.player!.id, 'Mafia');
      roomManager.assignRole(roomCode, moderatorToken, v1.player!.id, 'Villager');
      roomManager.assignRole(roomCode, moderatorToken, v2.player!.id, 'Villager');

      roomManager.startGame(roomCode, moderatorToken);
      const room = roomManager.getRoom(roomCode)!;

      // Kill 1 Villager -> remaining Villagers = 1 (Town <= 1) while Mafia = 2
      const killRes = roomManager.setPlayerStatus(roomCode, moderatorToken, v1.player!.id, 'Killed');
      expect(killRes.success).toBe(true);
      expect(room.status).toBe('ended');
      expect(room.winner).toBe('Mafia');
      expect(killRes.gameOver?.winner).toBe('Mafia');
    });

    it('voting tie-break restricts re-vote to tied candidates and allows tied candidates to vote', () => {
      const { roomCode, moderatorToken } = roomManager.createRoom();

      const p1 = roomManager.addPlayerDirect(roomCode, 'Player1');
      const p2 = roomManager.addPlayerDirect(roomCode, 'Player2');
      const p3 = roomManager.addPlayerDirect(roomCode, 'Player3');
      const p4 = roomManager.addPlayerDirect(roomCode, 'Player4');

      roomManager.assignRole(roomCode, moderatorToken, p1.player!.id, 'Villager');
      roomManager.assignRole(roomCode, moderatorToken, p2.player!.id, 'Villager');
      roomManager.assignRole(roomCode, moderatorToken, p3.player!.id, 'Mafia');
      roomManager.assignRole(roomCode, moderatorToken, p4.player!.id, 'Villager');

      roomManager.startGame(roomCode, moderatorToken);
      const voteStart = roomManager.startVote(roomCode, moderatorToken);
      expect(voteStart.success).toBe(true);

      // P1 votes P2; P2 votes P3; P3 votes P2; P4 votes P3
      // Tally: P2 (2 votes), P3 (2 votes) -> Tie!
      roomManager.castVoteForPlayer(roomCode, p1.player!.id, p2.player!.id);
      roomManager.castVoteForPlayer(roomCode, p2.player!.id, p3.player!.id);
      roomManager.castVoteForPlayer(roomCode, p3.player!.id, p2.player!.id);
      const tieRes = roomManager.castVoteForPlayer(roomCode, p4.player!.id, p3.player!.id);

      expect(tieRes.isTieBreak).toBe(true);
      expect(tieRes.activeVote?.isTieBreak).toBe(true);

      // Candidate options restricted to tied candidates ONLY: P2 and P3
      const candidateIds = tieRes.activeVote?.candidates.map((c) => c.id);
      expect(candidateIds).toContain(p2.player!.id);
      expect(candidateIds).toContain(p3.player!.id);
      expect(candidateIds).not.toContain(p1.player!.id);
      expect(candidateIds).not.toContain(p4.player!.id);

      // Tied candidates ARE allowed to vote in tie-break re-vote:
      const tiedVote1 = roomManager.castVoteForPlayer(roomCode, p2.player!.id, p3.player!.id);
      expect(tiedVote1.success).toBe(true);

      const tiedVote2 = roomManager.castVoteForPlayer(roomCode, p3.player!.id, p2.player!.id);
      expect(tiedVote2.success).toBe(true);

      // Remaining players cast tie-break votes
      roomManager.castVoteForPlayer(roomCode, p1.player!.id, p3.player!.id);
      const resolveRes = roomManager.castVoteForPlayer(roomCode, p4.player!.id, p3.player!.id);

      // P3 receives 3 votes, P2 receives 1 vote -> P3 eliminated!
      expect(resolveRes.isResolved).toBe(true);
      expect(resolveRes.eliminatedPlayer?.id).toBe(p3.player!.id);
      expect(resolveRes.eliminatedPlayer?.status).toBe('Killed');
      // P3 was the only Mafia -> Town wins!
      expect(resolveRes.gameOver?.winner).toBe('Town');
    });
  });

  describe('4. Room & Mode Integrity Testing', () => {
    it('kicking a player rejects reconnection with stale token and removes player from roster', async () => {
      const modSocket = createClientSocket();
      const playerSocket = createClientSocket();

      await Promise.all([
        new Promise<void>((r) => modSocket.on('connect', r)),
        new Promise<void>((r) => playerSocket.on('connect', r)),
      ]);

      const createRes = await new Promise<{ success: boolean; roomCode?: string; moderatorToken?: string }>((r) =>
        modSocket.emit('room:create', r)
      );
      const roomCode = createRes.roomCode!;
      const moderatorToken = createRes.moderatorToken!;

      const joinRes = await new Promise<{ success: boolean; player?: any; playerToken?: string }>((r) =>
        playerSocket.emit('room:join', { roomCode, playerName: 'Fredo' }, r)
      );
      const playerToken = joinRes.playerToken!;
      const playerId = joinRes.player.id;

      let kickedEventReceived = false;
      playerSocket.on('player:kicked', () => {
        kickedEventReceived = true;
      });

      // Moderator kicks Fredo
      const kickRes = await new Promise<{ success: boolean }>((r) =>
        modSocket.emit('moderator:kick_player', { roomCode, moderatorToken, playerId }, r)
      );
      expect(kickRes.success).toBe(true);
      await new Promise((r) => setTimeout(r, 40));
      expect(kickedEventReceived).toBe(true);

      // Fredo tries to reconnect using his stale playerToken
      const tryReconnect = await new Promise<{ success: boolean; error?: string }>((r) =>
        playerSocket.emit('session:reconnect_player', { roomCode, playerToken }, r)
      );
      expect(tryReconnect.success).toBe(false);
      expect(tryReconnect.error).toContain('seat not found');

      modSocket.disconnect();
      playerSocket.disconnect();
    });

    it('Play Again resets roles, statuses, and history while preserving connected players', async () => {
      const modSocket = createClientSocket();
      const p1Socket = createClientSocket();
      const p2Socket = createClientSocket();

      await Promise.all([
        new Promise<void>((r) => modSocket.on('connect', r)),
        new Promise<void>((r) => p1Socket.on('connect', r)),
        new Promise<void>((r) => p2Socket.on('connect', r)),
      ]);

      const createRes = await new Promise<{ success: boolean; roomCode?: string; moderatorToken?: string }>((r) =>
        modSocket.emit('room:create', r)
      );
      const roomCode = createRes.roomCode!;
      const moderatorToken = createRes.moderatorToken!;

      const p1 = await new Promise<{ success: boolean; player?: any }>((r) =>
        p1Socket.emit('room:join', { roomCode, playerName: 'P1' }, r)
      );
      const p2 = await new Promise<{ success: boolean; player?: any }>((r) =>
        p2Socket.emit('room:join', { roomCode, playerName: 'P2' }, r)
      );

      await new Promise((r) => modSocket.emit('moderator:assign_role', { roomCode, moderatorToken, playerId: p1.player.id, role: 'Mafia' }, r));
      await new Promise((r) => modSocket.emit('moderator:assign_role', { roomCode, moderatorToken, playerId: p2.player.id, role: 'Villager' }, r));
      await new Promise((r) => modSocket.emit('moderator:start_game', { roomCode, moderatorToken }, r));
      await new Promise((r) => modSocket.emit('moderator:advance_round', { roomCode, moderatorToken }, r));
      await new Promise((r) => modSocket.emit('moderator:set_player_status', { roomCode, moderatorToken, playerId: p1.player.id, status: 'Killed' }, r));

      let p1ResetState: PublicRoomState | null = null;
      p1Socket.on('room:state', (s) => {
        p1ResetState = s;
      });

      // Moderator clicks Play Again
      const playAgainRes = await new Promise<{ success: boolean }>((r) =>
        modSocket.emit('moderator:play_again', { roomCode, moderatorToken }, r)
      );
      expect(playAgainRes.success).toBe(true);
      await new Promise((r) => setTimeout(r, 60));

      expect(p1ResetState).not.toBeNull();
      expect(p1ResetState!.round).toBe(1);
      expect(p1ResetState!.winner).toBeNull();
      expect(p1ResetState!.playerCount).toBe(2);

      for (const p of p1ResetState!.players) {
        expect(p.status).toBe('Alive');
        expect(p.role).toBeNull();
      }

      modSocket.disconnect();
      p1Socket.disconnect();
      p2Socket.disconnect();
    });

    it('Two-Phone sequential reveal clears screen before next player reveal', async () => {
      const modSocket = createClientSocket();
      const sharedSocket = createClientSocket();

      await Promise.all([
        new Promise<void>((r) => modSocket.on('connect', r)),
        new Promise<void>((r) => sharedSocket.on('connect', r)),
      ]);

      const createRes = await new Promise<{ success: boolean; roomCode?: string; moderatorToken?: string }>((r) =>
        modSocket.emit('room:create', { gameMode: 'two_phone' }, r)
      );
      const roomCode = createRes.roomCode!;
      const moderatorToken = createRes.moderatorToken!;

      await new Promise((r) => sharedSocket.emit('room:join_shared', { roomCode }, r));

      const add1 = await new Promise<{ success: boolean; player?: any }>((r) =>
        modSocket.emit('moderator:add_player', { roomCode, moderatorToken, playerName: 'PlayerOne' }, r)
      );
      const add2 = await new Promise<{ success: boolean; player?: any }>((r) =>
        modSocket.emit('moderator:add_player', { roomCode, moderatorToken, playerName: 'PlayerTwo' }, r)
      );

      await new Promise((r) => modSocket.emit('moderator:assign_role', { roomCode, moderatorToken, playerId: add1.player.id, role: 'Doctor' }, r));
      await new Promise((r) => modSocket.emit('moderator:assign_role', { roomCode, moderatorToken, playerId: add2.player.id, role: 'Mafia' }, r));

      const reveals: any[] = [];
      let clearCount = 0;

      sharedSocket.on('shared:show_role_reveal', (payload) => reveals.push(payload));
      sharedSocket.on('shared:clear_role_reveal', () => clearCount++);

      // 1. Reveal PlayerOne
      await new Promise((r) =>
        modSocket.emit('moderator:reveal_role_to_shared', { roomCode, moderatorToken, playerId: add1.player.id }, r)
      );
      await new Promise((r) => setTimeout(r, 40));
      expect(reveals.length).toBe(1);
      expect(reveals[0].playerName).toBe('PlayerOne');
      expect(reveals[0].role).toBe('Doctor');

      // 2. Clear reveal before handoff
      await new Promise((r) => sharedSocket.emit('shared:clear_role_reveal', { roomCode }, r));
      await new Promise((r) => setTimeout(r, 40));
      expect(clearCount).toBe(1);

      // 3. Reveal PlayerTwo
      await new Promise((r) =>
        modSocket.emit('moderator:reveal_role_to_shared', { roomCode, moderatorToken, playerId: add2.player.id }, r)
      );
      await new Promise((r) => setTimeout(r, 40));
      expect(reveals.length).toBe(2);
      expect(reveals[1].playerName).toBe('PlayerTwo');
      expect(reveals[1].role).toBe('Mafia');

      modSocket.disconnect();
      sharedSocket.disconnect();
    });
  });
});
