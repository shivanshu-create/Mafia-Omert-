export type Role = 'Mafia' | 'Detective' | 'Doctor' | 'Villager';

export type PlayerStatus = 'Alive' | 'Killed' | 'Saved' | 'Detected';

export interface Player {
  id: string;
  name: string;
  token: string; // Secret session token held by the browser
  socketId: string | null;
  isConnected: boolean;
  joinedAt: number;
  role: Role | null;
  status: PlayerStatus;
  isAlive: boolean;
}

export interface PublicPlayer {
  id: string;
  name: string;
  isConnected: boolean;
  joinedAt: number;
  role?: Role | null; // Populated only for self, for moderator, or if killed
  status: PlayerStatus;
  isAlive: boolean;
  reconnectToken?: string; // Populated only for moderator to share seat reconnect links
}

export interface RoundSection {
  round: number;
  playerIds: string[];
}

export interface PublicRoundSection {
  round: number;
  players: PublicPlayer[];
}

export interface VoteCandidate {
  id: string;
  name: string;
  votes: string[]; // Voter player IDs
  voterNames: string[]; // Voter display names
}

export interface ActiveVoteState {
  isOpen: boolean;
  round: number;
  isTieBreak: boolean;
  candidates: VoteCandidate[];
  votesByPlayer: Record<string, string>; // { [voterPlayerId: string]: candidateId }
  totalVotesCast: number;
  totalVotersNeeded: number;
}

export type GameMode = 'multi_phone' | 'two_phone';

export interface Room {
  code: string;
  moderatorToken: string; // Secret moderator session token
  moderatorSocketId: string | null;
  moderatorConnected: boolean;
  sharedSocketId: string | null; // Socket ID for shared device in two-phone mode
  gameMode: GameMode;
  createdAt: number;
  status: 'lobby' | 'in_game' | 'ended';
  round: number;
  winner: 'Town' | 'Mafia' | null;
  rounds: RoundSection[];
  activeVote: ActiveVoteState | null;
  playerVotes: Map<string, string>; // voterId -> candidateId
  players: Map<string, Player>; // Keyed by player.id
}

export interface PublicRoomState {
  code: string;
  moderatorConnected: boolean;
  gameMode: GameMode;
  status: 'lobby' | 'in_game' | 'ended';
  round: number;
  winner: 'Town' | 'Mafia' | null;
  rounds: PublicRoundSection[];
  players: PublicPlayer[];
  playerCount: number;
  createdAt: number;
  activeVote: ActiveVoteState | null;
}

// Client to Server Socket Events
export interface ClientToServerEvents {
  'room:create': (
    payloadOrCallback: { gameMode?: GameMode } | ((response: { success: boolean; roomCode?: string; moderatorToken?: string; error?: string }) => void),
    maybeCallback?: (response: { success: boolean; roomCode?: string; moderatorToken?: string; error?: string }) => void
  ) => void;
  
  'room:validate': (payload: { roomCode: string }, callback: (response: { valid: boolean; error?: string; roomCode?: string; gameMode?: GameMode }) => void) => void;
  
  'room:join': (
    payload: { roomCode: string; playerName: string },
    callback: (response: { success: boolean; roomCode?: string; playerToken?: string; player?: PublicPlayer; error?: string }) => void
  ) => void;

  'room:join_shared': (
    payload: { roomCode: string },
    callback?: (response: { success: boolean; roomState?: PublicRoomState; error?: string }) => void
  ) => void;

  'shared:add_player': (
    payload: { roomCode: string; playerName: string },
    callback?: (response: { success: boolean; player?: PublicPlayer; error?: string }) => void
  ) => void;
  
  'session:reconnect_moderator': (
    payload: { roomCode: string; moderatorToken: string },
    callback: (response: { success: boolean; isModerator: boolean; roomState?: PublicRoomState; error?: string }) => void
  ) => void;
  
