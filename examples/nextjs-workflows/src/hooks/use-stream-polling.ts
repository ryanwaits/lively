"use client";

import { useEffect, useRef } from "react";
import { useWorkflowStore } from "@/lib/store/workflow-store";
import { streamsApi } from "@/lib/api/streams-client";
import type { WorkflowMutationsApi } from "@/lib/sync/mutations-context";

const POLL_INTERVAL = 10_000; // 10s

export function useStreamPolling(mutations: WorkflowMutationsApi) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    function poll() {
      const { stream } = useWorkflowStore.getState();
      if (!stream.streamId) return;
      if (stream.status !== "active" && stream.status !== "paused") return;

      streamsApi.get(stream.streamId).then((res) => {
        const statusMap: Record<string, string> = {
          inactive: "paused",
          active: "active",
          paused: "paused",
          failed: "failed",
        };
        mutations.updateStream({
          status: statusMap[res.status] ?? res.status,
          totalDeliveries: res.totalDeliveries ?? 0,
          failedDeliveries: res.failedDeliveries ?? 0,
          lastTriggeredAt: res.lastTriggeredAt ?? null,
          lastTriggeredBlock: res.lastTriggeredBlock ?? null,
          errorMessage: res.errorMessage ?? null,
        });
      }).catch(() => {
        // Silently ignore polling errors
      });
    }

    // Initial poll
    poll();

    intervalRef.current = setInterval(poll, POLL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [mutations]);
}
