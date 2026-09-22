import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import ClientFormPage from "./pages/ClientFormPage";
import SupplierFormPage from "./pages/SupplierFormPage";
import MarketplacePage from "./pages/MarketplacePage";

function Bootstrap({ children }) {
  const { bootstrapFromToken } = useAuth();
  useEffect(() => {
    bootstrapFromToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return children;
}

function AppRoutes() {
  return (
    <BrowserRouter>
      <Navbar />
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
          path="/client/new"
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
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Bootstrap>
        <AppRoutes />
      </Bootstrap>
    </AuthProvider>
  );
}
