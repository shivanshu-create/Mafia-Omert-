let cachedBaseUrl: string | null = null;
const listeners = new Set<(baseUrl: string) => void>();

/**
 * Returns the effective base URL for generating QR codes and join links.
 * Priority:
 * 1. Build-time environment variable `VITE_BASE_URL`
 * 2. Runtime server configuration fetched from `/api/config`
 * 3. `window.location.origin` (browser same-origin fallback)
 */
export function getBaseUrl(): string {
  const envUrl = (import.meta as any).env?.VITE_BASE_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  if (cachedBaseUrl) {
    return cachedBaseUrl;
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  return 'http://localhost:3001';
}

/**
 * Single source of truth for constructing join URLs across the application.
 * Reused identically for:
 * - QR code generation
 * - Moderator "Copy Link" button
 * - Seat reconnect links ("Resend Link")
 */
export function buildJoinUrl(roomCode: string, reconnectToken?: string | null): string {
  const base = getBaseUrl();
  const cleanCode = (roomCode || '').trim().toUpperCase();
  const tokenQuery = reconnectToken ? `?token=${encodeURIComponent(reconnectToken)}` : '';
  return `${base}/join/${cleanCode}${tokenQuery}`;
}

/**
 * Subscribe to base URL updates when the server config is resolved.
 */
export function subscribeBaseUrl(callback: (baseUrl: string) => void): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

/**
 * Fetches server-detected or server-configured public base URL at runtime.
 */
export async function fetchServerConfig(): Promise<string> {
  try {
    const res = await fetch('/api/config');
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data.baseUrl === 'string' && data.baseUrl.trim()) {
        const cleaned = data.baseUrl.trim().replace(/\/+$/, '');
        cachedBaseUrl = cleaned;
        listeners.forEach((fn) => fn(cleaned));
        return cleaned;
      }
    }
  } catch {
    // Network or parse failure: fallback to getBaseUrl()
  }
  const fallback = getBaseUrl();
  listeners.forEach((fn) => fn(fallback));
  return fallback;
}
