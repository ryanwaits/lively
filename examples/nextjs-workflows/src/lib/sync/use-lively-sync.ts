"use client";

import { useEffect } from "react";
import type { LiveObject, LiveMap } from "@waits/lively-client";
import { useRoom, useStorageRoot } from "@waits/lively-react";
import { useWorkflowStore } from "@/lib/store/workflow-store";
import type { StreamState } from "@/lib/store/workflow-store";
import type { WorkflowNode, WorkflowEdge } from "@/types/workflow";

function liveObjectToNode(lo: LiveObject): WorkflowNode | null {
  if (typeof lo.toObject !== "function") return null;
  const raw = lo.toObject();
  return {
    id: raw.id as string,
    type: raw.type as WorkflowNode["type"],
    label: raw.label as string,
    position: typeof raw.position === "string" ? JSON.parse(raw.position) : raw.position as WorkflowNode["position"],
    config: typeof raw.config === "string" ? JSON.parse(raw.config) : raw.config as WorkflowNode["config"],
  };
}

function liveObjectToEdge(lo: LiveObject): WorkflowEdge | null {
  if (typeof lo.toObject !== "function") return null;
  const raw = lo.toObject();
  return {
    id: raw.id as string,
    sourceNodeId: raw.sourceNodeId as string,
    sourcePortId: raw.sourcePortId as string,
    targetNodeId: raw.targetNodeId as string,
    targetPortId: raw.targetPortId as string,
  };
}

export function useLivelySync(): void {
  const room = useRoom();
  const storage = useStorageRoot();
  const root = storage?.root ?? null;

  const syncNodes = useWorkflowStore((s) => s.syncNodes);
  const syncEdges = useWorkflowStore((s) => s.syncEdges);
  const syncMeta = useWorkflowStore((s) => s.syncMeta);
  const syncStream = useWorkflowStore((s) => s.syncStream);

  useEffect(() => {
    if (!root) return;

    const nodesMap = root.get("nodes") as LiveMap<LiveObject> | undefined;
    const edgesMap = root.get("edges") as LiveMap<LiveObject> | undefined;
    const metaObj = root.get("meta") as LiveObject | undefined;
    const streamObj = root.get("stream") as LiveObject | undefined;

    function doSyncNodes() {
      if (!nodesMap) return;
      const arr: WorkflowNode[] = [];
      nodesMap.forEach((lo: LiveObject) => {
        const node = liveObjectToNode(lo);
        if (node) arr.push(node);
      });
      syncNodes(arr);
    }

    function doSyncEdges() {
      if (!edgesMap) return;
      const arr: WorkflowEdge[] = [];
      edgesMap.forEach((lo: LiveObject) => {
        const edge = liveObjectToEdge(lo);
        if (edge) arr.push(edge);
      });
      syncEdges(arr);
    }

    function doSyncMeta() {
      if (!metaObj) return;
      const raw = metaObj.toObject();
      syncMeta({ name: raw.name as string, status: raw.status as string });
    }

    function doSyncStream() {
      if (!streamObj) return;
      const raw = streamObj.toObject();
      syncStream({
        streamId: (raw.streamId as string) || null,
        status: (raw.status as StreamState["status"]) || "draft",
        lastDeployedAt: (raw.lastDeployedAt as string) || null,
        errorMessage: (raw.errorMessage as string) || null,
        totalDeliveries: (raw.totalDeliveries as number) || 0,
        failedDeliveries: (raw.failedDeliveries as number) || 0,
        lastTriggeredAt: (raw.lastTriggeredAt as string) || null,
        lastTriggeredBlock: (raw.lastTriggeredBlock as number) || null,
      });
    }

    doSyncNodes();
    doSyncEdges();
    doSyncMeta();
    doSyncStream();

    const unsubNodes = nodesMap
      ? room.subscribe(nodesMap, doSyncNodes, { isDeep: true })
      : undefined;
    const unsubEdges = edgesMap
      ? room.subscribe(edgesMap, doSyncEdges, { isDeep: true })
      : undefined;
    const unsubMeta = metaObj
      ? room.subscribe(metaObj, doSyncMeta)
      : undefined;
    const unsubStream = streamObj
      ? room.subscribe(streamObj, doSyncStream)
      : undefined;

    return () => {
      unsubNodes?.();
      unsubEdges?.();
      unsubMeta?.();
      unsubStream?.();
    };
  }, [root, room, syncNodes, syncEdges, syncMeta, syncStream]);
}
