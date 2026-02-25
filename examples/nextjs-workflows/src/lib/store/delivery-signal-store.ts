import { create } from "zustand";

const DELIVERY_WINDOW = 5000; // ms

interface DeliverySignalState {
  /** workflowId → timestamp when delivery animation should end */
  signals: Map<string, number>;
  signalDelivery: (wfId: string) => void;
}

export const useDeliverySignalStore = create<DeliverySignalState>((set) => ({
  signals: new Map(),
  signalDelivery: (wfId) =>
    set((state) => {
      const next = new Map(state.signals);
      next.set(wfId, Date.now() + DELIVERY_WINDOW);
      return { signals: next };
    }),
}));
