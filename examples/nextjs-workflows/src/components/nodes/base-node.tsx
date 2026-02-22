"use client";

import type { WorkflowNode } from "@/types/workflow";
import type {
  EventTriggerConfig, StxFilterConfig, FtFilterConfig, NftFilterConfig,
  ContractFilterConfig, PrintEventFilterConfig, TransformConfig, WebhookActionConfig,
} from "@/types/node-configs";
import { NODE_DEFINITIONS } from "@/lib/workflow/node-definitions";
import { NodePort } from "./node-port";
import { icons } from "lucide-react";
import { createElement } from "react";

const NODE_WIDTH = 280;
const NODE_MIN_HEIGHT = 80;

function getConfigSummary(node: WorkflowNode): string {
  switch (node.type) {
    case "event-trigger": {
      const c = node.config as EventTriggerConfig;
      return `Network: ${c.network}${c.startBlock ? ` from #${c.startBlock}` : ""}`;
    }
    case "stx-filter": {
      const c = node.config as StxFilterConfig;
      return `${c.eventType}${c.sender ? ` from ${c.sender.slice(0, 8)}...` : ""}${c.minAmount ? ` min:${c.minAmount}` : ""}`;
    }
    case "ft-filter": {
      const c = node.config as FtFilterConfig;
      return `${c.eventType}${c.contractId ? ` ${c.contractId.slice(0, 12)}...` : ""}`;
    }
    case "nft-filter": {
      const c = node.config as NftFilterConfig;
      return `${c.eventType}${c.contractId ? ` ${c.contractId.slice(0, 12)}...` : ""}`;
    }
    case "contract-filter": {
      const c = node.config as ContractFilterConfig;
      return c.contractId ? `${c.contractId.slice(0, 20)}...` : "No contract set";
    }
    case "print-event-filter": {
      const c = node.config as PrintEventFilterConfig;
      return c.topic || c.contains || "No filter set";
    }
    case "transform": {
      const c = node.config as TransformConfig;
      return `${c.language}: ${c.expression.slice(0, 30)}`;
    }
    case "webhook-action": {
      const c = node.config as WebhookActionConfig;
      return c.url ? `${c.method} ${c.url.slice(0, 25)}...` : "No URL set";
    }
    default:
      return "";
  }
}

interface BaseNodeProps {
  node: WorkflowNode;
  isSelected: boolean;
  onPortPointerDown?: (nodeId: string, portId: string, e: React.PointerEvent) => void;
}

export function BaseNode({ node, isSelected, onPortPointerDown }: BaseNodeProps) {
  const def = NODE_DEFINITIONS[node.type];
  const LucideIcon = icons[def.icon as keyof typeof icons];
  const inputPorts = def.ports.filter((p) => p.direction === "input");
  const outputPorts = def.ports.filter((p) => p.direction === "output");
  const configSummary = getConfigSummary(node);

  const totalHeight = Math.max(NODE_MIN_HEIGHT, 44 + 36);

  return (
    <g transform={`translate(${node.position.x},${node.position.y})`} data-node-id={node.id}>
      <foreignObject width={NODE_WIDTH} height={totalHeight} style={{ overflow: "visible" }}>
        <div
          className="flex flex-col rounded-xl border bg-white shadow-md"
          style={{
            width: NODE_WIDTH,
            borderColor: isSelected ? "#7b61ff" : "#e5e7eb",
            borderWidth: isSelected ? 2 : 1,
            boxShadow: isSelected ? "0 0 0 2px rgba(123,97,255,0.2)" : undefined,
          }}
          data-node-header="true"
        >
          {/* Header */}
          <div
            className="flex items-center gap-2 border-b px-3 py-2"
            style={{ borderColor: "#e5e7eb" }}
          >
            <div
              className="flex h-6 w-6 items-center justify-center rounded-md"
              style={{ backgroundColor: def.color + "20" }}
            >
              {LucideIcon && createElement(LucideIcon, { size: 14, color: def.color })}
            </div>
            <span className="text-sm font-medium text-gray-900 truncate">{node.label}</span>
          </div>
          {/* Body */}
          <div className="px-3 py-2">
            <p className="text-xs text-gray-500 truncate">{configSummary}</p>
          </div>
        </div>
      </foreignObject>

      {/* Input ports */}
      {inputPorts.map((port, i) => (
        <NodePort
          key={port.id}
          port={port}
          nodeWidth={NODE_WIDTH}
          index={i}
          totalPorts={inputPorts.length}
          onPointerDown={(e) => onPortPointerDown?.(node.id, port.id, e)}
        />
      ))}

      {/* Output ports */}
      {outputPorts.map((port, i) => (
        <NodePort
          key={port.id}
          port={port}
          nodeWidth={NODE_WIDTH}
          index={i}
          totalPorts={outputPorts.length}
          onPointerDown={(e) => onPortPointerDown?.(node.id, port.id, e)}
        />
      ))}
    </g>
  );
}

export { NODE_WIDTH };
