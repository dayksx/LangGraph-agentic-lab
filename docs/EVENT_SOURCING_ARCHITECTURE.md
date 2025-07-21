# Event Sourcing Architecture

This document explains the complete event sourcing architecture for the Agentic Platform, which enables processing events from various sources like RSS feeds, webhooks, APIs, and blockchain events.

## Architecture Overview

The event sourcing system is built on a **layered, modular architecture** with three main components:

```
┌─────────────────────────────────────────────────────────────┐
│                    Event Source Manager                     │
│  (Orchestration, Queue Management, Deduplication)          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Event Source Plugins                      │
│  (RSS, Webhook, API, Blockchain, Social Media)             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    External Data Sources                    │
│  (RSS Feeds, APIs, Webhooks, Blockchain Networks)          │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Event Source Manager (`EventSourceManager`)

The central orchestrator that manages all event sources and provides:

- **Event Queue Management**: Buffers events for processing
- **Deduplication**: Prevents duplicate event processing
- **Source Lifecycle Management**: Start/stop/configure sources
- **Event Routing**: Routes events to the appropriate agents
- **Monitoring & Statistics**: Provides comprehensive status information

### 2. Event Source Plugins (`EventSourcePlugin`)

Modular plugins for different data source types:

- **RSSEventSourcePlugin**: RSS feed monitoring
- **WebhookEventSourcePlugin**: Webhook endpoint handling
- **APIEventSourcePlugin**: REST API polling
- **BlockchainEventSourcePlugin**: Blockchain event monitoring
- **SocialMediaEventSourcePlugin**: Social media API integration

### 3. Event Types

Three main event types that can be processed:

- **BreakingNewsEvent**: Real-time news alerts
- **EmergingTrendEvent**: Trend detection and analysis
- **OnchainEvent**: Blockchain transactions and smart contract events

## Implementation Guide

### Basic Setup

```typescript
import { AgenticPlatform } from './src/index.js';
import { EventSourceManager } from './src/core/EventSourceManager.js';

// Initialize platform
const platform = new AgenticPlatform();
await platform.defineCoordinatorWorkflow();

// Initialize event source manager
const eventSourceManager = new EventSourceManager({
  enableEventQueue: true,
  maxQueueSize: 1000,
  processingInterval: 5000,
  enableDeduplication: true,
  deduplicationWindow: 300000 // 5 minutes
});

// Set up event processing callback
eventSourceManager.setEventCallback(async (event) => {
  const response = await platform.workflowManager.processEvent(event);
  console.log('Agent Response:', response.content);
});

// Start the manager
await eventSourceManager.start();
```

### RSS Event Sources

RSS feeds are perfect for monitoring news sources and blogs:

```typescript
// Register RSS source
await eventSourceManager.registerRSSSource({
  name: 'reuters_tech',
  description: 'Reuters Technology RSS Feed',
  version: '1.0.0',
  sourceType: 'rss',
  feedUrl: 'https://feeds.reuters.com/reuters/technologyNews',
  checkInterval: 300000, // 5 minutes
  enabled: true,
  filters: [
    {
      field: 'category',
      operator: 'contains',
      value: 'technology'
    },
    {
      field: 'urgency',
      operator: 'equals',
      value: 'high'
    }
  ]
});
```

**Supported RSS Sources:**
- Reuters Technology News
- CoinDesk Crypto News
- Bloomberg Financial News
- TechCrunch
- Ars Technica
- Any RSS 2.0 compliant feed

### API Event Sources

For real-time data from REST APIs:

```typescript
// News API source
await eventSourceManager.registerAPISource({
  name: 'news_api',
  description: 'News API for breaking news',
  version: '1.0.0',
  sourceType: 'api',
  apiUrl: 'https://newsapi.org/v2/top-headlines',
  apiKey: process.env.NEWS_API_KEY,
  headers: {
    'User-Agent': 'AgenticPlatform/1.0'
  },
  checkInterval: 600000, // 10 minutes
  enabled: true,
  filters: [
    {
      field: 'urgency',
      operator: 'equals',
      value: 'high'
    }
  ]
});

