import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, requireRole }) {
  const { user } = useAuth();
  const token = localStorage.getItem("token");

  if (!token) return <Navigate to="/login" replace />;
  if (!user) return null; // still bootstrapping from token
  if (requireRole && user.role !== requireRole) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}
