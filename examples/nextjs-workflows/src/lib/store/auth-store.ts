import { create } from "zustand";

interface AuthState {
  userId: string;
  displayName: string;
  setIdentity: (displayName: string) => void;
  restore: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  userId: "",
  displayName: "",

  setIdentity: (displayName: string) => {
    const userId = crypto.randomUUID();
    sessionStorage.setItem("wf-userId", userId);
    sessionStorage.setItem("wf-displayName", displayName);
    set({ userId, displayName });
  },

  restore: () => {
    try {
      const userId = sessionStorage.getItem("wf-userId");
      const displayName = sessionStorage.getItem("wf-displayName");
      if (userId && displayName) {
        set({ userId, displayName });
      }
    } catch {
      // no stored identity — user must join from dashboard
    }
  },
}));
