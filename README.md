# Mafia Omertà 🎩🩸

**Mafia Omertà** is a sleek, web-based moderator companion and digital board for running the classic social-deduction party game **Mafia** in person. Styled like an atmospheric noir split-flap train-schedule departure board, it replaces physical cards and moderator memory slips with real-time status management, server-authoritative secret role delivery, live public voting, and seamless support for groups where either every player has their own phone (**Multi-Phone Mode**) or a single shared phone is passed around privately (**Two-Phone Mode**).

---

## ⚠️ Critical Architectural Caveat: In-Memory State

> [!CAUTION]
> **No Database / Pure In-Memory State**: Active room codes, player rosters, secret role assignments, and round histories are stored **exclusively in Node.js server RAM**.
>
> **Do NOT restart or redeploy the server during an active game.**
>
> - Restarting the server process, deploying a new commit, or spinning down a container (e.g. Render/Railway free tier idling) **instantly wipes all active rooms**.
> - If deploying on Render's free tier, ping the server URL 1–2 minutes before your game night to wake up the service (cold-starts take ~30–50 seconds).
> - Client-side network disconnects (locking a phone, switching apps, momentary WiFi drop) **do not** lose game state: the client automatically reconnects with an in-memory session token as long as the server remains running.

---

## 🛠️ Local Development Setup

### Prerequisites
- **Node.js**: `v18.0.0` or higher (`v20+` LTS recommended)
- **npm**: `v9.0.0` or higher
- **Git**

### Installation

Clone the repository and install all dependencies:

```bash
# Clone the repository
git clone https://github.com/your-username/mafia-omerta.git
cd "mafia-omerta"

# Install dependencies for both server and client (handled by root postinstall)
npm install
```

### Running Locally

You can run both the backend and frontend in development mode with hot-reloading:

```bash
# Terminal 1 — Backend (Express + Socket.io on port 3001)
npm run dev:server

# Terminal 2 — Frontend (Vite dev server on port 5173)
npm run dev:client
```

Open your browser to **`http://localhost:5173`**. Requests to `/api` and `/socket.io` are automatically proxied to port 3001.

### Running Automated Tests

```bash
# Run all Vitest unit and integration suites (40 tests across 9 suites)
npm test
```

### Local Production Build & Test

To test the unified single-process production build locally:

```bash
# Build the client into client/dist and compile TypeScript server into server/dist
npm run build

# Start the unified Node/Express production server
npm start
```

Visit **`http://localhost:3001`**. The server directly serves the compiled React app alongside the WebSocket engine.

---

## 🚀 Deployment (Render / Railway)

Mafia Omertà is designed to run as a **single unified service** (one process, one URL, zero CORS complexity). The Node.js Express server hosts both the WebSocket engine and serves the compiled static React frontend.

### Environment Variables

| Variable | Required | Default | Description |
| :--- | :---: | :---: | :--- |
| `PORT` | Auto | `3001` | Injected automatically by Render/Railway. Port the Express server listens on. |
| `BASE_URL` | Optional | Auto-detected | The public root URL used to generate player join links and QR codes (e.g. `https://mafia.yourdomain.com`). If omitted, the server falls back to `RENDER_EXTERNAL_URL` or `http://localhost:<PORT>`. |
| `NODE_ENV` | Optional | `production` | Set to `production` in production hosting environments. |

---

### Deploying to Render (Recommended)

The repository includes a ready-to-use [`render.yaml`](./render.yaml) blueprint:

