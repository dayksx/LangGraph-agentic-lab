import { EventSource, EventSourceConfig, EventFilter } from './EventSource.js';
import { EventTrigger, WebEvent } from '../types/events.js';

export interface RSSEventSourceConfig extends EventSourceConfig {
  feedUrl: string;
}

export class RSSEventSource implements EventSource {
  public config: RSSEventSourceConfig;
  private isRunning: boolean = false;
  private eventCallback?: (event: EventTrigger) => Promise<void>;
  private lastCheck: Date = new Date(0);
  private lastItems: Set<string> = new Set();
  private checkInterval: number;

  constructor(config: RSSEventSourceConfig) {
    this.config = {
      name: config.name || 'rss_source',
      type: 'rss',
      enabled: config.enabled ?? true,
      checkInterval: config.checkInterval || 300000, // 5 minutes default
      filters: config.filters || [],
      feedUrl: config.feedUrl
    };
    this.checkInterval = this.config.checkInterval || 300000;
  }

  public async initialize(): Promise<void> {
    console.log(`🚀 Initializing RSS event source: ${this.config.name}`);
  }

  public async start(): Promise<void> {
    if (this.isRunning) {
      console.log(`⚠️  RSS source ${this.config.name} is already running`);
      return;
    }

    this.isRunning = true;
    console.log(`📡 Starting RSS monitoring for ${this.config.name}`);

    // Start the monitoring loop
    this.monitoringLoop();
  }

  public async stop(): Promise<void> {
    this.isRunning = false;
    console.log(`🛑 Stopped RSS monitoring for ${this.config.name}`);
  }

  public async cleanup(): Promise<void> {
    console.log(`🧹 Cleaning up RSS event source: ${this.config.name}`);
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
        console.error(`❌ Error in RSS monitoring loop for ${this.config.name}:`, error);
        // Wait a bit before retrying
        await this.sleep(30000); // 30 seconds
      }
    }
  }

  // Check for new events
  private async checkForNewEvents(): Promise<void> {
    console.log(`🔍 Checking for new events in ${this.config.name}...`);
    const events = await this.fetchEvents();
    
    console.log(`📊 Found ${events.length} new events in ${this.config.name}`);
    
    for (const event of events) {
      console.log(`\n🔔 EVENT IDENTIFIED: ${event.title}`);
      console.log(`   📅 Published: ${event.timestamp.toLocaleString()}`);
      console.log(`   🔗 Link: ${event.url || event.metadata?.link || 'N/A'}`);
      
      if (this.shouldProcessEvent(event)) {
        console.log(`✅ Event passed filters - processing...`);
        if (this.eventCallback) {
          try {
            await this.eventCallback(event);
            console.log(`📨 Successfully processed RSS event from ${this.config.name}: ${event.title}`);
          } catch (error) {
            console.error(`❌ Error processing RSS event from ${this.config.name}:`, error);
          }
        }
      } else {
        console.log(`❌ Event filtered out - skipping processing`);
      }
    }
    
    if (events.length === 0) {
      console.log(`😴 No new events found in ${this.config.name}`);
    }
  }

  // Fetch events from RSS feed
  private async fetchEvents(): Promise<WebEvent[]> {
    try {
      console.log(`📰 Fetching RSS feed: ${this.config.feedUrl}`);
      
      const response = await fetch(this.config.feedUrl);
      if (!response.ok) {
        throw new Error(`RSS feed request failed: ${response.status} ${response.statusText}`);
      }
      
      const text = await response.text();
      const items = this.parseRSSFeed(text);
      
      console.log(`📋 Parsed ${items.length} total items from RSS feed`);
      
      const newItems = items.filter(item => !this.lastItems.has(item.guid || item.link));
      
      console.log(`🆕 Found ${newItems.length} new items (${items.length - newItems.length} already seen)`);
      
      // Update last items
      newItems.forEach(item => {
        this.lastItems.add(item.guid || item.link);
        console.log(`➕ Added to tracking: ${item.title}`);
      });

      this.lastCheck = new Date();

      const events: WebEvent[] = newItems.map(item => ({
        type: 'web_event' as const,
        source: this.config.name,
        title: item.title,
        content: item.description || item.content,
        url: item.link,
        timestamp: new Date(item.pubDate || Date.now()),
        metadata: {
          source: 'rss',
          feedUrl: this.config.feedUrl,
          guid: item.guid,
          link: item.link
        }
      }));
      
      console.log(`🎯 Created ${events.length} event objects for processing`);
      return events;
    } catch (error) {
      console.error(`❌ Error fetching RSS feed from ${this.config.feedUrl}:`, error);
      return [];
    }
  }

  // Apply filters to determine if event should be processed
  private shouldProcessEvent(event: WebEvent): boolean {
    if (!this.config.filters || this.config.filters.length === 0) {
      console.log(`   ✅ No filters configured - event will be processed`);
      return true;
    }

    console.log(`   🔍 Applying ${this.config.filters.length} filter(s)...`);
    
    const result = this.config.filters.every(filter => {
      const value = this.getNestedValue(event, filter.field);
      const filterResult = this.evaluateFilter(value, filter);
      
      console.log(`   📋 Filter: ${filter.field} ${filter.operator} "${filter.value}" = ${filterResult ? '✅ PASS' : '❌ FAIL'}`);
      
      return filterResult;
    });
    
    console.log(`   🎯 Overall filter result: ${result ? '✅ PASSED' : '❌ FAILED'}`);
    return result;
  }
  
  private evaluateFilter(value: any, filter: any): boolean {
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
  }

  // Helper to get nested object values
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  // Parse RSS feed
  private parseRSSFeed(xmlText: string): any[] {
    const items: any[] = [];
    
    // Basic regex-based parsing (use a proper RSS parser in production)
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

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
} 