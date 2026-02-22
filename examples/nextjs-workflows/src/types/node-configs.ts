export interface EventTriggerConfig {
  network: "mainnet" | "testnet";
  startBlock?: number;
}

export type StxEventType = "transfer" | "mint" | "burn" | "lock";

export interface StxFilterConfig {
  eventType: StxEventType;
  sender?: string;
  recipient?: string;
  minAmount?: number;
  maxAmount?: number;
}

export interface FtFilterConfig {
  contractId?: string;
  eventType: "transfer" | "mint" | "burn";
  sender?: string;
  recipient?: string;
  minAmount?: number;
  maxAmount?: number;
}

export interface NftFilterConfig {
  contractId?: string;
  eventType: "transfer" | "mint" | "burn";
  sender?: string;
  recipient?: string;
  tokenId?: string;
}

export interface ContractFilterConfig {
  contractId?: string;
  functionName?: string;
  sender?: string;
}

export interface PrintEventFilterConfig {
  contractId?: string;
  topic?: string;
  contains?: string;
}

export interface TransformConfig {
  expression: string;
  language: "jsonata" | "javascript";
}

export interface WebhookActionConfig {
  url: string;
  method: "POST" | "PUT";
  headers: Record<string, string>;
  retryCount: number;
}

export interface NodeConfigMap {
  "event-trigger": EventTriggerConfig;
  "stx-filter": StxFilterConfig;
  "ft-filter": FtFilterConfig;
  "nft-filter": NftFilterConfig;
  "contract-filter": ContractFilterConfig;
  "print-event-filter": PrintEventFilterConfig;
  "transform": TransformConfig;
  "webhook-action": WebhookActionConfig;
}
