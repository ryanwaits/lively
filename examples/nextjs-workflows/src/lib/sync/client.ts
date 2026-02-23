"use client";

import { LivelyClient, LiveObject, LiveMap } from "@waits/lively-client";
import type { WorkflowTemplate } from "@/lib/workflow/templates";

const serverUrl =
  process.env.NEXT_PUBLIC_LIVELY_HOST || "http://localhost:1999";

export const client = new LivelyClient({ serverUrl, reconnect: true });

export function buildInitialStorage(template?: WorkflowTemplate, workflowId?: string) {
  const nodes = new LiveMap<LiveObject>();
  const edges = new LiveMap<LiveObject>();

  const webhookUrl = workflowId
    ? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/${workflowId}`
    : "";

  if (template) {
    for (const node of template.nodes) {
      const data = { ...node };
      // Auto-populate webhook URL on action nodes
      if (data.type === "webhook-action" && webhookUrl) {
        data.config = { ...data.config, url: webhookUrl };
      }
      nodes.set(data.id, new LiveObject(data));
    }
    for (const edge of template.edges) {
      edges.set(edge.id, new LiveObject({ ...edge }));
    }
  }

  return {
    meta: new LiveObject({ name: template?.name ?? "Untitled Workflow", status: "draft" }),
    nodes,
    edges,
    stream: new LiveObject({
      streamId: null,
      status: "draft",
      lastDeployedAt: null,
      errorMessage: null,
      totalDeliveries: 0,
      failedDeliveries: 0,
      lastTriggeredAt: null,
      lastTriggeredBlock: null,
    }),
  };
}
