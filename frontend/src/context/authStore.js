import { create } from "zustand";
import api from "../utils/api";

const useAuthStore = create((set, get) => ({
  user: (() => {
    try { return JSON.parse(localStorage.getItem("user")); } catch { return null; }
  })(),
  token: localStorage.getItem("accessToken") || null,
  loading: false,
  error: null,

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.post("/auth/login", { email, password });
      const { AccessToken, IdToken } = data;

      // Decode JWT to get user attributes
      const payload = JSON.parse(atob(IdToken.split(".")[1]));
      const user = {
        sub: payload.sub,
        email: payload.email,
        name: payload.name || payload.email,
        role: payload["custom:role"] || "employee",
        teamId: payload["custom:teamId"] || null,
      };

      localStorage.setItem("accessToken", AccessToken);
      localStorage.setItem("idToken", IdToken);
      localStorage.setItem("user", JSON.stringify(user));
      set({ user, token: AccessToken, loading: false });
      return user;
    } catch (err) {
      const msg = err.response?.data?.error || "Login failed";
      set({ error: msg, loading: false });
      throw new Error(msg);
    }
  },

  logout: () => {
    localStorage.clear();
    set({ user: null, token: null });
  },

  isManager: () => {
    const { user } = get();
    return user?.role === "manager" || user?.role === "admin";
  },
}));

export default useAuthStore;