// Twitter Trends API
await eventSourceManager.registerAPISource({
  name: 'twitter_trends',
  description: 'Twitter Trends API',
  version: '1.0.0',
  sourceType: 'api',
  apiUrl: 'https://api.twitter.com/2/tweets/search/recent',
  apiKey: process.env.TWITTER_API_KEY,
  headers: {
    'Authorization': `Bearer ${process.env.TWITTER_API_KEY}`
  },
  checkInterval: 900000, // 15 minutes
  enabled: true
});
```

**Popular API Sources:**
- NewsAPI.org
- Twitter API
- Reddit API
- GitHub API
- CoinGecko API
- Alpha Vantage (Financial Data)

### Webhook Event Sources

For real-time push notifications:

```typescript
// Blockchain webhook source
await eventSourceManager.registerWebhookSource({
  name: 'blockchain_webhook',
  description: 'Blockchain event webhook',
  version: '1.0.0',
  sourceType: 'webhook',
  webhookUrl: 'https://your-domain.com/webhook/blockchain',
  port: 3001,
  checkInterval: 0, // Webhooks don't poll
  enabled: true,
  filters: [
    {
      field: 'significance',
      operator: 'equals',
      value: 'high'
    }
  ]
});
```

**Webhook Use Cases:**
- Blockchain transaction notifications
- GitHub repository events
- Slack notifications
- Discord bot events
- Custom application events

### Blockchain Event Sources

For monitoring blockchain networks:

```typescript
// Ethereum mainnet monitoring
await eventSourceManager.registerBlockchainSource({
  name: 'ethereum_mainnet',
  description: 'Ethereum Mainnet Events',
  version: '1.0.0',
  sourceType: 'blockchain',
  network: 'Ethereum',
  rpcUrl: process.env.ETHEREUM_RPC_URL,
  contractAddresses: [
    '0xA0b86a33E6441b8c4C8C8C8C8C8C8C8C8C8C8C8C', // USDC
    '0xB0b86a33E6441b8c4C8C8C8C8C8C8C8C8C8C8C8C'  // DAI
  ],
  checkInterval: 15000, // 15 seconds
  enabled: true,
  filters: [
    {
      field: 'value',
      operator: 'greater_than',
      value: '1000000000000000000000' // 1000 tokens
    }
  ]
});
```

## Event Filtering

The system supports powerful filtering capabilities:

### Filter Operators

```typescript
interface EventFilter {
  field: string;           // Field path (e.g., 'category', 'urgency', 'data.value')
  operator: 'equals' | 'contains' | 'regex' | 'greater_than' | 'less_than';
  value: any;              // Filter value
}
```

### Filter Examples

```typescript
// Filter by category
{
  field: 'category',
  operator: 'contains',
  value: 'technology'
}

// Filter by urgency level
{
  field: 'urgency',
  operator: 'equals',
  value: 'critical'
}

// Filter by confidence score
{
  field: 'confidence',
  operator: 'greater_than',
  value: 0.8
}

// Filter by transaction value
{
  field: 'data.value',
  operator: 'greater_than',
  value: '1000000000000000000000'
}

// Filter by regex pattern
{
  field: 'headline',
  operator: 'regex',
  value: 'bitcoin|ethereum|crypto'
}
```

## Event Queue Management

### Queue Configuration

```typescript
const eventSourceManager = new EventSourceManager({
  enableEventQueue: true,
  maxQueueSize: 1000,        // Maximum events in queue
  processingInterval: 5000,   // Process queue every 5 seconds
  enableDeduplication: true,
  deduplicationWindow: 300000 // 5 minutes
});
```

### Queue Statistics

```typescript
const queueStats = eventSourceManager.getQueueStats();
console.log('Queue size:', queueStats.size);
console.log('Max size:', queueStats.maxSize);
console.log('Oldest event:', queueStats.oldestEvent);
console.log('Newest event:', queueStats.newestEvent);
```

## Deduplication System

### Deduplication Configuration

```typescript
const eventSourceManager = new EventSourceManager({
  enableDeduplication: true,
  deduplicationWindow: 300000 // 5 minutes
});
```

### Deduplication Statistics

```typescript
const dedupStats = eventSourceManager.getDeduplicationStats();
console.log('Deduplication enabled:', dedupStats.enabled);
console.log('Window size:', dedupStats.window);
console.log('Tracked events:', dedupStats.trackedEvents);
console.log('Duplicate count:', dedupStats.duplicateCount);
```

## Dynamic Configuration

### Update Event Source Configuration

```typescript
// Update check interval
await eventSourceManager.updateEventSource('reuters_tech', {
  checkInterval: 600000 // Change to 10 minutes
});

// Update filters
await eventSourceManager.updateEventSource('reuters_tech', {
  filters: [
    {
      field: 'urgency',
      operator: 'equals',
      value: 'critical'
    }
  ]
});

// Enable/disable source
await eventSourceManager.updateEventSource('reuters_tech', {
  enabled: false
});
```

### Get Source Status

```typescript
const source = eventSourceManager.getEventSource('reuters_tech');
if (source) {
  const status = source.getStatus();
  console.log('Source running:', status.isRunning);
  console.log('Last check:', status.lastCheck);
  console.log('Enabled:', status.enabled);
}
```

## Monitoring and Statistics

### Overall Status

```typescript
const status = eventSourceManager.getStatus();
console.log('Manager running:', status.isRunning);
console.log('Total sources:', status.totalSources);
console.log('Active sources:', status.activeSources);
console.log('Queue size:', status.queueSize);
console.log('Processing queue:', status.processingQueue);

