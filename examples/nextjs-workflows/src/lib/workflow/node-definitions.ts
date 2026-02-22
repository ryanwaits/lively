import type { WorkflowNodeType, Port } from "@/types/workflow";
import type { NodeConfigMap } from "@/types/node-configs";

export type NodeCategory = "triggers" | "filters" | "transforms" | "actions";

export interface NodeDefinition<T extends WorkflowNodeType = WorkflowNodeType> {
  type: T;
  label: string;
  description: string;
  category: NodeCategory;
  icon: string; // lucide icon name
  color: string; // tailwind-friendly hex
  ports: Port[];
  defaultConfig: NodeConfigMap[T];
}

export const NODE_DEFINITIONS: Record<WorkflowNodeType, NodeDefinition> = {
  "event-trigger": {
    type: "event-trigger",
    label: "Event Trigger",
    description: "Listen for blockchain events on Stacks",
    category: "triggers",
    icon: "Zap",
    color: "#f59e0b",
    ports: [
      { id: "event-out", direction: "output", dataType: "event", label: "Events" },
    ],
    defaultConfig: { network: "mainnet" },
  },
  "stx-filter": {
    type: "stx-filter",
    label: "STX Filter",
    description: "Filter STX transfer, mint, burn, or lock events",
    category: "filters",
    icon: "Filter",
    color: "#3b82f6",
    ports: [
      { id: "in", direction: "input", dataType: "event", label: "Events" },
      { id: "out", direction: "output", dataType: "filtered", label: "Matched" },
    ],
    defaultConfig: { eventType: "transfer" },
  },
  "ft-filter": {
    type: "ft-filter",
    label: "FT Filter",
    description: "Filter fungible token events",
    category: "filters",
    icon: "Coins",
    color: "#3b82f6",
    ports: [
      { id: "in", direction: "input", dataType: "event", label: "Events" },
      { id: "out", direction: "output", dataType: "filtered", label: "Matched" },
    ],
    defaultConfig: { eventType: "transfer" },
  },
  "nft-filter": {
    type: "nft-filter",
    label: "NFT Filter",
    description: "Filter non-fungible token events",
    category: "filters",
    icon: "ImageIcon",
    color: "#3b82f6",
    ports: [
      { id: "in", direction: "input", dataType: "event", label: "Events" },
      { id: "out", direction: "output", dataType: "filtered", label: "Matched" },
    ],
    defaultConfig: { eventType: "transfer" },
  },
  "contract-filter": {
    type: "contract-filter",
    label: "Contract Filter",
    description: "Filter contract call events",
    category: "filters",
    icon: "FileCode",
    color: "#3b82f6",
    ports: [
      { id: "in", direction: "input", dataType: "event", label: "Events" },
      { id: "out", direction: "output", dataType: "filtered", label: "Matched" },
    ],
    defaultConfig: {},
  },
  "print-event-filter": {
    type: "print-event-filter",
    label: "Print Event Filter",
    description: "Filter contract print events by topic or content",
    category: "filters",
    icon: "MessageSquare",
    color: "#3b82f6",
    ports: [
      { id: "in", direction: "input", dataType: "event", label: "Events" },
      { id: "out", direction: "output", dataType: "filtered", label: "Matched" },
    ],
    defaultConfig: {},
  },
  "transform": {
    type: "transform",
    label: "Transform",
    description: "Transform event data with JSONata or JavaScript",
    category: "transforms",
    icon: "Sparkles",
    color: "#8b5cf6",
    ports: [
      { id: "in", direction: "input", dataType: "filtered", label: "Data" },
      { id: "out", direction: "output", dataType: "transformed", label: "Result" },
    ],
    defaultConfig: { expression: "$", language: "jsonata" },
  },
  "webhook-action": {
    type: "webhook-action",
    label: "Webhook",
    description: "Send event data to an HTTP endpoint",
    category: "actions",
    icon: "Send",
    color: "#10b981",
    ports: [
      { id: "in", direction: "input", dataType: "transformed", label: "Payload" },
    ],
    defaultConfig: { url: "", method: "POST", headers: {}, retryCount: 3 },
  },
};

export const CATEGORIES: { key: NodeCategory; label: string }[] = [
  { key: "triggers", label: "Triggers" },
  { key: "filters", label: "Filters" },
  { key: "transforms", label: "Transforms" },
  { key: "actions", label: "Actions" },
];
