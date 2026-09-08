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
        <div className="min-h-screen flex flex-col bg-[#08090b] text-[#e0e2ec] selection:bg-[#fcee0a] selection:text-black font-mono">
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
          <footer className="py-4 text-center text-[11px] font-mono tracking-widest text-[#7d8799] border-t border-[#fcee0a]/20 bg-[#0c0e12]/90">
            <p>Mafia Omertà • In-Person Party Game</p>
          </footer>
        </div>
      </SocketProvider>
    </BrowserRouter>
  );
};
