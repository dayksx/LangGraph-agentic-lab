import { EventTrigger } from '../types/events.js';

export interface EventSourceConfig {
  name: string;
  type: 'rss' | 'webhook' | 'api' | 'blockchain' | 'social';
  enabled: boolean;
  checkInterval?: number; // milliseconds
  filters?: EventFilter[];
}

export interface EventFilter {
  field: string;
  operator: 'equals' | 'contains' | 'regex' | 'greater_than' | 'less_than';
  value: any;
}

export interface EventSource {
  config: EventSourceConfig;
  
  initialize(): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  cleanup(): Promise<void>;
  
  /**
   * Register a callback function to be called when an event is triggered.
   * 
   * Implementation pattern:
   * ```typescript
   * class MyEventSource implements EventSource {
   *   private eventCallback?: (event: EventTrigger) => Promise<void>;
   *   
   *   onEvent(callback: (event: EventTrigger) => Promise<void>): void {
   *     this.eventCallback = callback;
   *   }
   *   
   *   // When an event occurs, trigger the callback:
   *   private async handleEvent(event: EventTrigger): Promise<void> {
   *     if (this.eventCallback) {
   *       await this.eventCallback(event);
   *     }
   *   }
   * }
   * ```
   */
  onEvent(callback: (event: EventTrigger) => Promise<void>): void;
  
  // Get status information
  getStatus(): {
    isRunning: boolean;
    lastCheck: Date;
    enabled: boolean;
    checkInterval: number;
  };
} 