1. Push your code to a GitHub or GitLab repository.
2. Sign in to the [Render Dashboard](https://dashboard.render.com).
3. Click **New +** → **Blueprint** and select your repository.
4. Render will detect `render.yaml` with the following configuration:
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: `Free Web Service`
5. Click **Apply**.
6. Render will assign a public HTTPS URL (e.g. `https://mafia-omerta-xxxx.onrender.com`).
7. *(Optional)* Set `BASE_URL` in the Render dashboard environment settings if you attach a custom domain.

#### Redeploying on Render
- Subsequent `git push` to your main branch triggers an automatic rebuild and redeploy.
- Remember: **Only redeploy between game nights, never mid-game!**

---

### Deploying to Railway

1. Sign in to [Railway](https://railway.app).
2. Click **New Project** → **Deploy from GitHub repo**.
3. Select this repository.
4. Railway will auto-detect Node.js:
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
5. In **Settings** → **Networking**, click **Generate Domain** to get a public HTTPS address.
6. Set `BASE_URL` to your generated Railway domain if needed.

---

## 📂 Project Structure & Code Map

```
Mafia Omertà/
├── package.json               # Root monorepo scripts (build, test, dev, start)
├── render.yaml                # Render Blueprint deployment specification
│
├── server/                    # Backend (Node.js + Express + Socket.io + TypeScript)
│   ├── src/
│   │   ├── index.ts           # Unified server entry: Express static serving, SPA fallback, HTTP + Socket.io setup
│   │   ├── types.ts           # Data contracts: Room, Player, Role, VoteSession, Socket events
│   │   ├── roomManager.ts     # Room lifecycle: create, join, reconnect, role assign, night status, win conditions, reset
│   │   └── socketHandlers.ts  # Real-time WebSocket routes: role redaction, votes, two-phone pass-the-phone sequences
│   └── tests/                 # Automated test suites (Vitest)
│       ├── roomManager.test.ts          # Room creation, player limits, token validation
│       ├── roleAssignment.test.ts       # Role allocation and targeted private emissions
│       ├── nightPhaseAndRounds.test.ts  # Casualty status tracking and round advancement
│       ├── votingSystem.test.ts         # Public live voting, ballot tallies, tie-breaker handling
│       ├── playAgain.test.ts            # Full game-over reset without disconnecting players
│       ├── twoPhoneMode.test.ts         # Two-phone shared device registration and sequence flow
│       ├── socketIntegration.test.ts    # End-to-end multi-socket client communication
│       ├── productionServing.test.ts    # Static HTML/JS file delivery and API health endpoints
│       └── qaVerification.test.ts       # Security audit tests: hidden role redaction, reconnect resilience
│
└── client/                    # Frontend (React 18 + Vite + Tailwind CSS + TypeScript)
    ├── src/
    │   ├── context/
    │   │   └── SocketContext.tsx        # Centralized WebSocket state, event listeners, reconnection handling
    │   ├── pages/
    │   │   ├── Home.tsx                 # Landing: Mode selection (Multi vs Two-Phone), Create Room, Join Code
    │   │   ├── JoinRoom.tsx             # Player name entry, QR deep-link landing, token auto-reconnect
    │   │   ├── ModeratorLobby.tsx       # Moderator console: role assignment, night controls, voting triggers, reset
    │   │   └── PlayerLobby.tsx          # Player screen: secret dossier role reveal, alive/eliminated banner, shared view
    │   ├── components/
    │   │   ├── Header.tsx               # Wordmark branding, room badge, connection indicator, Help button
    │   │   ├── HowToPlayModal.tsx       # In-app skimmable guide (rules, roles, voting, modes, mod quick-ref)
    │   │   ├── TrainScheduleBoard.tsx   # Split-flap departure board, round dividers, card grid
    │   │   ├── TrainScheduleCard.tsx    # 2-line player card with bold name, dimmed role, distinct status styling
    │   │   ├── StatusSelectorModal.tsx  # Moderator modal to set Alive / Saved / Detected / Killed
    │   │   ├── VotingModal.tsx          # Real-time WhatsApp-poll live ballot with voter chips and progress bar
    │   │   ├── SharedRoleReveal.tsx     # Two-Phone mode pass-the-phone privacy curtain for role reveal
    │   │   ├── SharedVotingModal.tsx    # Two-Phone mode pass-the-phone sequential ballot
    │   │   ├── QRCodeModal.tsx          # Moderator QR code popup for easy in-room camera scanning
    │   │   └── Popups.tsx               # Universal modals: Role reveal, death notification, game-over banner
    │   └── utils/
    │       ├── config.ts                # Base URL detection and backend socket origin resolution
    │       └── storage.ts               # LocalStorage session persistence for token-based reconnection
```

---

## 🎯 Quick Navigation for Specific Game Mechanics

- **Lobby & Room Management**: [`server/src/roomManager.ts`](server/src/roomManager.ts) & [`client/src/pages/Home.tsx`](client/src/pages/Home.tsx)
- **Role Assignment & Redaction**: [`server/src/socketHandlers.ts`](server/src/socketHandlers.ts) (`moderator:assign_role`, `player:role_updated`)
- **Night Status & Board Styling**: [`client/src/components/TrainScheduleCard.tsx`](client/src/components/TrainScheduleCard.tsx) & [`StatusSelectorModal.tsx`](client/src/components/StatusSelectorModal.tsx)
- **Voting Engine & WhatsApp Tally**: [`server/src/socketHandlers.ts`](server/src/socketHandlers.ts) (`voting:start`, `voting:cast`) & [`client/src/components/VotingModal.tsx`](client/src/components/VotingModal.tsx)
- **Two-Phone Pass-the-Phone**: [`client/src/components/SharedRoleReveal.tsx`](client/src/components/SharedRoleReveal.tsx) & [`SharedVotingModal.tsx`](client/src/components/SharedVotingModal.tsx)
- **Play Again Reset**: [`server/src/roomManager.ts`](server/src/roomManager.ts) (`resetGameForPlayAgain`) & [`client/src/components/Popups.tsx`](client/src/components/Popups.tsx)
