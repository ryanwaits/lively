"use client";

import { useWorkflowStore } from "@/lib/store/workflow-store";
import { BaseNode, type ExecutionState } from "@/components/nodes/base-node";

interface NodeLayerProps {
  onPortPointerDown?: (nodeId: string, portId: string, e: React.PointerEvent) => void;
}

export function NodeLayer({ onPortPointerDown }: NodeLayerProps) {
  const nodes = useWorkflowStore((s) => s.nodes);
  const selectedNodeId = useWorkflowStore((s) => s.selectedNodeId);
  const streamStatus = useWorkflowStore((s) => s.stream.status);

  // Derive execution state from stream status
  const executionState: ExecutionState =
    streamStatus === "active" ? "active"
    : streamStatus === "failed" ? "error"
    : "idle";

  return (
    <g>
      {Array.from(nodes.values()).map((node) => (
        <BaseNode
          key={node.id}
          node={node}
          isSelected={node.id === selectedNodeId}
          executionState={streamStatus !== "draft" ? executionState : "idle"}
          onPortPointerDown={onPortPointerDown}
        />
      ))}
    </g>
  );
}
