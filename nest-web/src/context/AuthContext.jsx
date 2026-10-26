import { createContext, useContext, useEffect, useState } from "react";
import api from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // on first load, check if the saved token is still good
  useEffect(() => {
    const token = localStorage.getItem("nest_token");
    if (!token) return setLoading(false);
    api
      .get("/auth/me")
      .then((res) => setUser(res.data.user))
      .catch(() => localStorage.removeItem("nest_token"))
      .finally(() => setLoading(false));
  }, []);

  const saveSession = ({ token, user }) => {
    localStorage.setItem("nest_token", token);
    setUser(user);
    return user;
  };

  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    return saveSession(res.data);
  };

  const register = async (data) => {
    const res = await api.post("/auth/register", data);
    return saveSession(res.data);
  };

  // google: the backend creates the account the first time, or links it to an existing one
  const googleLogin = async (credential, role) => {
    const body = { credential };
    if (role) body.role = role;
    const res = await api.post("/auth/google", body);
    saveSession(res.data);
    return res.data; // { isNew, user, ... }
  };

  const logout = () => {
    localStorage.removeItem("nest_token");
    setUser(null);
  };

  const refresh = async () => {
    const res = await api.get("/auth/me");
    setUser(res.data.user);
    return res.data.user;
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, register, googleLogin, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

// where each role lands after signing in
export const homeFor = (user) => {
  if (!user) return "/";
  if (user.role === "admin") return "/admin";
  if (user.role === "agent") return "/agent";
  return "/listings";
};
