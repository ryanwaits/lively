import type { WorkflowNode, WorkflowEdge } from "@/types/workflow";

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

/** Fixed room ID — everyone joins the same workflow. */
export const DEFAULT_WORKFLOW_ID = "stx-transfer-monitor";

export const DEFAULT_WORKFLOW: WorkflowTemplate = {
  id: DEFAULT_WORKFLOW_ID,
  name: "STX Transfer Monitor",
  description: "Track STX transfers with optional sender/recipient filters",
  nodes: [
    {
      id: "trigger-1",
      type: "event-trigger",
      label: "Event Trigger",
      position: { x: 100, y: 200 },
      config: {},
    },
    {
      id: "filter-1",
      type: "stx-filter",
      label: "STX Filter",
      position: { x: 420, y: 200 },
      config: { eventType: "transfer" },
    },
    {
      id: "action-1",
      type: "webhook-action",
      label: "Webhook",
      position: { x: 740, y: 200 },
      config: { url: "", retryCount: 3, includeRawTx: false, decodeClarityValues: true, includeBlockMetadata: true },
    },
  ],
  edges: [
    { id: "edge-1", sourceNodeId: "trigger-1", sourcePortId: "event-out", targetNodeId: "filter-1", targetPortId: "in" },
    { id: "edge-2", sourceNodeId: "filter-1", sourcePortId: "out", targetNodeId: "action-1", targetPortId: "in" },
  ],
};
