import { v4 as uuidv4 } from 'uuid';
import {
  ActiveVoteState,
  GameMode,
  Player,
  PlayerStatus,
  PublicPlayer,
  PublicRoomState,
  PublicRoundSection,
  Role,
  Room,
  VoteCandidate,
} from './types';

// Characters excluding ambiguous ones (0, O, 1, I, L)
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 5;

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  // Map socketId -> { roomCode, isModerator, playerId } for fast disconnect lookup
  private socketLookup: Map<string, { roomCode: string; isModerator: boolean; playerId?: string }> = new Map();

  /**
   * Generates a unique uppercase room code.
   */
  public generateRoomCode(): string {
    let code: string;
    let attempts = 0;
    do {
      code = '';
      for (let i = 0; i < CODE_LENGTH; i++) {
        const randomIndex = Math.floor(Math.random() * CODE_CHARS.length);
        code += CODE_CHARS[randomIndex];
      }
      attempts++;
      if (attempts > 1000) {
        throw new Error('Unable to generate unique room code');
      }
    } while (this.rooms.has(code));

    return code;
  }

  /**
   * Creates a new room with a moderator token and gameMode.
   */
  public createRoom(
    moderatorSocketId?: string,
    gameMode: GameMode = 'multi_phone'
  ): { room: Room; roomCode: string; moderatorToken: string } {
    const roomCode = this.generateRoomCode();
    const moderatorToken = uuidv4();

    const room: Room = {
      code: roomCode,
      moderatorToken,
      moderatorSocketId: moderatorSocketId || null,
      moderatorConnected: !!moderatorSocketId,
      sharedSocketId: null,
      gameMode,
      createdAt: Date.now(),
      status: 'lobby',
      round: 1,
      winner: null,
      rounds: [],
      activeVote: null,
      playerVotes: new Map(),
      players: new Map(),
    };

    this.rooms.set(roomCode, room);

    if (moderatorSocketId) {
      this.socketLookup.set(moderatorSocketId, { roomCode, isModerator: true });
    }

    return { room, roomCode, moderatorToken };
  }

  /**
   * Validates if a room code exists and is active.
   */
  public validateRoom(roomCode: string): { valid: boolean; error?: string; gameMode?: GameMode } {
    const normalizedCode = (roomCode || '').trim().toUpperCase();
    if (!normalizedCode) {
      return { valid: false, error: 'Room code cannot be empty' };
    }

    const room = this.rooms.get(normalizedCode);
    if (!room) {
      return { valid: false, error: 'Room not found or no longer active' };
    }

    if (room.status === 'ended' && room.winner === null) {
      return { valid: false, error: 'This game has already ended' };
    }

    return { valid: true, gameMode: room.gameMode };
  }

  /**
   * Retrieves a room by its code.
   */
  public getRoom(roomCode: string): Room | null {
    const normalizedCode = (roomCode || '').trim().toUpperCase();
    return this.rooms.get(normalizedCode) || null;
  }

  /**
   * Adds a new player to the room.
   */
  public addPlayer(
    roomCode: string,
    rawName: string,
    socketId: string
  ): { success: boolean; playerToken?: string; player?: PublicPlayer; error?: string } {
    const normalizedCode = (roomCode || '').trim().toUpperCase();
    const room = this.rooms.get(normalizedCode);

    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    const name = (rawName || '').trim();
    if (!name) {
      return { success: false, error: 'Player name cannot be empty' };
    }

    if (name.length > 20) {
      return { success: false, error: 'Player name must be 20 characters or fewer' };
    }

    // Check for duplicate names (case-insensitive)
    for (const existingPlayer of room.players.values()) {
      if (existingPlayer.name.toLowerCase() === name.toLowerCase()) {
        return { success: false, error: `A player named "${name}" is already in this room` };
      }
    }

    const playerId = uuidv4();
    const playerToken = uuidv4();

    const newPlayer: Player = {
      id: playerId,
      name,
      token: playerToken,
      socketId,
      isConnected: true,
      joinedAt: Date.now(),
      role: null,
      status: 'Alive',
      isAlive: true,
    };

    room.players.set(playerId, newPlayer);
    this.socketLookup.set(socketId, { roomCode: normalizedCode, isModerator: false, playerId });

    return {
      success: true,
      playerToken,
      player: this.toPublicPlayer(newPlayer, true),
    };
  }

  /**
   * Adds a player directly to the room (used in two-phone mode by moderator or shared device).
   */
  public addPlayerDirect(
    roomCode: string,
    rawName: string
  ): { success: boolean; playerToken?: string; player?: PublicPlayer; error?: string } {
    const normalizedCode = (roomCode || '').trim().toUpperCase();
    const room = this.rooms.get(normalizedCode);

    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    const name = (rawName || '').trim();
    if (!name) {
      return { success: false, error: 'Player name cannot be empty' };
    }

    if (name.length > 20) {
      return { success: false, error: 'Player name must be 20 characters or fewer' };
    }

    // Check for duplicate names (case-insensitive)
    for (const existingPlayer of room.players.values()) {
      if (existingPlayer.name.toLowerCase() === name.toLowerCase()) {
        return { success: false, error: `A player named "${name}" is already in this room` };
      }
    }

    const playerId = uuidv4();
    const playerToken = uuidv4();

    const newPlayer: Player = {
      id: playerId,
      name,
      token: playerToken,
      socketId: null,
      isConnected: true,
      joinedAt: Date.now(),
      role: null,
      status: 'Alive',
      isAlive: true,
    };

    room.players.set(playerId, newPlayer);

    // If game has already started, ensure new player is included in current round section
    if (room.status === 'in_game' && room.rounds.length > 0) {
      const currentSection = room.rounds[room.rounds.length - 1];
      if (!currentSection.playerIds.includes(playerId)) {
        currentSection.playerIds.push(playerId);
      }
    }

    return {
      success: true,
      playerToken,
      player: this.toPublicPlayer(newPlayer, true),
    };
  }

  /**
   * Starts the game / enters in_game mode and initializes Round 1.
   */
  public startGame(roomCode: string, moderatorToken: string): { success: boolean; error?: string } {
    const normalizedCode = (roomCode || '').trim().toUpperCase();
    const room = this.rooms.get(normalizedCode);

    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    if (room.moderatorToken !== moderatorToken) {
      return { success: false, error: 'Unauthorized: invalid moderator token' };
    }

    room.status = 'in_game';
    room.round = 1;
    room.winner = null;

    const allPlayerIds = Array.from(room.players.values())
      .sort((a, b) => a.joinedAt - b.joinedAt)
      .map((p) => p.id);

    room.rounds = [{ round: 1, playerIds: allPlayerIds }];

    return { success: true };
  }

  /**
   * Assigns a role to a player (Moderator only).
   */
  public assignRole(
    roomCode: string,
    moderatorToken: string,
    playerId: string,
    role: Role | null
  ): { success: boolean; player?: Player; error?: string } {
    const normalizedCode = (roomCode || '').trim().toUpperCase();
    const room = this.rooms.get(normalizedCode);

    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    if (room.moderatorToken !== moderatorToken) {
      return { success: false, error: 'Unauthorized: invalid moderator token' };
    }

    const player = room.players.get(playerId);
    if (!player) {
      return { success: false, error: 'Player not found in this room' };
    }

    player.role = role;
    return { success: true, player };
  }

  /**
   * Sets player status (Alive, Killed, Saved, Detected).
   * If status is Killed, evaluates win conditions.
   */
  public setPlayerStatus(
    roomCode: string,
    moderatorToken: string,
    playerId: string,
    status: PlayerStatus
  ): {
    success: boolean;
    player?: Player;
    revealedRole?: Role | null;
    gameOver?: { winner: 'Town' | 'Mafia'; reason: string } | null;
    error?: string;
  } {
    const normalizedCode = (roomCode || '').trim().toUpperCase();
    const room = this.rooms.get(normalizedCode);

    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    if (room.moderatorToken !== moderatorToken) {
      return { success: false, error: 'Unauthorized: invalid moderator token' };
    }

    const player = room.players.get(playerId);
    if (!player) {
      return { success: false, error: 'Player not found in this room' };
    }

    player.status = status;
    player.isAlive = status !== 'Killed';

    let gameOver: { winner: 'Town' | 'Mafia'; reason: string } | null = null;

    if (status === 'Killed') {
      gameOver = this.checkWinCondition(room);
    } else if (room.status === 'ended') {
      room.status = 'in_game';
      room.winner = null;
      gameOver = this.checkWinCondition(room);
    }

    return {
      success: true,
      player,
      revealedRole: player.role,
      gameOver,
    };
  }

  /**
   * Toggles a player alive/killed status (Moderator only).
   */
  public togglePlayerAlive(
    roomCode: string,
    moderatorToken: string,
    playerId: string,
    isAlive: boolean
  ): { success: boolean; player?: Player; gameOver?: { winner: 'Town' | 'Mafia'; reason: string } | null; error?: string } {
    return this.setPlayerStatus(roomCode, moderatorToken, playerId, isAlive ? 'Alive' : 'Killed');
  }

  /**
   * Evaluates win conditions:
   * - Town wins if alive Mafia count == 0 (and at least 1 Mafia was in game).
   * - Mafia wins if alive Town count (non-Mafia) <= 1 and alive Mafia >= 1.
   */
  public checkWinCondition(room: Room): { winner: 'Town' | 'Mafia'; reason: string } | null {
    const players = Array.from(room.players.values());

    const totalMafiaAssigned = players.filter((p) => p.role === 'Mafia').length;
    if (totalMafiaAssigned === 0) {
      return null;
    }

    const aliveMafia = players.filter((p) => p.isAlive && p.role === 'Mafia').length;
    const aliveTown = players.filter((p) => p.isAlive && p.role !== 'Mafia').length;

    if (aliveMafia === 0) {
      room.status = 'ended';
      room.winner = 'Town';
      return {
        winner: 'Town',
        reason: 'All Mafia members have been eliminated! The Town is victorious!',
      };
    }

    if (aliveTown <= 1 && aliveMafia >= 1) {
      room.status = 'ended';
      room.winner = 'Mafia';
      return {
        winner: 'Mafia',
        reason: 'The Mafia has overrun the town! Only 1 Town member remains alive.',
      };
    }

    return null;
  }

  /**
   * Starts a Day Vote among all currently alive players.
   */
  public startVote(
    roomCode: string,
    moderatorToken: string
  ): { success: boolean; activeVote?: ActiveVoteState; error?: string } {
    const normalizedCode = (roomCode || '').trim().toUpperCase();
    const room = this.rooms.get(normalizedCode);

    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    if (room.moderatorToken !== moderatorToken) {
      return { success: false, error: 'Unauthorized: invalid moderator token' };
    }

    if (room.status !== 'in_game') {
      return { success: false, error: 'Game is not currently in progress' };
    }

    const alivePlayers = Array.from(room.players.values())
      .filter((p) => p.isAlive)
      .sort((a, b) => a.joinedAt - b.joinedAt);

    if (alivePlayers.length < 2) {
      return { success: false, error: 'At least 2 alive players are required to start a vote' };
    }

    const candidates: VoteCandidate[] = alivePlayers.map((p) => ({
      id: p.id,
      name: p.name,
      votes: [],
      voterNames: [],
    }));

    room.playerVotes.clear();
    room.activeVote = {
      isOpen: true,
      round: room.round,
      isTieBreak: false,
      candidates,
      votesByPlayer: {},
      totalVotesCast: 0,
      totalVotersNeeded: alivePlayers.length,
    };

    return { success: true, activeVote: room.activeVote };
  }

  /**
   * Casts a vote on behalf of a specific player ID (used by both multi-phone and two-phone shared device).
   * If all alive players have voted, auto-resolves the vote (or triggers tie-break).
   */
  public castVoteForPlayer(
    roomCode: string,
    voterId: string,
    candidateId: string
  ): {
    success: boolean;
    activeVote?: ActiveVoteState | null;
    isTieBreak?: boolean;
    tiedCandidateNames?: string[];
    isResolved?: boolean;
    eliminatedPlayer?: Player;
    revealedRole?: Role | null;
    gameOver?: { winner: 'Town' | 'Mafia'; reason: string } | null;
    error?: string;
  } {
    const normalizedCode = (roomCode || '').trim().toUpperCase();
    const room = this.rooms.get(normalizedCode);

    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    if (!room.activeVote || !room.activeVote.isOpen) {
      return { success: false, error: 'No active voting session in progress' };
    }

    const voter = room.players.get(voterId);
    if (!voter) {
      return { success: false, error: 'Player not found in this room' };
    }

    if (!voter.isAlive) {
      return { success: false, error: 'Dead players cannot vote' };
    }

    if (voter.id === candidateId) {
      return { success: false, error: 'Players cannot vote for themselves' };
    }

    const candidateExists = room.activeVote.candidates.some((c) => c.id === candidateId);
    if (!candidateExists) {
      return { success: false, error: 'Selected candidate is not eligible in this vote' };
    }

    // Store vote keyed by voter ID
    room.playerVotes.set(voter.id, candidateId);
    if (!room.activeVote.votesByPlayer) {
      room.activeVote.votesByPlayer = {};
    }
    room.activeVote.votesByPlayer[voter.id] = candidateId;

    for (const cand of room.activeVote.candidates) {
      cand.votes = [];
      cand.voterNames = [];
    }

    for (const [vId, candId] of room.playerVotes.entries()) {
      const targetCandidate = room.activeVote.candidates.find((c) => c.id === candId);
      const voterObj = room.players.get(vId);
      if (targetCandidate && voterObj) {
        targetCandidate.votes.push(vId);
        targetCandidate.voterNames.push(voterObj.name);
      }
    }

    room.activeVote.totalVotesCast = room.playerVotes.size;

    // Check if ALL alive players have voted -> Auto-Resolution
    if (room.activeVote.totalVotesCast >= room.activeVote.totalVotersNeeded) {
      const maxVotes = Math.max(...room.activeVote.candidates.map((c) => c.votes.length));
      const topCandidates = room.activeVote.candidates.filter((c) => c.votes.length === maxVotes);

      if (topCandidates.length > 1) {
        // TIE BREAK: Immediate re-vote restricted to ONLY tied candidates
        // Tied players are allowed to vote in their own tie-breaker re-vote
        const aliveVotersCount = Array.from(room.players.values()).filter((p) => p.isAlive).length;
        room.playerVotes.clear();

        const tieBreakCandidates: VoteCandidate[] = topCandidates.map((c) => ({
          id: c.id,
          name: c.name,
          votes: [],
          voterNames: [],
        }));

        room.activeVote = {
          isOpen: true,
          round: room.round,
          isTieBreak: true,
          candidates: tieBreakCandidates,
          votesByPlayer: {},
          totalVotesCast: 0,
          totalVotersNeeded: aliveVotersCount,
        };

        return {
          success: true,
          isTieBreak: true,
          tiedCandidateNames: topCandidates.map((c) => c.name),
          activeVote: room.activeVote,
        };
      } else if (topCandidates.length === 1) {
        // SINGLE WINNER: Eliminated
        const eliminatedPlayerId = topCandidates[0].id;
        const elimResult = this.setPlayerStatus(roomCode, room.moderatorToken, eliminatedPlayerId, 'Killed');

        room.activeVote = null;
        room.playerVotes.clear();

        return {
          success: true,
          isResolved: true,
          eliminatedPlayer: elimResult.player,
          revealedRole: elimResult.revealedRole,
          gameOver: elimResult.gameOver,
          activeVote: null,
        };
      }
    }

    return {
      success: true,
      activeVote: room.activeVote,
    };
  }

  /**
   * Casts or changes a player's vote via session token.
   */
  public castVote(
    roomCode: string,
    playerToken: string,
    candidateId: string
  ): {
    success: boolean;
    activeVote?: ActiveVoteState | null;
    isTieBreak?: boolean;
    tiedCandidateNames?: string[];
    isResolved?: boolean;
    eliminatedPlayer?: Player;
    revealedRole?: Role | null;
    gameOver?: { winner: 'Town' | 'Mafia'; reason: string } | null;
    error?: string;
  } {
    const normalizedCode = (roomCode || '').trim().toUpperCase();
    const room = this.rooms.get(normalizedCode);

    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    let voter: Player | null = null;
    for (const p of room.players.values()) {
      if (p.token === playerToken) {
        voter = p;
        break;
      }
    }

    if (!voter) {
      return { success: false, error: 'Player session not found' };
    }

    return this.castVoteForPlayer(roomCode, voter.id, candidateId);
  }

  /**
   * Cancels the active vote (Moderator only).
   */
  public cancelVote(
    roomCode: string,
    moderatorToken: string
  ): { success: boolean; error?: string } {
    const normalizedCode = (roomCode || '').trim().toUpperCase();
    const room = this.rooms.get(normalizedCode);

    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    if (room.moderatorToken !== moderatorToken) {
      return { success: false, error: 'Unauthorized: invalid moderator token' };
    }

    room.activeVote = null;
    room.playerVotes.clear();

    return { success: true };
  }

  /**
   * Resets the game completely for a new match (Play Again flow).
   * - Clears all role assignments
   * - Resets all player statuses to 'Alive'
   * - Clears round history and sets round back to 1
   * - Clears winner, active votes, and resets status to 'in_game'
   */
  public playAgain(
    roomCode: string,
    moderatorToken: string
  ): { success: boolean; error?: string } {
    const normalizedCode = (roomCode || '').trim().toUpperCase();
    const room = this.rooms.get(normalizedCode);

    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    if (room.moderatorToken !== moderatorToken) {
      return { success: false, error: 'Unauthorized: invalid moderator token' };
    }

    // 1. Reset all players
    for (const player of room.players.values()) {
      player.role = null;
      player.status = 'Alive';
      player.isAlive = true;
    }

    // 2. Reset room state
    room.status = 'in_game';
    room.round = 1;
    room.winner = null;
    room.activeVote = null;
    room.playerVotes.clear();

    const allPlayerIds = Array.from(room.players.values())
      .sort((a, b) => a.joinedAt - b.joinedAt)
      .map((p) => p.id);

    room.rounds = [{ round: 1, playerIds: allPlayerIds }];

    return { success: true };
  }

  /**
   * Advances the game to the next round.
   * Creates a new RoundSection with ONLY currently alive players.
   */
  public advanceRound(
    roomCode: string,
    moderatorToken: string
  ): { success: boolean; round?: number; error?: string } {
    const normalizedCode = (roomCode || '').trim().toUpperCase();
    const room = this.rooms.get(normalizedCode);

    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    if (room.moderatorToken !== moderatorToken) {
      return { success: false, error: 'Unauthorized: invalid moderator token' };
    }

    room.round += 1;
    room.activeVote = null;
    room.playerVotes.clear();

    const alivePlayerIds = Array.from(room.players.values())
      .filter((p) => p.isAlive)
      .sort((a, b) => a.joinedAt - b.joinedAt)
      .map((p) => p.id);

    room.rounds.push({
      round: room.round,
      playerIds: alivePlayerIds,
    });

    return { success: true, round: room.round };
  }

  /**
   * Reconnects a moderator using their stored session token.
   */
  public reconnectModerator(
    roomCode: string,
    moderatorToken: string,
    newSocketId: string
  ): { success: boolean; roomState?: PublicRoomState; error?: string } {
    const normalizedCode = (roomCode || '').trim().toUpperCase();
    const room = this.rooms.get(normalizedCode);

    if (!room) {
      return { success: false, error: 'Room not found or no longer active' };
    }

    if (room.moderatorToken !== moderatorToken) {
      return { success: false, error: 'Invalid moderator session token' };
    }

    if (room.moderatorSocketId && room.moderatorSocketId !== newSocketId) {
      this.socketLookup.delete(room.moderatorSocketId);
    }

    room.moderatorSocketId = newSocketId;
    room.moderatorConnected = true;
    this.socketLookup.set(newSocketId, { roomCode: normalizedCode, isModerator: true });

    return {
      success: true,
      roomState: this.toPublicRoomState(room),
    };
  }

  /**
   * Reconnects an existing player using their stored session token.
   */
  public reconnectPlayer(
    roomCode: string,
    playerToken: string,
    newSocketId: string
  ): { success: boolean; player?: PublicPlayer; roomState?: PublicRoomState; error?: string } {
    const normalizedCode = (roomCode || '').trim().toUpperCase();
    const room = this.rooms.get(normalizedCode);

    if (!room) {
      return { success: false, error: 'Room not found or no longer active' };
    }

    let matchedPlayer: Player | null = null;
    for (const player of room.players.values()) {
      if (player.token === playerToken) {
        matchedPlayer = player;
        break;
      }
    }

    if (!matchedPlayer) {
      return { success: false, error: 'Session expired or player seat not found' };
    }

    if (matchedPlayer.socketId && matchedPlayer.socketId !== newSocketId) {
      this.socketLookup.delete(matchedPlayer.socketId);
    }

    matchedPlayer.socketId = newSocketId;
    matchedPlayer.isConnected = true;
    this.socketLookup.set(newSocketId, { roomCode: normalizedCode, isModerator: false, playerId: matchedPlayer.id });

    return {
      success: true,
      player: this.toPublicPlayer(matchedPlayer, true),
      roomState: this.toPublicRoomState(room, matchedPlayer.id),
    };
  }

  /**
   * Moderator kicks a player from the room.
   */
  public kickPlayer(
    roomCode: string,
    moderatorToken: string,
    playerId: string
  ): { success: boolean; kickedPlayerSocketId?: string | null; error?: string } {
    const normalizedCode = (roomCode || '').trim().toUpperCase();
    const room = this.rooms.get(normalizedCode);

    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    if (room.moderatorToken !== moderatorToken) {
      return { success: false, error: 'Unauthorized: invalid moderator token' };
    }

    const player = room.players.get(playerId);
    if (!player) {
      return { success: false, error: 'Player not found in this room' };
    }

    const playerSocketId = player.socketId;
    if (playerSocketId) {
      this.socketLookup.delete(playerSocketId);
    }

    room.players.delete(playerId);

    if (room.activeVote && room.activeVote.isOpen) {
      if (room.playerVotes.has(playerId)) {
        room.playerVotes.delete(playerId);
      }
      if (room.activeVote.votesByPlayer) {
        delete room.activeVote.votesByPlayer[playerId];
      }
      room.activeVote.candidates = room.activeVote.candidates.filter((c) => c.id !== playerId);
      for (const cand of room.activeVote.candidates) {
        cand.votes = [];
        cand.voterNames = [];
      }
      for (const [vId, candId] of room.playerVotes.entries()) {
        const targetCandidate = room.activeVote.candidates.find((c) => c.id === candId);
        const voterObj = room.players.get(vId);
        if (targetCandidate && voterObj) {
          targetCandidate.votes.push(vId);
          targetCandidate.voterNames.push(voterObj.name);
        }
      }
      const aliveCount = Array.from(room.players.values()).filter((p) => p.isAlive).length;
      room.activeVote.totalVotersNeeded = aliveCount;
      room.activeVote.totalVotesCast = room.playerVotes.size;
    }

    return {
      success: true,
      kickedPlayerSocketId: playerSocketId,
    };
  }

  /**
   * Player voluntarily leaves the room.
   */
  public removePlayer(
    roomCode: string,
    playerToken: string
  ): { success: boolean; removedPlayerId?: string; error?: string } {
    const normalizedCode = (roomCode || '').trim().toUpperCase();
    const room = this.rooms.get(normalizedCode);

    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    let foundPlayerId: string | null = null;
    let foundSocketId: string | null = null;

    for (const [id, player] of room.players.entries()) {
      if (player.token === playerToken) {
        foundPlayerId = id;
        foundSocketId = player.socketId;
        break;
      }
    }

    if (!foundPlayerId) {
      return { success: false, error: 'Player session not found' };
    }

    if (foundSocketId) {
      this.socketLookup.delete(foundSocketId);
    }

    room.players.delete(foundPlayerId);

    return {
      success: true,
      removedPlayerId: foundPlayerId,
    };
  }

  /**
   * Handles socket disconnect: marks user disconnected without immediately discarding their seat.
   */
  public handleSocketDisconnect(socketId: string): { roomCode?: string; isModerator?: boolean; playerId?: string } | null {
    const sessionInfo = this.socketLookup.get(socketId);
    if (!sessionInfo) {
      return null;
    }

    this.socketLookup.delete(socketId);
    const room = this.rooms.get(sessionInfo.roomCode);
    if (!room) {
      return sessionInfo;
    }

    if (sessionInfo.isModerator) {
      room.moderatorConnected = false;
      room.moderatorSocketId = null;
    } else if (sessionInfo.playerId) {
      const player = room.players.get(sessionInfo.playerId);
      if (player && player.socketId === socketId) {
        player.isConnected = false;
        player.socketId = null;
      }
    }

    if (room.sharedSocketId === socketId) {
      room.sharedSocketId = null;
    }

    return sessionInfo;
  }

  /**
   * Converts a Player to PublicPlayer.
   * If `includeRole` is true OR player is Killed, role is included; otherwise role is set to null.
   */
  public toPublicPlayer(player: Player, includeRole = false, isModerator = false): PublicPlayer {
    const shouldShowRole = includeRole || player.status === 'Killed';
    return {
      id: player.id,
      name: player.name,
      isConnected: player.isConnected,
      joinedAt: player.joinedAt,
      status: player.status,
      isAlive: player.isAlive,
      role: shouldShowRole ? player.role : null,
      reconnectToken: isModerator ? player.token : undefined,
    };
  }

  /**
   * Converts a Room to PublicRoomState.
   * If `forPlayerId` is provided:
   * - Only that player's role (or any killed player's role) is included; other alive players have role = null.
   * If `forPlayerId` is undefined/omitted:
   * - ALL players' roles are included (for the moderator).
   */
  public toPublicRoomState(room: Room, forPlayerId?: string): PublicRoomState {
    const isForModerator = forPlayerId === undefined;

    const allPlayersList: PublicPlayer[] = Array.from(room.players.values())
      .sort((a, b) => a.joinedAt - b.joinedAt)
      .map((p) => this.toPublicPlayer(p, isForModerator || p.id === forPlayerId, isForModerator));

    let publicRounds: PublicRoundSection[] = [];
    if (room.rounds && room.rounds.length > 0) {
      publicRounds = room.rounds.map((section) => {
        const sectionPlayers = section.playerIds
          .map((id) => room.players.get(id))
          .filter((p): p is Player => p !== undefined)
          .map((p) => this.toPublicPlayer(p, isForModerator || p.id === forPlayerId, isForModerator));

        return {
          round: section.round,
          players: sectionPlayers,
        };
      });
    } else {
      publicRounds = [
        {
          round: room.round,
          players: allPlayersList,
        },
      ];
    }

    return {
      code: room.code,
      moderatorConnected: room.moderatorConnected,
      gameMode: room.gameMode || 'multi_phone',
      status: room.status,
      round: room.round,
      winner: room.winner,
      rounds: publicRounds,
      players: allPlayersList,
      playerCount: allPlayersList.length,
      createdAt: room.createdAt,
      activeVote: room.activeVote,
    };
  }

  /**
   * Helper for testing/cleanup to clear all rooms.
   */
  public clearAllRooms(): void {
    this.rooms.clear();
    this.socketLookup.clear();
  }
}
