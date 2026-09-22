import { createContext, useContext, useState, useCallback } from "react";
import { loginUser, registerUser, getMe } from "../api/resources";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // { id, email, role }
  const [loading, setLoading] = useState(false);

  const bootstrapFromToken = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const me = await getMe();
      setUser(me);
    } catch {
      localStorage.removeItem("token");
      localStorage.removeItem("role");
    }
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const { access_token } = await loginUser(email, password);
      localStorage.setItem("token", access_token);
      const me = await getMe();
      localStorage.setItem("role", me.role);
      setUser(me);
      return me;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email, password, role) => {
    setLoading(true);
    try {
      const { access_token } = await registerUser(email, password, role);
      localStorage.setItem("token", access_token);
      const me = await getMe();
      localStorage.setItem("role", me.role);
      setUser(me);
      return me;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, bootstrapFromToken }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
