"use client";

import { useWorkflowStore } from "@/lib/store/workflow-store";
import { BaseNode } from "@/components/nodes/base-node";

interface NodeLayerProps {
  onPortPointerDown?: (nodeId: string, portId: string, e: React.PointerEvent) => void;
}

export function NodeLayer({ onPortPointerDown }: NodeLayerProps) {
  const nodes = useWorkflowStore((s) => s.nodes);
  const selectedNodeId = useWorkflowStore((s) => s.selectedNodeId);

  return (
    <g>
      {Array.from(nodes.values()).map((node) => (
        <BaseNode
          key={node.id}
          node={node}
          isSelected={node.id === selectedNodeId}
          onPortPointerDown={onPortPointerDown}
        />
      ))}
    </g>
  );
}
