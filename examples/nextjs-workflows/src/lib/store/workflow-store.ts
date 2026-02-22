import { create } from "zustand";
import type { WorkflowNode, WorkflowEdge } from "@/types/workflow";

export interface WorkflowMeta {
  name: string;
  status: string;
}

export type StreamStatus = "draft" | "deploying" | "active" | "paused" | "failed";

export interface StreamState {
  streamId: string | null;
  status: StreamStatus;
  lastDeployedAt: string | null;
  errorMessage: string | null;
  totalDeliveries: number;
  failedDeliveries: number;
  lastTriggeredAt: string | null;
  lastTriggeredBlock: number | null;
}

interface WorkflowState {
  nodes: Map<string, WorkflowNode>;
  edges: Map<string, WorkflowEdge>;
  meta: WorkflowMeta;
  stream: StreamState;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  configNodeId: string | null;

  // Sync methods — called exclusively by useLivelySync
  syncNodes: (nodes: WorkflowNode[]) => void;
  syncEdges: (edges: WorkflowEdge[]) => void;
  syncMeta: (meta: WorkflowMeta) => void;
  syncStream: (stream: StreamState) => void;

  // Selection — local UI state only
  selectNode: (id: string | null) => void;
  selectEdge: (id: string | null) => void;
  openConfig: (id: string | null) => void;
}

const DEFAULT_STREAM: StreamState = {
  streamId: null,
  status: "draft",
  lastDeployedAt: null,
  errorMessage: null,
  totalDeliveries: 0,
  failedDeliveries: 0,
  lastTriggeredAt: null,
  lastTriggeredBlock: null,
};

export const useWorkflowStore = create<WorkflowState>((set) => ({
  nodes: new Map(),
  edges: new Map(),
  meta: { name: "Untitled Workflow", status: "draft" },
  stream: { ...DEFAULT_STREAM },
  selectedNodeId: null,
  selectedEdgeId: null,
  configNodeId: null,

  syncNodes: (nodes) => {
    const map = new Map<string, WorkflowNode>();
    for (const n of nodes) map.set(n.id, n);
    set({ nodes: map });
  },

  syncEdges: (edges) => {
    const map = new Map<string, WorkflowEdge>();
    for (const e of edges) map.set(e.id, e);
    set({ edges: map });
  },

  syncMeta: (meta) => set({ meta }),
  syncStream: (stream) => set({ stream }),

  selectNode: (id) => set({ selectedNodeId: id, selectedEdgeId: null }),
  selectEdge: (id) => set({ selectedEdgeId: id, selectedNodeId: null }),
  openConfig: (id) => set({ configNodeId: id, selectedNodeId: id, selectedEdgeId: null }),
}));
