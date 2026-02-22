"use client";

import { useWorkflowStore } from "@/lib/store/workflow-store";
import { AlertTriangle, RefreshCw, X } from "lucide-react";

export function StreamErrorBanner({ onRetry, onDismiss }: { onRetry: () => void; onDismiss: () => void }) {
  const errorMessage = useWorkflowStore((s) => s.stream.errorMessage);

  if (!errorMessage) return null;

  return (
    <div className="absolute left-1/2 top-16 z-30 flex -translate-x-1/2 items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 shadow-sm">
      <AlertTriangle size={14} className="shrink-0 text-red-500" />
      <span className="text-xs text-red-700">{errorMessage}</span>
      <button
        onClick={onRetry}
        className="ml-2 flex items-center gap-1 rounded-md bg-red-100 px-2 py-1 text-[11px] font-medium text-red-700 transition-colors hover:bg-red-200"
      >
        <RefreshCw size={11} />
        Retry
      </button>
      <button
        onClick={onDismiss}
        className="flex items-center justify-center rounded-md p-0.5 text-red-400 transition-colors hover:bg-red-100 hover:text-red-600"
      >
        <X size={13} />
      </button>
    </div>
  );
}
