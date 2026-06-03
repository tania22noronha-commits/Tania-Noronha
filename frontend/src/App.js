import React from 'react';
import '@/App.css';
import '@/index.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { WorldProvider } from '@/context/WorldContext';
import { Toaster } from '@/components/ui/sonner';
import { initAuth } from '@/utils/api';

import { LandingPage } from '@/pages/LandingPage';
import { AuthPage } from '@/pages/AuthPage';
import { WorldsPage } from '@/pages/WorldsPage';
import { MainLayout } from '@/components/MainLayout';
import { DashboardPage } from '@/pages/DashboardPage';
import { AgentsPage } from '@/pages/AgentsPage';
import { EconomyPage } from '@/pages/EconomyPage';
import { RelationshipsPage } from '@/pages/RelationshipsPage';
import { StoriesPage } from '@/pages/StoriesPage';
import { AnalyticsPage } from '@/pages/AnalyticsPage';
import { GodModePage } from '@/pages/GodModePage';
import { SettingsPage } from '@/pages/SettingsPage';

initAuth();

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#00F0FF] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return user ? children : <Navigate to="/auth" />;
};

function App() {
  return (
    <AuthProvider>
      <WorldProvider>
        <div className="App">
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/auth" element={<AuthPage />} />
              
              <Route path="/worlds" element={
                <ProtectedRoute>
                  <WorldsPage />
                </ProtectedRoute>
              } />
              
              <Route path="/" element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }>
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="agents" element={<AgentsPage />} />
                <Route path="economy" element={<EconomyPage />} />
                <Route path="relationships" element={<RelationshipsPage />} />
                <Route path="stories" element={<StoriesPage />} />
                <Route path="analytics" element={<AnalyticsPage />} />
                <Route path="god-mode" element={<GodModePage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
            </Routes>
          </BrowserRouter>
          <Toaster 
            position="bottom-right"
            toastOptions={{
              style: {
                background: '#11111A',
                border: '1px solid rgba(0, 240, 255, 0.3)',
                color: '#FFFFFF',
              },
            }}
          />
        </div>
      </WorldProvider>
    </AuthProvider>
  );
}

export default App;
