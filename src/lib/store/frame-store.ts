import { create } from "zustand";
import type { Frame } from "@/types/board";

interface FrameState {
  frames: Frame[];
  activeFrameIndex: number;
  addFrame: (frame: Frame) => void;
  deleteFrame: (frameId: string) => void;
  syncFrames: (frames: Frame[]) => void;
  setActiveFrame: (index: number) => void;
  nextFrameIndex: () => number;
}

export const useFrameStore = create<FrameState>((set, get) => ({
  frames: [],
  activeFrameIndex: 0,

  addFrame: (frame) =>
    set((s) => ({
      frames: [...s.frames, frame].sort((a, b) => a.index - b.index),
    })),

  deleteFrame: (frameId) =>
    set((s) => {
      const remaining = s.frames.filter((f) => f.id !== frameId);
      const activeFrameIndex =
        s.activeFrameIndex >= remaining.length ? 0 : s.activeFrameIndex;
      return { frames: remaining, activeFrameIndex };
    }),

  syncFrames: (frames) =>
    set({ frames: [...frames].sort((a, b) => a.index - b.index) }),

  setActiveFrame: (index) => set({ activeFrameIndex: index }),

  nextFrameIndex: () => {
    const { frames } = get();
    if (frames.length === 0) return 1;
    return Math.max(...frames.map((f) => f.index)) + 1;
  },
}));
