import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { Layout } from '@/components/Layout';
import { Login } from '@/pages/Login';
import { Dashboard } from '@/pages/Dashboard';
import { DeviceList } from '@/pages/DeviceList';
import { DeviceDetail } from '@/pages/DeviceDetail';
import { Alerts } from '@/pages/Alerts';
import { Settings } from '@/pages/Settings';

// ============================================
// DEMO MODE - Set to true to bypass login
// Set to false when backend is connected
// ============================================
const DEMO_MODE = true;

// Create query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      retry: DEMO_MODE ? 0 : 1,
      refetchOnWindowFocus: !DEMO_MODE,
    },
  },
});

// Demo user data
const DEMO_USER = {
  id: 'demo-user-1',
  email: 'demo@localhost',
  name: 'Demo User',
  role: 'ADMIN' as const,
};

// Auto-login hook for demo mode
const useDemoMode = () => {
  const { login, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (DEMO_MODE && !isAuthenticated) {
      login(DEMO_USER, 'demo-token-12345');
    }
  }, [login, isAuthenticated]);
};

// Protected route wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  useDemoMode();

  if (DEMO_MODE) {
    return <Layout>{children}</Layout>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
};

// Public route wrapper
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  useDemoMode();

  if (DEMO_MODE || isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />

          {/* Protected routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/devices"
            element={
              <ProtectedRoute>
                <DeviceList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/devices/:id"
            element={
              <ProtectedRoute>
                <DeviceDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/alerts"
            element={
              <ProtectedRoute>
                <Alerts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />

          {/* Catch all - redirect to dashboard */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;