import React from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { ShoppingCart, FileText, History, Settings, LogOut } from 'lucide-react';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import SettingsView from './pages/SettingsView';
import InputView from './pages/InputView';
import ShoppingListView from './pages/ShoppingListView';
import HistoryView from './pages/HistoryView';

function AuthGuard({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '100dvh' }}>
        <div className="flex flex-col items-center gap-2">
          <ShoppingCart size={32} className="text-primary animate-fade-in" />
          <span className="text-muted fs-sm">Memuat...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return children;
}

function AppContent() {
  const { user, signOut } = useAuth();

  return (
    <>
      <div className="container animate-fade-in">
        <header className="py-4 flex justify-between items-center">
          <h1 className="fs-2xl fw-extrabold text-primary flex items-center gap-2">
            <ShoppingCart size={28} />
            ShopOrganizer
          </h1>
          {user && (
            <button
              onClick={signOut}
              className="btn btn-ghost flex items-center gap-1 fs-sm border-none cursor-pointer"
              title="Keluar"
            >
              <LogOut size={18} />
            </button>
          )}
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
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AuthGuard>
          <AppContent />
        </AuthGuard>
      </Router>
    </AuthProvider>
  );
}

export default App;
