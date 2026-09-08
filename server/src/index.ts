import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { RoomManager } from './roomManager';
import { registerSocketHandlers } from './socketHandlers';
import { ClientToServerEvents, ServerToClientEvents } from './types';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Trust first proxy (Render, Railway, Cloudflare, Nginx)
app.set('trust proxy', 1);

const PORT = process.env.PORT || 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || '*';
const BASE_URL = (process.env.BASE_URL || process.env.RENDER_EXTERNAL_URL || '').replace(/\/+$/, '');

app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

export const roomManager = new RoomManager();

// Socket.io initialization with robust timeout & transport settings for cloud hosting
export const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ['GET', 'POST'],
  },
  pingInterval: 10000,
  pingTimeout: 10000,
  transports: ['websocket', 'polling'],
});

registerSocketHandlers(io, roomManager);

// REST Health Check & Quick Validation
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Dynamic configuration endpoint for clients (exposes configured or detected public domain)
app.get('/api/config', (req, res) => {
  const forwardedProto = req.get('x-forwarded-proto');
  const protocol = forwardedProto || req.protocol;
  const host = req.get('host') || `localhost:${PORT}`;
  const detectedUrl = `${protocol}://${host}`;

  res.json({
    baseUrl: BASE_URL || detectedUrl,
    environment: process.env.NODE_ENV || 'development',
  });
});

app.get('/api/rooms/:code/validate', (req, res) => {
  const { code } = req.params;
  const result = roomManager.validateRoom(code);
  res.json(result);
});

// Serve the built client files when client/dist exists or in production
const candidatePaths = [
  path.resolve(__dirname, '../../client/dist'),
  path.resolve(__dirname, '../client/dist'),
  path.resolve(process.cwd(), 'client/dist'),
];
const clientDistPath = candidatePaths.find((p) => fs.existsSync(p));

if (clientDistPath) {
  app.use(express.static(clientDistPath));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Start server when executed directly
if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`[Mafia Omertà Server] Running on http://localhost:${PORT}`);
  });
}

export { app, server };
