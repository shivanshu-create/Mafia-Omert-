import { ModeratorSession, PlayerSession } from '../types';

const MOD_SESSION_KEY = 'omerta_mod_session';
const PLAYER_SESSION_KEY = 'omerta_player_session';

export const storage = {
  // Moderator session
  saveModeratorSession(roomCode: string, moderatorToken: string): void {
    try {
      const session: ModeratorSession = { roomCode, moderatorToken };
      localStorage.setItem(MOD_SESSION_KEY, JSON.stringify(session));
    } catch (e) {
      console.error('Failed to save moderator session', e);
    }
  },

  getModeratorSession(): ModeratorSession | null {
    try {
      const raw = localStorage.getItem(MOD_SESSION_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as ModeratorSession;
    } catch (e) {
      console.error('Failed to parse moderator session', e);
      return null;
    }
  },

  clearModeratorSession(): void {
    try {
      localStorage.removeItem(MOD_SESSION_KEY);
    } catch (e) {
      console.error('Failed to clear moderator session', e);
    }
  },

  // Player session (uses sessionStorage for tab isolation so multiple players can test in separate tabs, with localStorage fallback)
  savePlayerSession(session: PlayerSession): void {
    try {
      sessionStorage.setItem(PLAYER_SESSION_KEY, JSON.stringify(session));
      localStorage.setItem(PLAYER_SESSION_KEY, JSON.stringify(session));
    } catch (e) {
      console.error('Failed to save player session', e);
    }
  },

  getPlayerSession(): PlayerSession | null {
    try {
      // Check tab-isolated session first
      const sessionRaw = sessionStorage.getItem(PLAYER_SESSION_KEY);
      if (sessionRaw) {
        return JSON.parse(sessionRaw) as PlayerSession;
      }
      // Fallback to localStorage (e.g. mobile Safari app relaunch)
      const raw = localStorage.getItem(PLAYER_SESSION_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as PlayerSession;
    } catch (e) {
      console.error('Failed to parse player session', e);
      return null;
    }
  },

  clearPlayerSession(): void {
    try {
      sessionStorage.removeItem(PLAYER_SESSION_KEY);
      localStorage.removeItem(PLAYER_SESSION_KEY);
    } catch (e) {
      console.error('Failed to clear player session', e);
    }
  },

  // Shared device session (Two-Phone Mode)
  saveSharedSession(roomCode: string): void {
    try {
      localStorage.setItem('omerta_shared_session', JSON.stringify({ roomCode }));
    } catch (e) {
      console.error('Failed to save shared session', e);
    }
  },

  getSharedSession(): { roomCode: string } | null {
    try {
      const raw = localStorage.getItem('omerta_shared_session');
      if (!raw) return null;
      return JSON.parse(raw) as { roomCode: string };
    } catch (e) {
      console.error('Failed to parse shared session', e);
      return null;
    }
  },

  clearSharedSession(): void {
    try {
      localStorage.removeItem('omerta_shared_session');
    } catch (e) {
      console.error('Failed to clear shared session', e);
    }
  },

  clearAllSessions(): void {
    this.clearModeratorSession();
    this.clearPlayerSession();
    this.clearSharedSession();
  },
};
