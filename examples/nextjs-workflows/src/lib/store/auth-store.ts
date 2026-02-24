import { create } from "zustand";

interface AuthState {
  userId: string;
  displayName: string;
  restored: boolean;
  setIdentity: (displayName: string) => void;
  restore: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  userId: "",
  displayName: "",
  restored: false,

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
        set({ userId, displayName, restored: true });
        return;
      }
    } catch {
      // no stored identity — user must join from dashboard
    }
    set({ restored: true });
  },
}));
