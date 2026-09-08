import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SocketProvider } from './context/SocketContext';
import { Header } from './components/Header';
import { Home } from './pages/Home';
import { JoinRoom } from './pages/JoinRoom';
import { ModeratorLobby } from './pages/ModeratorLobby';
import { PlayerLobby } from './pages/PlayerLobby';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <SocketProvider>
        <div className="min-h-screen flex flex-col bg-stone-950 text-stone-100 selection:bg-red-900 selection:text-white">
          <Header />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/join" element={<Home />} />
              <Route path="/join/:code" element={<JoinRoom />} />
              <Route path="/moderator/:code" element={<ModeratorLobby />} />
              <Route path="/lobby/:code" element={<PlayerLobby />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <footer className="py-6 text-center text-xs text-stone-400 border-t border-stone-900">
            <p>Mafia Omertà &bull; In-Person Game Companion</p>
          </footer>
        </div>
      </SocketProvider>
    </BrowserRouter>
  );
};
