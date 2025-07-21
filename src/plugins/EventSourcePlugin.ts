import { Plugin, PluginConfig } from './Plugin.js';
import { DynamicTool } from '@langchain/core/tools';
import { EventTrigger, WebEvent, OnchainEvent } from '../types/events.js';

export interface EventSourceConfig extends PluginConfig {
  sourceType: 'rss' | 'webhook' | 'api' | 'blockchain' | 'social';
  checkInterval?: number; // milliseconds
  enabled: boolean;
  filters?: EventFilter[];
}

export interface EventFilter {
  field: string;
  operator: 'equals' | 'contains' | 'regex' | 'greater_than' | 'less_than';
  value: any;
}

export interface EventSourceData {
  raw: any;
  processed: EventTrigger;
  timestamp: Date;
  source: string;
}

export abstract class EventSourcePlugin implements Plugin {
  public config: EventSourceConfig;
  public tools: DynamicTool[] = [];
  
  protected isRunning: boolean = false;
  protected eventCallback?: (event: EventTrigger) => Promise<void>;
  protected lastCheck: Date = new Date(0);
  protected checkInterval: number;

  constructor(config: EventSourceConfig) {
    this.config = {
      name: config.name || 'event_source',
      description: config.description || 'Generic event source plugin',
      version: config.version || '1.0.0',
      sourceType: config.sourceType,
      checkInterval: config.checkInterval || 300000, // 5 minutes default
      enabled: config.enabled ?? true,
      filters: config.filters || []
    };
    this.checkInterval = this.config.checkInterval || 300000; // Use default if undefined
  }

  public async initialize(): Promise<void> {
    console.log(`🚀 Initializing ${this.config.sourceType} event source: ${this.config.name}`);
    
    if (this.config.enabled) {
      await this.startMonitoring();
    }
  }

  public async cleanup(): Promise<void> {
    console.log(`🧹 Cleaning up ${this.config.sourceType} event source: ${this.config.name}`);
    await this.stopMonitoring();
  }

  // Abstract methods that must be implemented by subclasses
  protected abstract fetchEvents(): Promise<EventSourceData[]>;
  protected abstract transformToEventTrigger(data: EventSourceData): EventTrigger;

  // Start monitoring for events
  protected async startMonitoring(): Promise<void> {
    if (this.isRunning) {
      console.log(`⚠️  ${this.config.name} is already running`);
      return;
    }

    this.isRunning = true;
    console.log(`📡 Starting ${this.config.sourceType} monitoring for ${this.config.name}`);

    // Start the monitoring loop
    this.monitoringLoop();
  }

  // Stop monitoring
  protected async stopMonitoring(): Promise<void> {
    this.isRunning = false;
    console.log(`🛑 Stopped ${this.config.sourceType} monitoring for ${this.config.name}`);
  }

  // Main monitoring loop
  private async monitoringLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        await this.checkForNewEvents();
        await this.sleep(this.checkInterval);
      } catch (error) {
        console.error(`❌ Error in monitoring loop for ${this.config.name}:`, error);
        // Wait a bit before retrying
        await this.sleep(30000); // 30 seconds
      }
    }
  }

  // Check for new events
  private async checkForNewEvents(): Promise<void> {
    const events = await this.fetchEvents();
    
    for (const eventData of events) {
      // Apply filters
      if (this.shouldProcessEvent(eventData)) {
        const eventTrigger = this.transformToEventTrigger(eventData);
        
        if (this.eventCallback) {
          try {
            await this.eventCallback(eventTrigger);
            console.log(`📨 Processed ${eventTrigger.type} event from ${this.config.name}`);
          } catch (error) {
            console.error(`❌ Error processing event from ${this.config.name}:`, error);
          }
        }
      }
    }
  }

  // Apply filters to determine if event should be processed
  private shouldProcessEvent(eventData: EventSourceData): boolean {
    if (!this.config.filters || this.config.filters.length === 0) {
      return true;
    }

    return this.config.filters.every(filter => {
      const value = this.getNestedValue(eventData.processed, filter.field);
      
      switch (filter.operator) {
        case 'equals':
          return value === filter.value;
        case 'contains':
          return String(value).includes(String(filter.value));
        case 'regex':
          return new RegExp(filter.value).test(String(value));
        case 'greater_than':
          return Number(value) > Number(filter.value);
        case 'less_than':
          return Number(value) < Number(filter.value);
        default:
          return true;
      }
    });
  }

  // Helper to get nested object values
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  // Set event callback
  public setEventCallback(callback: (event: EventTrigger) => Promise<void>): void {
    this.eventCallback = callback;
  }

  // Manual event injection for testing
  public async injectEvent(event: EventTrigger): Promise<void> {
    if (this.eventCallback) {
      await this.eventCallback(event);
    }
  }

  // Get current status
  public getStatus(): {
    isRunning: boolean;
    lastCheck: Date;
    sourceType: string;
    enabled: boolean;
    checkInterval: number;
  } {
    return {
      isRunning: this.isRunning,
      lastCheck: this.lastCheck,
      sourceType: this.config.sourceType,
      enabled: this.config.enabled,
      checkInterval: this.checkInterval
    };
  }

  // Utility method for sleeping
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Update check interval
  public updateCheckInterval(newInterval: number): void {
    this.checkInterval = newInterval;
    console.log(`⏱️  Updated check interval for ${this.config.name} to ${newInterval}ms`);
  }

  // Enable/disable the source
  public setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    if (enabled && !this.isRunning) {
      this.startMonitoring();
    } else if (!enabled && this.isRunning) {
      this.stopMonitoring();
    }
  }
}

