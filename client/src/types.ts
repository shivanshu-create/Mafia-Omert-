export type Role = 'Mafia' | 'Detective' | 'Doctor' | 'Villager';

export type PlayerStatus = 'Alive' | 'Killed' | 'Saved' | 'Detected';

export interface PublicPlayer {
  id: string;
  name: string;
  isConnected: boolean;
  joinedAt: number;
  role?: Role | null; // Populated only for self, for moderator, or if killed
  status: PlayerStatus;
  isAlive: boolean;
  reconnectToken?: string;
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

export interface ModeratorSession {
  roomCode: string;
  moderatorToken: string;
}

export interface PlayerSession {
  roomCode: string;
  playerToken: string;
  playerName: string;
  playerId: string;
}

export interface SharedSession {
  roomCode: string;
}
