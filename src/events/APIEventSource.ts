import { EventSource, EventSourceConfig } from './EventSource.js';
import { EventTrigger, WebEvent } from '../types/events.js';

export interface APIEventSourceConfig extends EventSourceConfig {
  apiUrl: string;
  apiKey?: string;
  headers?: Record<string, string>;
  method?: 'GET' | 'POST';
  body?: any;
  transformResponse?: (data: any) => EventTrigger[];
}

export class APIEventSource implements EventSource {
  public config: APIEventSourceConfig;
  private isRunning: boolean = false;
  private eventCallback?: (event: EventTrigger) => Promise<void>;
  private lastCheck: Date = new Date(0);
  private checkInterval: number;

  constructor(config: APIEventSourceConfig) {
    this.config = {
      name: config.name || 'api_source',
      type: 'api',
      enabled: config.enabled ?? true,
      checkInterval: config.checkInterval || 600000, // 10 minutes default
      filters: config.filters || [],
      apiUrl: config.apiUrl,
      apiKey: config.apiKey,
      headers: config.headers || {},
      method: config.method || 'GET',
      body: config.body,
      transformResponse: config.transformResponse
    };
    this.checkInterval = this.config.checkInterval || 600000;
  }

  public async initialize(): Promise<void> {
    console.log(`🚀 Initializing API event source: ${this.config.name}`);
  }

  public async start(): Promise<void> {
    if (this.isRunning) {
      console.log(`⚠️  API source ${this.config.name} is already running`);
      return;
    }

    this.isRunning = true;
    console.log(`📡 Starting API monitoring for ${this.config.name}`);

    // Start the monitoring loop
    this.monitoringLoop();
  }

  public async stop(): Promise<void> {
    this.isRunning = false;
    console.log(`🛑 Stopped API monitoring for ${this.config.name}`);
  }

  public async cleanup(): Promise<void> {
    console.log(`🧹 Cleaning up API event source: ${this.config.name}`);
    await this.stop();
  }

  public onEvent(callback: (event: EventTrigger) => Promise<void>): void {
    this.eventCallback = callback;
  }

  public getStatus(): {
    isRunning: boolean;
    lastCheck: Date;
    enabled: boolean;
    checkInterval: number;
  } {
    return {
      isRunning: this.isRunning,
      lastCheck: this.lastCheck,
      enabled: this.config.enabled,
      checkInterval: this.checkInterval
    };
  }

