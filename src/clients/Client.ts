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
  
  /**
   * Register a callback function to be called when a message is received.
   * 
   * Implementation pattern:
   * ```typescript
   * class MyClient implements Client {
   *   private messageCallback?: (message: BaseMessage) => Promise<void>;
   *   
   *   onMessage(callback: (message: BaseMessage) => Promise<void>): void {
   *     this.messageCallback = callback;
   *   }
   *   
   *   // When a message is received, trigger the callback:
   *   private async handleIncomingMessage(message: BaseMessage): Promise<void> {
   *     if (this.messageCallback) {
   *       await this.messageCallback(message);
   *     }
   *   }
   * }
   * ```
   */
  onMessage(callback: (message: BaseMessage) => Promise<void>): void;
} 