// RSS Event Source Plugin
export class RSSEventSourcePlugin extends EventSourcePlugin {
  private feedUrl: string;
  private lastItems: Set<string> = new Set();

  constructor(config: EventSourceConfig & { feedUrl: string }) {
    super(config);
    this.feedUrl = config.feedUrl;
  }

  protected async fetchEvents(): Promise<EventSourceData[]> {
    try {
      // This is a simplified implementation - you'd want to use a proper RSS parser
      const response = await fetch(this.feedUrl);
      const text = await response.text();
      
      // Parse RSS feed (simplified - use a proper RSS parser in production)
      const items = this.parseRSSFeed(text);
      
      const newItems = items.filter(item => !this.lastItems.has(item.guid || item.link));
      
      // Update last items
      newItems.forEach(item => {
        this.lastItems.add(item.guid || item.link);
      });

      return newItems.map(item => ({
        raw: item,
        processed: this.transformToEventTrigger({
          raw: item,
          processed: {} as EventTrigger, // Will be set by transformToEventTrigger
          timestamp: new Date(item.pubDate || Date.now()),
          source: this.config.name
        }),
        timestamp: new Date(item.pubDate || Date.now()),
        source: this.config.name
      }));
    } catch (error) {
      console.error(`❌ Error fetching RSS feed from ${this.feedUrl}:`, error);
      return [];
    }
  }

  protected transformToEventTrigger(data: EventSourceData): EventTrigger {
    const item = data.raw;
    
    return {
      type: 'web_event',
      source: this.config.name,
      title: item.title,
      content: item.description || item.content,
      url: item.link,
      timestamp: data.timestamp,
      metadata: {
        category: this.determineCategory(item),
        urgency: this.determineUrgency(item)
      }
    } as WebEvent;
  }

  private parseRSSFeed(xmlText: string): any[] {
    // Simplified RSS parsing - use a proper library like 'rss-parser' in production
    const items: any[] = [];
    
    // Basic regex-based parsing (not recommended for production)
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    
    while ((match = itemRegex.exec(xmlText)) !== null) {
      const itemXml = match[1];
      
      const title = this.extractTag(itemXml, 'title');
      const description = this.extractTag(itemXml, 'description');
      const link = this.extractTag(itemXml, 'link');
      const pubDate = this.extractTag(itemXml, 'pubDate');
      const guid = this.extractTag(itemXml, 'guid');
      
      items.push({
        title,
        description,
        link,
        pubDate,
        guid,
        content: description
      });
    }
    
    return items;
  }

