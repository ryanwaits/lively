import { create } from "zustand";
import type { WorkflowNode, WorkflowEdge } from "@/types/workflow";

interface WorkflowState {
  nodes: Map<string, WorkflowNode>;
  edges: Map<string, WorkflowEdge>;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;

  // Sync methods — called exclusively by useLivelySync
  syncNodes: (nodes: WorkflowNode[]) => void;
  syncEdges: (edges: WorkflowEdge[]) => void;

  // Selection — local UI state only
  selectNode: (id: string | null) => void;
  selectEdge: (id: string | null) => void;
}

export const useWorkflowStore = create<WorkflowState>((set) => ({
  nodes: new Map(),
  edges: new Map(),
  selectedNodeId: null,
  selectedEdgeId: null,

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

  selectNode: (id) => set({ selectedNodeId: id, selectedEdgeId: null }),
  selectEdge: (id) => set({ selectedEdgeId: id, selectedNodeId: null }),
}));