// Individual source status
status.sources.forEach(source => {
  console.log(`${source.name}: ${source.isRunning ? 'Running' : 'Stopped'}`);
});
```

### Performance Monitoring

```typescript
// Monitor queue performance
setInterval(() => {
  const queueStats = eventSourceManager.getQueueStats();
  const dedupStats = eventSourceManager.getDeduplicationStats();
  
  console.log(`Queue: ${queueStats.size}/${queueStats.maxSize}`);
  console.log(`Deduplication: ${dedupStats.trackedEvents} events tracked`);
}, 30000); // Every 30 seconds
```

## Error Handling

### Graceful Error Handling

```typescript
// Set up event processing callback with error handling
eventSourceManager.setEventCallback(async (event) => {
  try {
    const response = await platform.workflowManager.processEvent(event);
    console.log('Event processed successfully:', response.content);
  } catch (error) {
    console.error('Error processing event:', error);
    
    // Implement retry logic
    if (error.retryable) {
      // Add to retry queue
      await retryQueue.add(event);
    }
  }
});
```

### Source Error Recovery

```typescript
// Event sources automatically handle errors
// Failed API calls are retried with exponential backoff
// Network timeouts are handled gracefully
// Invalid data is filtered out
```

## Best Practices

### 1. Source Configuration

- **Use appropriate check intervals**: RSS feeds (5-10 min), APIs (1-15 min), blockchain (15-60 sec)
- **Implement proper filtering**: Reduce noise and focus on relevant events
- **Set reasonable queue sizes**: Balance memory usage with processing capacity

### 2. Performance Optimization

- **Monitor queue sizes**: Prevent memory issues
- **Use deduplication**: Avoid processing duplicate events
- **Implement rate limiting**: Respect API rate limits
- **Cache frequently accessed data**: Reduce API calls

### 3. Reliability

- **Handle network failures**: Implement retry logic
- **Validate event data**: Ensure data integrity
- **Monitor source health**: Track source availability
- **Implement graceful shutdown**: Clean up resources

### 4. Security

- **Secure API keys**: Use environment variables
- **Validate webhook signatures**: Prevent unauthorized events
- **Sanitize event data**: Prevent injection attacks
- **Implement access controls**: Restrict source registration

## Integration Examples

### News Monitoring System

```typescript
// Monitor multiple news sources
const newsSources = [
  'reuters_tech',
  'bloomberg_finance',
  'coindesk_crypto',
  'techcrunch'
];

for (const sourceName of newsSources) {
  await eventSourceManager.registerRSSSource({
    name: sourceName,
    sourceType: 'rss',
    feedUrl: getFeedUrl(sourceName),
    checkInterval: 300000,
    filters: [
      { field: 'urgency', operator: 'equals', value: 'high' }
    ]
  });
}
```

### Blockchain Monitoring System

```typescript
// Monitor multiple blockchain networks
const blockchainNetworks = [
  { name: 'ethereum', rpcUrl: process.env.ETH_RPC_URL },
  { name: 'polygon', rpcUrl: process.env.POLYGON_RPC_URL },
  { name: 'arbitrum', rpcUrl: process.env.ARBITRUM_RPC_URL }
];

for (const network of blockchainNetworks) {
  await eventSourceManager.registerBlockchainSource({
    name: `${network.name}_mainnet`,
    sourceType: 'blockchain',
    network: network.name,
    rpcUrl: network.rpcUrl,
    checkInterval: 15000,
    filters: [
      { field: 'data.value', operator: 'greater_than', value: '1000000000000000000000' }
    ]
  });
}
```

### Social Media Monitoring

```typescript
// Monitor social media trends
await eventSourceManager.registerAPISource({
  name: 'twitter_trends',
  sourceType: 'api',
  apiUrl: 'https://api.twitter.com/2/tweets/search/recent',
  apiKey: process.env.TWITTER_API_KEY,
  checkInterval: 300000,
  filters: [
    { field: 'confidence', operator: 'greater_than', value: 0.7 }
  ]
});
```

## Running the Examples

### Basic Event Sourcing Example

```bash
# Build and run
pnpm run build
pnpm run sourcing

# Development mode
pnpm run sourcing:dev
```

### Real-time Event Processor

```bash
# Build and run
pnpm run build
pnpm run realtime

# Development mode
pnpm run realtime:dev
```

This event sourcing architecture provides a robust, scalable foundation for building real-time, event-driven AI applications that can respond to various external stimuli beyond just user messages. 