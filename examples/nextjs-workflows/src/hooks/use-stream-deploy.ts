"use client";

import { useCallback, useState } from "react";
import { useWorkflowStore } from "@/lib/store/workflow-store";
import { compileStream } from "@/lib/workflow/compile-stream";
import { streamsApi } from "@/lib/api/streams-client";
import type { WorkflowMutationsApi } from "@/lib/sync/mutations-context";

export function useStreamDeploy(mutations: WorkflowMutationsApi) {
  const [deploying, setDeploying] = useState(false);

  const deploy = useCallback(async () => {
    const { nodes, edges, meta, stream } = useWorkflowStore.getState();

    const result = compileStream(meta.name, nodes, edges);
    if (!result.ok) {
      mutations.updateStream({ errorMessage: result.errors.join("; ") });
      return { ok: false as const, errors: result.errors };
    }

    setDeploying(true);
    mutations.updateStream({ status: "deploying", errorMessage: null });

    try {
      if (stream.streamId) {
        // Re-deploy: PATCH existing stream
        const updated = await streamsApi.update(stream.streamId, result.stream);
        if (updated.status !== "active") await streamsApi.enable(stream.streamId);
        mutations.updateStream({
          status: "active",
          lastDeployedAt: new Date().toISOString(),
          errorMessage: null,
        });
      } else {
        // First deploy: POST new stream
        const { stream: created } = await streamsApi.create(result.stream);
        if (created.status !== "active") await streamsApi.enable(created.id);
        mutations.updateStream({
          streamId: created.id,
          status: "active",
          lastDeployedAt: new Date().toISOString(),
          errorMessage: null,
        });
      }
      return { ok: true as const };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Deploy failed";
      mutations.updateStream({ status: "failed", errorMessage: message });
      return { ok: false as const, errors: [message] };
    } finally {
      setDeploying(false);
    }
  }, [mutations]);

  const enable = useCallback(async () => {
    const { stream } = useWorkflowStore.getState();
    if (!stream.streamId) return;
    try {
      await streamsApi.enable(stream.streamId);
      mutations.updateStream({ status: "active", errorMessage: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Enable failed";
      mutations.updateStream({ errorMessage: message });
    }
  }, [mutations]);

  const disable = useCallback(async () => {
    const { stream } = useWorkflowStore.getState();
    if (!stream.streamId) return;
    try {
      await streamsApi.disable(stream.streamId);
      mutations.updateStream({ status: "paused" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Disable failed";
      mutations.updateStream({ errorMessage: message });
    }
  }, [mutations]);

  const remove = useCallback(async () => {
    const { stream } = useWorkflowStore.getState();
    if (!stream.streamId) return;
    try {
      await streamsApi.delete(stream.streamId);
      mutations.updateStream({
        streamId: null,
        status: "draft",
        lastDeployedAt: null,
        errorMessage: null,
        totalDeliveries: 0,
        failedDeliveries: 0,
        lastTriggeredAt: null,
        lastTriggeredBlock: null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Delete failed";
      mutations.updateStream({ errorMessage: message });
    }
  }, [mutations]);

  return { deploy, enable, disable, remove, deploying };
}
