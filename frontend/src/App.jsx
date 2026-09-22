import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Sidebar from "./components/Sidebar";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import ClientFormPage from "./pages/ClientFormPage";
import SupplierFormPage from "./pages/SupplierFormPage";
import MarketplacePage from "./pages/MarketplacePage";
import PastInterestPage from "./pages/PastInterestPage";
import ChatsPage from "./pages/ChatsPage";
import SettingsPage from "./pages/SettingsPage";

function Bootstrap({ children }) {
  const { bootstrapFromToken } = useAuth();
  useEffect(() => {
    bootstrapFromToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return children;
}

function AppShell() {
  const { user } = useAuth();
  return (
    <div
      data-role={user?.role}
      className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-900"
    >
      {user && <Sidebar />}
      <main className="h-screen min-w-0 flex-1 overflow-y-auto">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/marketplace"
            element={
              <ProtectedRoute>
                <MarketplacePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/past-interest"
            element={
              <ProtectedRoute>
                <PastInterestPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chats"
            element={
              <ProtectedRoute>
                <ChatsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/client/new"
            element={
              <ProtectedRoute requireRole="client">
                <ClientFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/client/edit/:id"
            element={
              <ProtectedRoute requireRole="client">
                <ClientFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/supplier/new"
            element={
              <ProtectedRoute requireRole="supplier">
                <SupplierFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/supplier/edit/:id"
            element={
              <ProtectedRoute requireRole="supplier">
                <SupplierFormPage />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Bootstrap>
          <AppShell />
        </Bootstrap>
      </BrowserRouter>
    </AuthProvider>
  );
}
