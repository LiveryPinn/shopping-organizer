import React from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { ShoppingCart, FileText, History, Settings } from 'lucide-react';

import SettingsView from './pages/SettingsView';
import InputView from './pages/InputView';
import ShoppingListView from './pages/ShoppingListView';
import HistoryView from './pages/HistoryView';

function App() {
  return (
    <Router>
      <>
        <div className="container animate-fade-in">
          <header className="py-4">
            <h1 className="fs-2xl fw-extrabold text-primary flex items-center justify-center gap-2">
              <ShoppingCart size={28} />
              ShopOrganizer
            </h1>
          </header>
          
          <main className="flex-1 flex flex-col">
            <Routes>
              <Route path="/" element={<Navigate to="/input" replace />} />
              <Route path="/input" element={<InputView />} />
              <Route path="/list" element={<ShoppingListView />} />
              <Route path="/history" element={<HistoryView />} />
              <Route path="/settings" element={<SettingsView />} />
            </Routes>
          </main>
        </div>

        <nav className="bottom-nav bg-surface text-muted py-2 glass-panel">
          <NavLink to="/input" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <FileText size={24} />
            <span>Input</span>
          </NavLink>
          <NavLink to="/list" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <ShoppingCart size={24} />
            <span>Belanja</span>
          </NavLink>
          <NavLink to="/history" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <History size={24} />
            <span>Riwayat</span>
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Settings size={24} />
            <span>Pengaturan</span>
          </NavLink>
        </nav>
      </>
    </Router>
  );
}

export default App;
