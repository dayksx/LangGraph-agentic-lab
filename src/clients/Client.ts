import { BaseMessage } from "@langchain/core/messages";

export interface ClientConfig {
  name: string;
  type: string;
  enabled: boolean;
}

export interface Client {
  config: ClientConfig;
  
  initialize(): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  sendMessage(message: BaseMessage): Promise<void>;
  onMessage(callback: (message: BaseMessage) => Promise<void>): void;
} 