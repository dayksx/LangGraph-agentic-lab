import { BaseMessage, HumanMessage } from "@langchain/core/messages";
import { Client, ClientConfig } from "../src/clients/Client.js";
import { EventSource, EventSourceConfig } from "../src/events/EventSource.js";
import { EventTrigger } from "../src/types/events.js";

// Example implementation of Client interface
class WebSocketClient implements Client {
  config: ClientConfig;
  private messageCallback?: (message: BaseMessage) => Promise<void>;
  private ws?: WebSocket;

  constructor(config: ClientConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    console.log(`Initializing WebSocket client: ${this.config.name}`);
  }

  async start(): Promise<void> {
    // Simulate WebSocket connection
    console.log(`Starting WebSocket client: ${this.config.name}`);
    
    // Simulate receiving messages periodically
    setInterval(() => {
      const mockMessage = new HumanMessage(`Mock message from ${this.config.name} at ${new Date().toISOString()}`);
      this.handleIncomingMessage(mockMessage);
    }, 5000);
  }

  async stop(): Promise<void> {
    console.log(`Stopping WebSocket client: ${this.config.name}`);
  }

  async sendMessage(message: BaseMessage): Promise<void> {
    console.log(`Sending message: ${message.content}`);
  }

  onMessage(callback: (message: BaseMessage) => Promise<void>): void {
    this.messageCallback = callback;
  }

  // This is where the magic happens - when a message is received
  private async handleIncomingMessage(message: BaseMessage): Promise<void> {
    console.log(`Received message: ${message.content}`);
    
    // Trigger the registered callback
    if (this.messageCallback) {
      try {
        await this.messageCallback(message);
      } catch (error) {
        console.error('Error in message callback:', error);
      }
    }
  }
}

// Example implementation of EventSource interface
class RSSEventSource implements EventSource {
  config: EventSourceConfig;
  private eventCallback?: (event: EventTrigger) => Promise<void>;
  private intervalId?: NodeJS.Timeout;
  private isRunning = false;

  constructor(config: EventSourceConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    console.log(`Initializing RSS event source: ${this.config.name}`);
  }

  async start(): Promise<void> {
    this.isRunning = true;
    console.log(`Starting RSS event source: ${this.config.name}`);
    
    // Simulate checking for new RSS feeds
    this.intervalId = setInterval(() => {
      this.checkForNewEvents();
    }, this.config.checkInterval || 10000);
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    console.log(`Stopping RSS event source: ${this.config.name}`);
  }

  async cleanup(): Promise<void> {
    console.log(`Cleaning up RSS event source: ${this.config.name}`);
  }

  onEvent(callback: (event: EventTrigger) => Promise<void>): void {
    this.eventCallback = callback;
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      lastCheck: new Date(),
      enabled: this.config.enabled,
      checkInterval: this.config.checkInterval || 10000
    };
  }

  // This is where the magic happens - when an event is detected
  private async checkForNewEvents(): Promise<void> {
    // Simulate finding a new RSS item - using BreakingNewsEvent as example
    const mockEvent: EventTrigger = {
      type: 'breaking_news',
      source: this.config.name,
      headline: `New RSS item from ${this.config.name}`,
      content: `Content of the new item at ${new Date().toISOString()}`,
      timestamp: new Date(),
      category: 'general',
      urgency: 'medium'
    };

    console.log(`Detected new event: ${mockEvent.headline}`);
    
    // Trigger the registered callback
    if (this.eventCallback) {
      try {
        await this.eventCallback(mockEvent);
      } catch (error) {
        console.error('Error in event callback:', error);
      }
    }
  }
}

// Usage example
async function main() {
  console.log('=== Callback Pattern Example ===\n');

  // Create and configure a WebSocket client
  const wsClient = new WebSocketClient({
    name: "MyWebSocket",
    type: "websocket",
    enabled: true
  });

  // Register a callback for incoming messages
  wsClient.onMessage(async (message: BaseMessage) => {
    console.log(`🔵 WebSocket callback triggered: ${message.content}`);
    // Here you can process the message, send it to a workflow, etc.
  });

  // Create and configure an RSS event source
  const rssSource = new RSSEventSource({
    name: "TechNews",
    type: "rss",
    enabled: true,
    checkInterval: 8000 // Check every 8 seconds
  });

  // Register a callback for new events
  rssSource.onEvent(async (event: EventTrigger) => {
    if (event.type === 'breaking_news') {
      console.log(`🟡 RSS callback triggered: ${event.headline}`);
    } else if (event.type === 'emerging_trend') {
      console.log(`🟡 RSS callback triggered: ${event.topic}`);
    } else if (event.type === 'onchain_event') {
      console.log(`🟡 RSS callback triggered: ${event.eventType}`);
    }
    // Here you can process the event, trigger workflows, etc.
  });

  // Initialize and start both
  await wsClient.initialize();
  await rssSource.initialize();
  
  await wsClient.start();
  await rssSource.start();

  // Let them run for a while
  setTimeout(async () => {
    console.log('\n=== Stopping services ===');
    await wsClient.stop();
    await rssSource.stop();
    console.log('Example completed!');
  }, 30000); // Run for 30 seconds
}

// Run the example
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { WebSocketClient, RSSEventSource }; 