import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import http from 'http';
import express from 'express';
import { AddressInfo } from 'net';
import { Server as SocketIOServer } from 'socket.io';
import { io as ClientSocket, Socket as ClientSocketType } from 'socket.io-client';
import { RoomManager } from '../src/roomManager';
import { registerSocketHandlers } from '../src/socketHandlers';
import { ClientToServerEvents, ServerToClientEvents, ActiveVoteState } from '../src/types';

describe('Day-Phase Voting System Tests', () => {
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

  it('Unit: vote start, casting, and auto-resolution mechanics', () => {
    const { roomCode, moderatorToken } = roomManager.createRoom();
    const p1 = roomManager.addPlayer(roomCode, 'Vito', 's1');
    const p2 = roomManager.addPlayer(roomCode, 'Michael', 's2');
    const p3 = roomManager.addPlayer(roomCode, 'Sonny', 's3');

    roomManager.assignRole(roomCode, moderatorToken, p1.player!.id, 'Mafia');
    roomManager.assignRole(roomCode, moderatorToken, p2.player!.id, 'Villager');
    roomManager.assignRole(roomCode, moderatorToken, p3.player!.id, 'Villager');

    roomManager.startGame(roomCode, moderatorToken);

    // 1. Start Vote
    const startRes = roomManager.startVote(roomCode, moderatorToken);
    expect(startRes.success).toBe(true);
    expect(startRes.activeVote?.candidates).toHaveLength(3);
    expect(startRes.activeVote?.totalVotersNeeded).toBe(3);

    // 2. Cast Votes
    const vote1 = roomManager.castVote(roomCode, p1.playerToken!, p2.player!.id);
    expect(vote1.success).toBe(true);
    expect(vote1.activeVote?.totalVotesCast).toBe(1);

    const vote2 = roomManager.castVote(roomCode, p2.playerToken!, p1.player!.id);
    expect(vote2.success).toBe(true);
    expect(vote2.activeVote?.totalVotesCast).toBe(2);

    // 3. Final Vote -> Auto-Resolution (Sonny votes for Michael)
    const vote3 = roomManager.castVote(roomCode, p3.playerToken!, p2.player!.id);
    expect(vote3.success).toBe(true);
    expect(vote3.isResolved).toBe(true);
    expect(vote3.eliminatedPlayer?.name).toBe('Michael');
    expect(vote3.activeVote).toBeNull();

    const room = roomManager.getRoom(roomCode)!;
    expect(room.players.get(p2.player!.id)?.status).toBe('Killed');
    expect(room.players.get(p2.player!.id)?.isAlive).toBe(false);
  });

  it('Unit: Tie-break triggers re-vote with only tied candidates', () => {
    const { roomCode, moderatorToken } = roomManager.createRoom();
    const p1 = roomManager.addPlayer(roomCode, 'Vito', 's1');
    const p2 = roomManager.addPlayer(roomCode, 'Michael', 's2');
    const p3 = roomManager.addPlayer(roomCode, 'Sonny', 's3');
    const p4 = roomManager.addPlayer(roomCode, 'Fredo', 's4');

    roomManager.assignRole(roomCode, moderatorToken, p1.player!.id, 'Mafia');
    roomManager.assignRole(roomCode, moderatorToken, p2.player!.id, 'Villager');
    roomManager.assignRole(roomCode, moderatorToken, p3.player!.id, 'Villager');
    roomManager.assignRole(roomCode, moderatorToken, p4.player!.id, 'Villager');

    roomManager.startGame(roomCode, moderatorToken);
    roomManager.startVote(roomCode, moderatorToken);

    // Vito & Michael vote for Sonny (2 votes)
    roomManager.castVote(roomCode, p1.playerToken!, p3.player!.id);
    roomManager.castVote(roomCode, p2.playerToken!, p3.player!.id);

    // Sonny & Fredo vote for Michael (2 votes)
    roomManager.castVote(roomCode, p3.playerToken!, p2.player!.id);
    const tieVote = roomManager.castVote(roomCode, p4.playerToken!, p2.player!.id);

    // Assert Tie-Break Re-vote
    expect(tieVote.isTieBreak).toBe(true);
    expect(tieVote.activeVote?.isTieBreak).toBe(true);
    expect(tieVote.activeVote?.candidates).toHaveLength(2);
    expect(tieVote.tiedCandidateNames).toEqual(expect.arrayContaining(['Michael', 'Sonny']));

    // Second round of voting (break tie: Vito, Michael, Fredo vote for Sonny)
    roomManager.castVote(roomCode, p1.playerToken!, p3.player!.id);
    roomManager.castVote(roomCode, p2.playerToken!, p3.player!.id);
    roomManager.castVote(roomCode, p3.playerToken!, p2.player!.id);
    const finalTieBreak = roomManager.castVote(roomCode, p4.playerToken!, p3.player!.id);

    expect(finalTieBreak.isResolved).toBe(true);
    expect(finalTieBreak.eliminatedPlayer?.name).toBe('Sonny');
  });

  it('Socket E2E: Live WhatsApp-poll updates, auto-elimination, and win condition on vote', async () => {
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
    const vitoRes = await new Promise<{ success: boolean; player?: any; playerToken?: string }>((r) => vitoSocket.emit('room:join', { roomCode, playerName: 'Vito' }, r));
    const michaelRes = await new Promise<{ success: boolean; player?: any; playerToken?: string }>((r) => michaelSocket.emit('room:join', { roomCode, playerName: 'Michael' }, r));
    const sonnyRes = await new Promise<{ success: boolean; player?: any; playerToken?: string }>((r) => sonnySocket.emit('room:join', { roomCode, playerName: 'Sonny' }, r));

    // Assign roles: Vito -> Mafia, Michael -> Villager, Sonny -> Villager (1 Mafia, 2 Town)
    await new Promise((r) => modSocket.emit('moderator:assign_role', { roomCode, moderatorToken, playerId: vitoRes.player.id, role: 'Mafia' }, r));
    await new Promise((r) => modSocket.emit('moderator:assign_role', { roomCode, moderatorToken, playerId: michaelRes.player.id, role: 'Villager' }, r));
    await new Promise((r) => modSocket.emit('moderator:assign_role', { roomCode, moderatorToken, playerId: sonnyRes.player.id, role: 'Villager' }, r));

    await new Promise((r) => modSocket.emit('moderator:start_game', { roomCode, moderatorToken }, r));

    // Track events
    let latestVoteStateOnMichael: ActiveVoteState | null = null;
    let vitoKilledEvent: any = null;
    let roleRevealedEvent: any = null;
    let gameEndedEvent: any = null;

    michaelSocket.on('vote:started', (s) => { latestVoteStateOnMichael = s; });
    michaelSocket.on('vote:updated', (s) => { latestVoteStateOnMichael = s; });
    vitoSocket.on('player:killed_notification', (p) => { vitoKilledEvent = p; });
    michaelSocket.on('game:role_revealed', (p) => { roleRevealedEvent = p; });
    michaelSocket.on('game:ended', (p) => { gameEndedEvent = p; });

    // 3. Moderator starts Day Vote
    await new Promise((r) => modSocket.emit('moderator:start_vote', { roomCode, moderatorToken }, r));
    await new Promise((r) => setTimeout(r, 40));

    expect(latestVoteStateOnMichael?.isOpen).toBe(true);
    expect(latestVoteStateOnMichael?.candidates).toHaveLength(3);

    // 4. Vito votes for Michael
    await new Promise((r) => vitoSocket.emit('player:cast_vote', { roomCode, playerToken: vitoRes.playerToken!, candidateId: michaelRes.player.id }, r));
    await new Promise((r) => setTimeout(r, 40));

    // Michael sees Vito's name attached to Michael's candidate entry (WhatsApp poll style)
    const michaelCand = latestVoteStateOnMichael?.candidates.find((c) => c.name === 'Michael');
    expect(michaelCand?.voterNames).toContain('Vito');

    // 5. Michael votes for Vito
    await new Promise((r) => michaelSocket.emit('player:cast_vote', { roomCode, playerToken: michaelRes.playerToken!, candidateId: vitoRes.player.id }, r));
    await new Promise((r) => setTimeout(r, 40));

    // 6. Sonny votes for Vito -> Vito (2 votes) vs Michael (1 vote) -> AUTO-RESOLVES!
    await new Promise((r) => sonnySocket.emit('player:cast_vote', { roomCode, playerToken: sonnyRes.playerToken!, candidateId: vitoRes.player.id }, r));
    await new Promise((r) => setTimeout(r, 60));

    // Assert Vito is eliminated
    expect(vitoKilledEvent?.message).toContain('voted out and eliminated');
    expect(roleRevealedEvent?.playerName).toBe('Vito');
    expect(roleRevealedEvent?.role).toBe('Mafia');

    // Assert Town Wins (since only Mafia was eliminated)
    expect(gameEndedEvent?.winner).toBe('Town');

    modSocket.disconnect();
    vitoSocket.disconnect();
    michaelSocket.disconnect();
    sonnySocket.disconnect();
  });

  it('Unit & Bug 2: 3+ players voting for different targets stores each in votesByPlayer without overwriting', () => {
    const { roomCode, moderatorToken } = roomManager.createRoom();
    const p1 = roomManager.addPlayer(roomCode, 'Alice', 's1');
    const p2 = roomManager.addPlayer(roomCode, 'Bob', 's2');
    const p3 = roomManager.addPlayer(roomCode, 'Charlie', 's3');
    const p4 = roomManager.addPlayer(roomCode, 'Diana', 's4');

    roomManager.assignRole(roomCode, moderatorToken, p1.player!.id, 'Mafia');
    roomManager.assignRole(roomCode, moderatorToken, p2.player!.id, 'Villager');
    roomManager.assignRole(roomCode, moderatorToken, p3.player!.id, 'Villager');
    roomManager.assignRole(roomCode, moderatorToken, p4.player!.id, 'Villager');

    roomManager.startGame(roomCode, moderatorToken);
    const startRes = roomManager.startVote(roomCode, moderatorToken);
    expect(startRes.success).toBe(true);
    expect(startRes.activeVote?.votesByPlayer).toEqual({});

    // 1. Alice votes for Bob
    const vote1 = roomManager.castVote(roomCode, p1.playerToken!, p2.player!.id);
    expect(vote1.success).toBe(true);
    expect(vote1.activeVote?.votesByPlayer?.[p1.player!.id]).toBe(p2.player!.id);
    expect(vote1.activeVote?.totalVotesCast).toBe(1);

    // 2. Bob votes for Charlie
    const vote2 = roomManager.castVote(roomCode, p2.playerToken!, p3.player!.id);
    expect(vote2.success).toBe(true);
    // Crucial: Alice's vote MUST NOT be overwritten
    expect(vote2.activeVote?.votesByPlayer?.[p1.player!.id]).toBe(p2.player!.id);
    expect(vote2.activeVote?.votesByPlayer?.[p2.player!.id]).toBe(p3.player!.id);
    expect(vote2.activeVote?.totalVotesCast).toBe(2);

    // 3. Charlie votes for Diana
    const vote3 = roomManager.castVote(roomCode, p3.playerToken!, p4.player!.id);
    expect(vote3.success).toBe(true);
    // All 3 independent votes persist simultaneously
    expect(vote3.activeVote?.votesByPlayer?.[p1.player!.id]).toBe(p2.player!.id);
    expect(vote3.activeVote?.votesByPlayer?.[p2.player!.id]).toBe(p3.player!.id);
    expect(vote3.activeVote?.votesByPlayer?.[p3.player!.id]).toBe(p4.player!.id);
    expect(vote3.activeVote?.totalVotesCast).toBe(3);

    // Verify candidate tallies and voter names
    const bobCand = vote3.activeVote?.candidates.find((c) => c.id === p2.player!.id);
    const charlieCand = vote3.activeVote?.candidates.find((c) => c.id === p3.player!.id);
    const dianaCand = vote3.activeVote?.candidates.find((c) => c.id === p4.player!.id);

    expect(bobCand?.votes).toEqual([p1.player!.id]);
    expect(bobCand?.voterNames).toEqual(['Alice']);
    expect(charlieCand?.votes).toEqual([p2.player!.id]);
    expect(charlieCand?.voterNames).toEqual(['Bob']);
    expect(dianaCand?.votes).toEqual([p3.player!.id]);
    expect(dianaCand?.voterNames).toEqual(['Charlie']);

    // 4. Alice switches vote to Charlie
    const vote1Switch = roomManager.castVote(roomCode, p1.playerToken!, p3.player!.id);
    expect(vote1Switch.success).toBe(true);
    expect(vote1Switch.activeVote?.votesByPlayer?.[p1.player!.id]).toBe(p3.player!.id);
    expect(vote1Switch.activeVote?.votesByPlayer?.[p2.player!.id]).toBe(p3.player!.id);
    expect(vote1Switch.activeVote?.votesByPlayer?.[p3.player!.id]).toBe(p4.player!.id);
    expect(vote1Switch.activeVote?.totalVotesCast).toBe(3);

    const bobCandAfter = vote1Switch.activeVote?.candidates.find((c) => c.id === p2.player!.id);
    const charlieCandAfter = vote1Switch.activeVote?.candidates.find((c) => c.id === p3.player!.id);
    expect(bobCandAfter?.votes).toHaveLength(0);
    expect(charlieCandAfter?.votes).toHaveLength(2);
    expect(charlieCandAfter?.voterNames).toEqual(expect.arrayContaining(['Alice', 'Bob']));
  });

  it('Socket E2E & Bug 2: 3 simulated players voting for 3 different targets broadcasts all 3 live votes', async () => {
    const modSocket = createClientSocket();
    const s1 = createClientSocket();
    const s2 = createClientSocket();
    const s3 = createClientSocket();
    const s4 = createClientSocket();

    await Promise.all([
      new Promise<void>((r) => modSocket.on('connect', r)),
      new Promise<void>((r) => s1.on('connect', r)),
      new Promise<void>((r) => s2.on('connect', r)),
      new Promise<void>((r) => s3.on('connect', r)),
      new Promise<void>((r) => s4.on('connect', r)),
    ]);

    const modCreate = await new Promise<{ success: boolean; roomCode?: string; moderatorToken?: string }>((res) => {
      modSocket.emit('room:create', res);
    });
    const roomCode = modCreate.roomCode!;
    const moderatorToken = modCreate.moderatorToken!;

    const p1Res = await new Promise<{ success: boolean; player?: any; playerToken?: string }>((r) => s1.emit('room:join', { roomCode, playerName: 'P1' }, r));
    const p2Res = await new Promise<{ success: boolean; player?: any; playerToken?: string }>((r) => s2.emit('room:join', { roomCode, playerName: 'P2' }, r));
    const p3Res = await new Promise<{ success: boolean; player?: any; playerToken?: string }>((r) => s3.emit('room:join', { roomCode, playerName: 'P3' }, r));
    const p4Res = await new Promise<{ success: boolean; player?: any; playerToken?: string }>((r) => s4.emit('room:join', { roomCode, playerName: 'P4' }, r));

    await new Promise((r) => modSocket.emit('moderator:assign_role', { roomCode, moderatorToken, playerId: p1Res.player.id, role: 'Mafia' }, r));
    await new Promise((r) => modSocket.emit('moderator:assign_role', { roomCode, moderatorToken, playerId: p2Res.player.id, role: 'Villager' }, r));
    await new Promise((r) => modSocket.emit('moderator:assign_role', { roomCode, moderatorToken, playerId: p3Res.player.id, role: 'Villager' }, r));
    await new Promise((r) => modSocket.emit('moderator:assign_role', { roomCode, moderatorToken, playerId: p4Res.player.id, role: 'Villager' }, r));

    await new Promise((r) => modSocket.emit('moderator:start_game', { roomCode, moderatorToken }, r));
    await new Promise((r) => modSocket.emit('moderator:start_vote', { roomCode, moderatorToken }, r));

    let latestVoteState: ActiveVoteState | null = null;
    s4.on('vote:updated', (s) => { latestVoteState = s; });

    // P1 votes for P2
    await new Promise((r) => s1.emit('player:cast_vote', { roomCode, playerToken: p1Res.playerToken!, candidateId: p2Res.player.id }, r));
    // P2 votes for P3
    await new Promise((r) => s2.emit('player:cast_vote', { roomCode, playerToken: p2Res.playerToken!, candidateId: p3Res.player.id }, r));
    // P3 votes for P4
    await new Promise((r) => s3.emit('player:cast_vote', { roomCode, playerToken: p3Res.playerToken!, candidateId: p4Res.player.id }, r));
    await new Promise((r) => setTimeout(r, 60));

    expect(latestVoteState).not.toBeNull();
    expect(latestVoteState?.totalVotesCast).toBe(3);
    expect(latestVoteState?.votesByPlayer?.[p1Res.player.id]).toBe(p2Res.player.id);
    expect(latestVoteState?.votesByPlayer?.[p2Res.player.id]).toBe(p3Res.player.id);
    expect(latestVoteState?.votesByPlayer?.[p3Res.player.id]).toBe(p4Res.player.id);

    const cP2 = latestVoteState?.candidates.find((c) => c.id === p2Res.player.id);
    const cP3 = latestVoteState?.candidates.find((c) => c.id === p3Res.player.id);
    const cP4 = latestVoteState?.candidates.find((c) => c.id === p4Res.player.id);

    expect(cP2?.voterNames).toEqual(['P1']);
    expect(cP3?.voterNames).toEqual(['P2']);
    expect(cP4?.voterNames).toEqual(['P3']);

    modSocket.disconnect();
    s1.disconnect();
    s2.disconnect();
    s3.disconnect();
    s4.disconnect();
  });

  it('Unit: rejects self-voting for both token-based and shared-device voting', () => {
    const { roomCode, moderatorToken } = roomManager.createRoom();
    const p1 = roomManager.addPlayer(roomCode, 'Vito', 's1');
    const p2 = roomManager.addPlayer(roomCode, 'Michael', 's2');
    const p3 = roomManager.addPlayer(roomCode, 'Sonny', 's3');

    roomManager.assignRole(roomCode, moderatorToken, p1.player!.id, 'Mafia');
    roomManager.assignRole(roomCode, moderatorToken, p2.player!.id, 'Villager');
    roomManager.assignRole(roomCode, moderatorToken, p3.player!.id, 'Villager');

    roomManager.startGame(roomCode, moderatorToken);
    roomManager.startVote(roomCode, moderatorToken);

    // 1. Token-based self-vote attempt
    const selfVoteRes = roomManager.castVote(roomCode, p1.playerToken!, p1.player!.id);
    expect(selfVoteRes.success).toBe(false);
    expect(selfVoteRes.error).toBe('Players cannot vote for themselves');

    // 2. Shared-device self-vote attempt
    const sharedSelfVoteRes = roomManager.castVoteForPlayer(roomCode, p2.player!.id, p2.player!.id);
    expect(sharedSelfVoteRes.success).toBe(false);
    expect(sharedSelfVoteRes.error).toBe('Players cannot vote for themselves');

    // 3. Confirm no votes recorded
    const room = roomManager.getRoom(roomCode)!;
    expect(room.activeVote?.totalVotesCast).toBe(0);
    expect(room.activeVote?.votesByPlayer).toEqual({});
  });

  it('Unit: Tie-breaker re-vote rejects self-voting but allows voting for other tied candidate', () => {
    const { roomCode, moderatorToken } = roomManager.createRoom();
    const p1 = roomManager.addPlayer(roomCode, 'Vito', 's1');
    const p2 = roomManager.addPlayer(roomCode, 'Michael', 's2');
    const p3 = roomManager.addPlayer(roomCode, 'Sonny', 's3');
    const p4 = roomManager.addPlayer(roomCode, 'Fredo', 's4');

    roomManager.assignRole(roomCode, moderatorToken, p1.player!.id, 'Mafia');
    roomManager.assignRole(roomCode, moderatorToken, p2.player!.id, 'Villager');
    roomManager.assignRole(roomCode, moderatorToken, p3.player!.id, 'Villager');
    roomManager.assignRole(roomCode, moderatorToken, p4.player!.id, 'Villager');

    roomManager.startGame(roomCode, moderatorToken);
    roomManager.startVote(roomCode, moderatorToken);

    // Create tie between Michael (p2) and Sonny (p3)
    roomManager.castVote(roomCode, p1.playerToken!, p3.player!.id); // Vito -> Sonny
    roomManager.castVote(roomCode, p2.playerToken!, p3.player!.id); // Michael -> Sonny
    roomManager.castVote(roomCode, p3.playerToken!, p2.player!.id); // Sonny -> Michael
    const tieRes = roomManager.castVote(roomCode, p4.playerToken!, p2.player!.id); // Fredo -> Michael

    expect(tieRes.isTieBreak).toBe(true);

    // Tied candidate Michael tries to self-vote in tie-break -> REJECTED
    const michaelSelfVote = roomManager.castVote(roomCode, p2.playerToken!, p2.player!.id);
    expect(michaelSelfVote.success).toBe(false);
    expect(michaelSelfVote.error).toBe('Players cannot vote for themselves');

    // Tied candidate Sonny tries to self-vote in tie-break -> REJECTED
    const sonnySelfVote = roomManager.castVote(roomCode, p3.playerToken!, p3.player!.id);
    expect(sonnySelfVote.success).toBe(false);
    expect(sonnySelfVote.error).toBe('Players cannot vote for themselves');

    // Tied candidate Michael votes for tied candidate Sonny -> ALLOWED
    const michaelVoteSonny = roomManager.castVote(roomCode, p2.playerToken!, p3.player!.id);
    expect(michaelVoteSonny.success).toBe(true);
  });

  it('Socket E2E: Manually-crafted self-vote over socket is rejected', async () => {
    const modSocket = createClientSocket();
    const s1 = createClientSocket();
    const s2 = createClientSocket();
    const s3 = createClientSocket();

    await Promise.all([
      new Promise<void>((r) => modSocket.on('connect', r)),
      new Promise<void>((r) => s1.on('connect', r)),
      new Promise<void>((r) => s2.on('connect', r)),
      new Promise<void>((r) => s3.on('connect', r)),
    ]);

    const modCreate = await new Promise<{ success: boolean; roomCode?: string; moderatorToken?: string }>((res) => {
      modSocket.emit('room:create', res);
    });
    const roomCode = modCreate.roomCode!;
    const moderatorToken = modCreate.moderatorToken!;

    const p1Res = await new Promise<{ success: boolean; player?: any; playerToken?: string }>((r) => s1.emit('room:join', { roomCode, playerName: 'P1' }, r));
    const p2Res = await new Promise<{ success: boolean; player?: any; playerToken?: string }>((r) => s2.emit('room:join', { roomCode, playerName: 'P2' }, r));
    const p3Res = await new Promise<{ success: boolean; player?: any; playerToken?: string }>((r) => s3.emit('room:join', { roomCode, playerName: 'P3' }, r));

    await new Promise((r) => modSocket.emit('moderator:assign_role', { roomCode, moderatorToken, playerId: p1Res.player.id, role: 'Mafia' }, r));
    await new Promise((r) => modSocket.emit('moderator:assign_role', { roomCode, moderatorToken, playerId: p2Res.player.id, role: 'Villager' }, r));
    await new Promise((r) => modSocket.emit('moderator:assign_role', { roomCode, moderatorToken, playerId: p3Res.player.id, role: 'Villager' }, r));

    await new Promise((r) => modSocket.emit('moderator:start_game', { roomCode, moderatorToken }, r));
    await new Promise((r) => modSocket.emit('moderator:start_vote', { roomCode, moderatorToken }, r));

    // P1 attempts to vote for P1
    const p1SelfVoteRes = await new Promise<{ success: boolean; error?: string }>((r) => {
      s1.emit('player:cast_vote', { roomCode, playerToken: p1Res.playerToken!, candidateId: p1Res.player.id }, r);
    });

    expect(p1SelfVoteRes.success).toBe(false);
    expect(p1SelfVoteRes.error).toBe('Players cannot vote for themselves');

    // Shared vote self-vote attempt
    const sharedSelfVoteRes = await new Promise<{ success: boolean; error?: string }>((r) => {
      s2.emit('shared:cast_vote', { roomCode, voterId: p2Res.player.id, candidateId: p2Res.player.id }, r);
    });

    expect(sharedSelfVoteRes.success).toBe(false);
    expect(sharedSelfVoteRes.error).toBe('Players cannot vote for themselves');

    // Valid vote passes
    const validVoteRes = await new Promise<{ success: boolean; error?: string }>((r) => {
      s1.emit('player:cast_vote', { roomCode, playerToken: p1Res.playerToken!, candidateId: p2Res.player.id }, r);
    });
    expect(validVoteRes.success).toBe(true);

    modSocket.disconnect();
    s1.disconnect();
    s2.disconnect();
    s3.disconnect();
  });
});
