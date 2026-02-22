"use client";

import { useWorkflowStore } from "@/lib/store/workflow-store";
import { Activity } from "lucide-react";

export function StreamMetrics({ onClick }: { onClick?: () => void }) {
  const stream = useWorkflowStore((s) => s.stream);

  if (stream.status === "draft") return null;

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 rounded-lg border bg-white/90 px-3 py-1.5 text-xs backdrop-blur transition-colors hover:bg-white"
      style={{ borderColor: "#e5e7eb" }}
    >
      <Activity size={13} className="text-gray-400" />
      <div className="flex items-center gap-1">
        <span className="font-medium text-gray-900">{stream.totalDeliveries}</span>
        <span className="text-gray-400">delivered</span>
      </div>
      {stream.failedDeliveries > 0 && (
        <div className="flex items-center gap-1">
          <span className="font-medium text-red-600">{stream.failedDeliveries}</span>
          <span className="text-gray-400">failed</span>
        </div>
      )}
      {stream.lastTriggeredBlock && (
        <div className="flex items-center gap-1">
          <span className="text-gray-400">block</span>
          <span className="font-medium text-gray-700">#{stream.lastTriggeredBlock}</span>
        </div>
      )}
    </button>
  );
}
