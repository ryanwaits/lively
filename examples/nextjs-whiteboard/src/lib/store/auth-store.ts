import { create } from "zustand";

const STORAGE_KEY = "lively-whiteboard-user";

interface StoredUser {
  userId: string;
  displayName: string;
}

function readStoredUser(): StoredUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredUser>;
    if (
      typeof parsed.userId === "string" &&
      typeof parsed.displayName === "string"
    ) {
      return { userId: parsed.userId, displayName: parsed.displayName };
    }
    return null;
  } catch {
    return null;
  }
}

interface AuthState {
  userId: string | null;
  displayName: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  restoreSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  userId: null,
  displayName: null,
  isAuthenticated: false,
  isLoading: true,

  signIn: async (displayName: string) => {
    // Keep a stable identity across name changes and sessions
    const userId = readStoredUser()?.userId ?? crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ userId, displayName }));
    set({ userId, displayName, isAuthenticated: true, isLoading: false });
  },

  signOut: async () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ userId: null, displayName: null, isAuthenticated: false });
  },

  restoreSession: async () => {
    const user = readStoredUser();
    if (user) {
      set({
        userId: user.userId,
        displayName: user.displayName,
        isAuthenticated: true,
        isLoading: false,
      });
    } else {
      set({ isLoading: false });
    }
  },
}));