  private extractTag(xml: string, tag: string): string {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`);
    const match = xml.match(regex);
    return match ? match[1].trim() : '';
  }

  private determineCategory(item: any): string {
    const title = item.title.toLowerCase();
    const description = item.description.toLowerCase();
    
    if (title.includes('crypto') || title.includes('bitcoin') || title.includes('ethereum')) {
      return 'crypto';
    }
    if (title.includes('stock') || title.includes('market') || title.includes('finance')) {
      return 'financial';
    }
    if (title.includes('ai') || title.includes('artificial intelligence')) {
      return 'technology';
    }
    
    return 'general';
  }

  private determineUrgency(item: any): 'low' | 'medium' | 'high' | 'critical' {
    const title = item.title.toLowerCase();
    
    if (title.includes('breaking') || title.includes('urgent') || title.includes('alert')) {
      return 'critical';
    }
    if (title.includes('important') || title.includes('major')) {
      return 'high';
    }
    if (title.includes('update') || title.includes('news')) {
      return 'medium';
    }
    
    return 'low';
  }
}

// Webhook Event Source Plugin
export class WebhookEventSourcePlugin extends EventSourcePlugin {
  private webhookUrl: string;
  private server: any; // Express server for webhook endpoint

  constructor(config: EventSourceConfig & { webhookUrl: string; port?: number }) {
    super(config);
    this.webhookUrl = config.webhookUrl;
  }

  protected async fetchEvents(): Promise<EventSourceData[]> {
    // Webhooks don't fetch events - they receive them
    // This method is called for compatibility but doesn't do anything
    return [];
  }

  protected transformToEventTrigger(data: EventSourceData): EventTrigger {
    const payload = data.raw;
    
    // Determine event type based on payload structure
    if (payload.type === 'blockchain') {
      return {
        type: 'onchain_event',
        network: payload.network,
        eventType: payload.eventType,
        contractAddress: payload.contractAddress,
        transactionHash: payload.transactionHash,
        blockNumber: payload.blockNumber,
        data: payload.data,
        timestamp: data.timestamp,
        metadata: {
          significance: payload.significance
        }
      } as OnchainEvent;
    }
    
    // Default to web event for everything else
    return {
      type: 'web_event',
      source: this.config.name,
      title: payload.title || payload.headline || 'Webhook Event',
      content: payload.content || payload.description || JSON.stringify(payload),
      url: payload.url,
      timestamp: data.timestamp,
      metadata: {
        category: payload.category || 'general',
        urgency: payload.urgency || 'medium'
      }
    } as WebEvent;
  }

  public async startWebhookServer(port: number = 3001): Promise<void> {
    // This would set up an Express server to receive webhooks
    // Implementation depends on your preferred web framework
    console.log(`🌐 Webhook server would start on port ${port} for ${this.config.name}`);
  }
}

// API Event Source Plugin
export class APIEventSourcePlugin extends EventSourcePlugin {
  private apiUrl: string;
  private apiKey?: string;
  private headers: Record<string, string>;

  constructor(config: EventSourceConfig & { 
    apiUrl: string; 
    apiKey?: string;
    headers?: Record<string, string>;
  }) {
    super(config);
    this.apiUrl = config.apiUrl;
    this.apiKey = config.apiKey;
    this.headers = config.headers || {};
  }

  protected async fetchEvents(): Promise<EventSourceData[]> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...this.headers
      };

      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(this.apiUrl, { headers });
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Transform API response to event data
      return this.transformApiResponse(data);
    } catch (error) {
      console.error(`❌ Error fetching from API ${this.apiUrl}:`, error);
      return [];
    }
  }

  protected transformToEventTrigger(data: EventSourceData): EventTrigger {
    // Implementation depends on the specific API structure
    const payload = data.raw;
    
    // Default transformation - override in subclasses for specific APIs
    return {
      type: 'web_event',
      source: this.config.name,
      title: payload.title || payload.headline || 'API Event',
      content: payload.content || payload.description || JSON.stringify(payload),
      url: payload.url,
      timestamp: data.timestamp,
      metadata: {
        category: 'general',
        urgency: 'medium'
      }
    } as WebEvent;
  }

  private transformApiResponse(data: any): EventSourceData[] {
    // Default transformation - override in subclasses
    if (Array.isArray(data)) {
      return data.map(item => ({
        raw: item,
        processed: {} as EventTrigger, // Will be set by transformToEventTrigger
        timestamp: new Date(item.timestamp || item.publishedAt || Date.now()),
        source: this.config.name
      }));
    } else if (data.items && Array.isArray(data.items)) {
      return data.items.map((item: any) => ({
        raw: item,
        processed: {} as EventTrigger,
        timestamp: new Date(item.timestamp || item.publishedAt || Date.now()),
        source: this.config.name
      }));
    } else {
      return [{
        raw: data,
        processed: {} as EventTrigger,
        timestamp: new Date(data.timestamp || data.publishedAt || Date.now()),
        source: this.config.name
      }];
    }
  }
} 