  'session:reconnect_player': (
    payload: { roomCode: string; playerToken: string },
    callback: (response: { success: boolean; isModerator: boolean; player?: PublicPlayer; roomState?: PublicRoomState; error?: string }) => void
  ) => void;
  
  'moderator:kick_player': (
    payload: { roomCode: string; moderatorToken: string; playerId: string },
    callback?: (response: { success: boolean; error?: string }) => void
  ) => void;

  'moderator:add_player': (
    payload: { roomCode: string; moderatorToken: string; playerName: string },
    callback?: (response: { success: boolean; player?: PublicPlayer; error?: string }) => void
  ) => void;

  'moderator:start_game': (
    payload: { roomCode: string; moderatorToken: string },
    callback?: (response: { success: boolean; error?: string }) => void
  ) => void;

  'moderator:assign_role': (
    payload: { roomCode: string; moderatorToken: string; playerId: string; role: Role | null },
    callback?: (response: { success: boolean; error?: string }) => void
  ) => void;

  'moderator:reveal_role_to_shared': (
    payload: { roomCode: string; moderatorToken: string; playerId: string },
    callback?: (response: { success: boolean; error?: string }) => void
  ) => void;

  'shared:clear_role_reveal': (
    payload: { roomCode: string },
    callback?: (response: { success: boolean }) => void
  ) => void;

  'moderator:set_player_status': (
    payload: { roomCode: string; moderatorToken: string; playerId: string; status: PlayerStatus },
    callback?: (response: { success: boolean; error?: string }) => void
  ) => void;

  'moderator:toggle_player_alive': (
    payload: { roomCode: string; moderatorToken: string; playerId: string; isAlive: boolean },
    callback?: (response: { success: boolean; error?: string }) => void
  ) => void;

  'moderator:advance_round': (
    payload: { roomCode: string; moderatorToken: string },
    callback?: (response: { success: boolean; error?: string }) => void
  ) => void;

  'moderator:start_vote': (
    payload: { roomCode: string; moderatorToken: string },
    callback?: (response: { success: boolean; error?: string }) => void
  ) => void;

  'player:cast_vote': (
    payload: { roomCode: string; playerToken: string; candidateId: string },
    callback?: (response: { success: boolean; error?: string }) => void
  ) => void;

  'shared:cast_vote': (
    payload: { roomCode: string; voterId: string; candidateId: string },
    callback?: (response: { success: boolean; error?: string }) => void
  ) => void;

  'moderator:cancel_vote': (
    payload: { roomCode: string; moderatorToken: string },
    callback?: (response: { success: boolean; error?: string }) => void
  ) => void;

  'moderator:play_again': (
    payload: { roomCode: string; moderatorToken: string },
    callback?: (response: { success: boolean; error?: string }) => void
  ) => void;
  
  'player:leave': (
    payload: { roomCode: string; playerToken: string },
    callback?: (response: { success: boolean; error?: string }) => void
  ) => void;
}

// Server to Client Socket Events
export interface ServerToClientEvents {
  'room:state': (state: PublicRoomState) => void;
  'player:role_updated': (payload: { role: Role | null }) => void;
  'player:killed_notification': (payload: { message: string }) => void;
  'game:role_revealed': (payload: { playerId: string; playerName: string; role: Role | null }) => void;
  'game:ended': (payload: { winner: 'Town' | 'Mafia'; reason: string }) => void;
  'vote:started': (payload: ActiveVoteState) => void;
  'vote:updated': (payload: ActiveVoteState) => void;
  'vote:tie_break': (payload: { tiedCandidates: string[]; activeVote: ActiveVoteState }) => void;
  'vote:resolved': (payload: { eliminatedPlayer: PublicPlayer; role: Role | null }) => void;
  'shared:show_role_reveal': (payload: { playerId: string; playerName: string; role: Role | null }) => void;
  'shared:clear_role_reveal': () => void;
  'player:kicked': (payload: { reason: string }) => void;
  'room:closed': (payload: { reason: string }) => void;
  'error:notification': (payload: { message: string }) => void;
}
