// Simplified event types
export interface OnchainEvent {
  type: 'onchain_event';
  network: string;
  eventType: string;
  contractAddress?: string;
  transactionHash?: string;
  blockNumber?: number;
  data: any;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface WebEvent {
  type: 'web_event';
  source: string;
  title: string;
  content: string;
  url?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export type EventTrigger = OnchainEvent | WebEvent; 