  // Main monitoring loop
  private async monitoringLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        await this.checkForNewEvents();
        await this.sleep(this.checkInterval);
      } catch (error) {
        console.error(`❌ Error in API monitoring loop for ${this.config.name}:`, error);
        // Wait a bit before retrying
        await this.sleep(60000); // 1 minute
      }
    }
  }

  // Check for new events
  private async checkForNewEvents(): Promise<void> {
    const events = await this.fetchEvents();
    
    for (const event of events) {
      if (this.shouldProcessEvent(event)) {
        if (this.eventCallback) {
          try {
            await this.eventCallback(event);
            console.log(`📨 Processed API event from ${this.config.name}: ${this.getEventTitle(event)}`);
          } catch (error) {
            console.error(`❌ Error processing API event from ${this.config.name}:`, error);
          }
        }
      }
    }
  }

  // Fetch events from API
  private async fetchEvents(): Promise<EventTrigger[]> {
    try {
      console.log(`🔌 Checking API: ${this.config.name}`);
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...this.config.headers
      };

      if (this.config.apiKey) {
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
      }

      const requestOptions: RequestInit = {
        method: this.config.method,
        headers
      };

      if (this.config.method === 'POST' && this.config.body) {
        requestOptions.body = JSON.stringify(this.config.body);
      }

      const response = await fetch(this.config.apiUrl, requestOptions);
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      this.lastCheck = new Date();

      // Use custom transform function if provided, otherwise use default
      if (this.config.transformResponse) {
        return this.config.transformResponse(data);
      } else {
        return this.defaultTransformResponse(data);
      }
    } catch (error) {
      console.error(`❌ Error fetching from API ${this.config.apiUrl}:`, error);
      return [];
    }
  }

  // Default transformation for API responses
  private defaultTransformResponse(data: any): EventTrigger[] {
    const events: EventTrigger[] = [];

    // Handle different response formats
    if (Array.isArray(data)) {
      // Direct array of items
      data.forEach(item => {
        const event = this.transformItemToEvent(item);
        if (event) events.push(event);
      });
    } else if (data.articles && Array.isArray(data.articles)) {
      // News API format
      data.articles.forEach((article: any) => {
        const event = this.transformNewsArticleToEvent(article);
        if (event) events.push(event);
      });
    } else if (data.items && Array.isArray(data.items)) {
      // Generic items format
      data.items.forEach((item: any) => {
        const event = this.transformItemToEvent(item);
        if (event) events.push(event);
      });
    } else if (data.trends && Array.isArray(data.trends)) {
      // Trends format
      data.trends.forEach((trend: any) => {
        const event = this.transformTrendToEvent(trend);
        if (event) events.push(event);
      });
    } else {
      // Single item
      const event = this.transformItemToEvent(data);
      if (event) events.push(event);
    }

    return events;
  }

  // Transform a generic item to an event
  private transformItemToEvent(item: any): EventTrigger | null {
    if (!item) return null;

    // Try to determine event type based on item structure
    if (item.title || item.headline) {
      return this.transformNewsArticleToEvent(item);
    } else if (item.topic || item.trend) {
      return this.transformTrendToEvent(item);
    }

    // Default to web event
    return {
      type: 'web_event',
      source: this.config.name,
      title: item.title || item.name || 'API Event',
      content: item.description || item.content || JSON.stringify(item),
      timestamp: new Date(item.timestamp || item.publishedAt || Date.now()),
      metadata: {
        source: 'api',
        apiUrl: this.config.apiUrl,
        originalData: item
      }
    } as WebEvent;
  }

  // Transform a news article to a web event
  private transformNewsArticleToEvent(article: any): WebEvent {
    return {
      type: 'web_event',
      source: this.config.name,
      title: article.title || article.headline,
      content: article.description || article.content || article.summary,
      url: article.url,
      timestamp: new Date(article.publishedAt || article.pubDate || article.timestamp || Date.now()),
      metadata: {
        source: 'api',
        apiUrl: this.config.apiUrl,
        author: article.author,
        originalData: article
      }
    };
  }

  // Transform a trend to a web event
  private transformTrendToEvent(trend: any): WebEvent {
    return {
      type: 'web_event',
      source: this.config.name,
      title: trend.topic || trend.trend || trend.name,
      content: trend.description || trend.summary || `Trending topic: ${trend.topic}`,
      timestamp: new Date(trend.timestamp || trend.createdAt || Date.now()),
      metadata: {
        source: 'api',
        apiUrl: this.config.apiUrl,
        originalData: trend
      }
    };
  }

  // Apply filters to determine if event should be processed
  private shouldProcessEvent(event: EventTrigger): boolean {
    if (!this.config.filters || this.config.filters.length === 0) {
      return true;
    }

    return this.config.filters.every(filter => {
      const value = this.getNestedValue(event, filter.field);
      
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

  // Helper to get event title for logging
  private getEventTitle(event: EventTrigger): string {
    switch (event.type) {
      case 'web_event':
        return event.title;
      case 'onchain_event':
        return `${event.network} ${event.eventType}`;
      default:
        return 'Unknown event';
    }
  }

  private determineCategory(article: any): string {
    const title = (article.title || '').toLowerCase();
    const description = (article.description || '').toLowerCase();
    
    if (title.includes('crypto') || title.includes('bitcoin') || title.includes('ethereum')) {
      return 'crypto';
    }
    if (title.includes('stock') || title.includes('market') || title.includes('finance')) {
      return 'financial';
    }
    if (title.includes('ai') || title.includes('artificial intelligence')) {
      return 'technology';
    }
    
    return article.category || 'general';
  }

  private determineUrgency(article: any): 'low' | 'medium' | 'high' | 'critical' {
    const title = (article.title || '').toLowerCase();
    
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

  private determineImpact(trend: any): 'low' | 'medium' | 'high' {
    const confidence = trend.confidence || trend.score || 0.5;
    
    if (confidence > 0.8) return 'high';
    if (confidence > 0.5) return 'medium';
    return 'low';
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
} 