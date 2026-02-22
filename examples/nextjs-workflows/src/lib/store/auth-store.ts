import { create } from "zustand";

const ADJECTIVES = ["Swift", "Bold", "Calm", "Keen", "Warm", "Bright", "Quick", "Steady"];
const NOUNS = ["Falcon", "Panda", "Fox", "Otter", "Hawk", "Tiger", "Bear", "Wolf"];

function generateName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${adj} ${noun}`;
}

interface AuthState {
  userId: string;
  displayName: string;
  restore: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  userId: "",
  displayName: "",

  restore: () => {
    try {
      // Use sessionStorage so each tab gets a unique identity (enables
      // testing multiplayer by opening multiple tabs in the same browser).
      let userId = sessionStorage.getItem("wf-userId");
      let displayName = sessionStorage.getItem("wf-displayName");
      if (!userId) {
        userId = crypto.randomUUID();
        displayName = generateName();
        sessionStorage.setItem("wf-userId", userId);
        sessionStorage.setItem("wf-displayName", displayName);
      }
      set({ userId, displayName: displayName || generateName() });
    } catch {
      const userId = crypto.randomUUID();
      set({ userId, displayName: generateName() });
    }
  },
}));
