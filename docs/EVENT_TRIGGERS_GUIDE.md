# Event Triggers Guide

The Agentic Platform now supports processing different types of event triggers beyond just user messages. This guide explains how to use the new event processing capabilities for breaking news, emerging trends, and onchain events.

## Overview

The platform can now handle three main types of event triggers:

1. **Breaking News Events** - Real-time news alerts from various sources
2. **Emerging Trend Events** - Trend detection and analysis
3. **Onchain Events** - Blockchain and cryptocurrency events

Each event type is automatically routed to the most appropriate agent based on the event characteristics.

## Event Types

### Breaking News Events

Breaking news events represent real-time news alerts from various media sources.

```typescript
interface BreakingNewsEvent {
  type: 'breaking_news';
  source: string;           // News source (e.g., "Reuters", "Bloomberg")
  headline: string;         // News headline
  content: string;          // Full news content
  timestamp: Date;          // When the news was published
  category?: string;        // News category (e.g., "financial", "crypto", "technology")
  urgency?: 'low' | 'medium' | 'high' | 'critical'; // Urgency level
}
```

**Agent Routing Logic:**
- `financial` or `market` category → **Analyst Agent**
- `crypto` or `blockchain` category → **Degen Agent**
- `critical` or `high` urgency → **Analyst Agent**
- Default → **Oracle Agent**

### Emerging Trend Events

Emerging trend events represent detected trends with confidence scoring.

```typescript
interface EmergingTrendEvent {
  type: 'emerging_trend';
  topic: string;            // Trend topic
  description: string;      // Trend description
  confidence: number;       // Confidence score (0-1)
  sources: string[];        // Data sources
  timestamp: Date;          // Detection timestamp
  category?: string;        // Trend category
  impact?: 'low' | 'medium' | 'high'; // Expected impact
}
```

**Agent Routing Logic:**
- `financial` or `market` category → **Analyst Agent**
- `crypto` or `defi` category → **Degen Agent**
- `high` impact → **Analyst Agent**
- Default → **Oracle Agent**

### Onchain Events

Onchain events represent blockchain transactions and smart contract events.

```typescript
interface OnchainEvent {
  type: 'onchain_event';
  network: string;          // Blockchain network (e.g., "Ethereum")
  eventType: string;        // Event type (e.g., "TokenTransfer", "Mint")
  contractAddress?: string; // Smart contract address
  transactionHash?: string; // Transaction hash
  blockNumber?: number;     // Block number
  data: any;               // Event data
  timestamp: Date;         // Event timestamp
  significance?: 'low' | 'medium' | 'high'; // Event significance
}
```

**Agent Routing Logic:**
- Events with `transfer`, `mint`, or `burn` → **Degen Agent**
- `high` significance → **Analyst Agent**
- Default → **Degen Agent**

## Usage Examples

### Basic Event Processing

```typescript
import { AgenticPlatform } from './src/index.js';
import { BreakingNewsEvent, EmergingTrendEvent, OnchainEvent } from './src/core/WorkflowManager.js';

const platform = new AgenticPlatform();

// Setup agents and workflow (see main setup guide)
await platform.defineCoordinatorWorkflow();

// Process breaking news
const newsEvent: BreakingNewsEvent = {
  type: 'breaking_news',
  source: 'Reuters',
  headline: 'Major Tech Company Announces AI Breakthrough',
  content: 'A leading technology company has announced...',
  timestamp: new Date(),
  category: 'technology',
  urgency: 'high'
};

const response = await platform.workflowManager.processBreakingNews(newsEvent);
console.log('Agent Response:', response.content);
```

### Processing Different Event Types

```typescript
// Process emerging trend
const trendEvent: EmergingTrendEvent = {
  type: 'emerging_trend',
  topic: 'DeFi Growth',
  description: 'Significant increase in DeFi protocol adoption...',
  confidence: 0.85,
  sources: ['CoinGecko', 'DeFi Pulse'],
  timestamp: new Date(),
  category: 'defi',
  impact: 'high'
};

const trendResponse = await platform.workflowManager.processEmergingTrend(trendEvent);

// Process onchain event
const onchainEvent: OnchainEvent = {
  type: 'onchain_event',
  network: 'Ethereum',
  eventType: 'TokenTransfer',
  contractAddress: '0x1234...',
  transactionHash: '0xabcd...',
  data: { from: '0x1111...', to: '0x2222...', value: '1000' },
  timestamp: new Date(),
  significance: 'medium'
};

const onchainResponse = await platform.workflowManager.processOnchainEvent(onchainEvent);
```

### Generic Event Processing

You can also use the generic `processEvent` method for any event type:

```typescript
const response = await platform.workflowManager.processEvent(newsEvent);
```

### Custom Agent Routing

Override the automatic agent selection by specifying a preferred agent:

```typescript
// Force routing to a specific agent
const response = await platform.workflowManager.processBreakingNews(newsEvent, 'degen');
```

## Real-Time Event Processing

For continuous event processing, use the `RealtimeEventProcessor` class:

```typescript
import { RealtimeEventProcessor } from './examples/realtime_event_processor.js';

const processor = new RealtimeEventProcessor();

// Initialize and start monitoring
await processor.initialize();
await processor.start();

// The processor will automatically:
// - Monitor news sources every 2-5 minutes
// - Check for emerging trends every 5-10 minutes
// - Monitor blockchain events every 15 seconds
// - Queue and process events automatically

// Inject manual events for testing
await processor.injectEvent(newsEvent);

// Check status
const status = processor.getStatus();
console.log('Queue size:', status.queueSize);

// Stop processing
await processor.stop();
```

## Configuration

### News Sources

Configure news sources in the `RealtimeEventProcessor`:

```typescript
private newsSources: NewsSource[] = [
  {
    name: 'Reuters',
    url: 'https://www.reuters.com/api/news',
    category: 'general',
    checkInterval: 300000 // 5 minutes
  },
  {
    name: 'Bloomberg',
    url: 'https://www.bloomberg.com/api/news',
    category: 'financial',
    checkInterval: 180000 // 3 minutes
  }
];
```

### Trend Sources

Configure trend detection sources:

```typescript
private trendSources: TrendSource[] = [
  {
    name: 'Google Trends',
    endpoint: 'https://trends.google.com/trends/api/dailytrends',
    checkInterval: 600000 // 10 minutes
  },
  {
    name: 'Twitter Trends',
    endpoint: 'https://api.twitter.com/2/tweets/search/recent',
    apiKey: process.env.TWITTER_API_KEY,
    checkInterval: 300000 // 5 minutes
  }
];
```

### Blockchain Sources

Configure blockchain monitoring:

```typescript
private blockchainSources: BlockchainSource[] = [
  {
    name: 'Ethereum Mainnet',
    network: 'Ethereum',
    rpcUrl: process.env.ETHEREUM_RPC_URL,
    contractAddresses: ['0x1234...', '0x5678...'],
    checkInterval: 15000 // 15 seconds
  }
];
```

## Running Examples

### Basic Event Triggers Example

```bash
# Build and run
pnpm run build
pnpm run events

# Development mode
pnpm run events:dev
```

### Real-Time Event Processor

```bash
# Build and run
pnpm run build
pnpm run realtime

# Development mode
pnpm run realtime:dev
```

## Integration with External APIs

### News APIs

Replace the mock implementations with real API calls:

```typescript
private async fetchNewsFromSource(source: NewsSource): Promise<BreakingNewsEvent[]> {
  const response = await fetch(source.url, {
    headers: {
      'Authorization': `Bearer ${process.env.NEWS_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });
  
  const data = await response.json();
  
  return data.articles.map((article: any) => ({
    type: 'breaking_news',
    source: source.name,
    headline: article.title,
    content: article.description,
    timestamp: new Date(article.publishedAt),
    category: source.category,
    urgency: this.determineUrgency(article)
  }));
}
```

### Blockchain APIs

Integrate with blockchain providers:

```typescript
private async fetchBlockchainEvents(source: BlockchainSource): Promise<OnchainEvent[]> {
  // Use Web3.js or similar library
  const web3 = new Web3(source.rpcUrl);
  
  // Monitor specific contract events
  const contract = new web3.eth.Contract(ABI, source.contractAddresses[0]);
  
  const events = await contract.getPastEvents('Transfer', {
    fromBlock: 'latest',
    toBlock: 'latest'
  });
  
  return events.map(event => ({
    type: 'onchain_event',
    network: source.network,
    eventType: 'TokenTransfer',
    contractAddress: event.address,
    transactionHash: event.transactionHash,
    blockNumber: event.blockNumber,
    data: event.returnValues,
    timestamp: new Date(),
    significance: this.determineSignificance(event.returnValues)
  }));
}
```

## Best Practices

### 1. Event Queue Management

- Use the built-in event queue for handling high-frequency events
- Implement rate limiting to prevent overwhelming the agents
- Add error handling for failed event processing

### 2. Agent Routing

- Let the automatic routing handle most cases
- Use custom routing only for specific business logic
- Monitor routing decisions to optimize the logic

### 3. Event Filtering

- Filter events by relevance before processing
- Implement duplicate detection for news events
- Use confidence thresholds for trend events

### 4. Performance Optimization

- Use appropriate check intervals for different sources
- Implement caching for frequently accessed data
- Consider using webhooks instead of polling where possible

### 5. Error Handling

```typescript
try {
  const response = await platform.workflowManager.processEvent(event);
  console.log('Event processed successfully:', response.content);
} catch (error) {
  console.error('Event processing failed:', error);
  // Implement retry logic or fallback handling
}
```

## Troubleshooting

### Common Issues

1. **Events not being processed**: Check if the workflow is properly defined
2. **Wrong agent routing**: Verify event category and urgency settings
3. **High queue size**: Reduce check intervals or add more processing capacity
4. **API rate limits**: Implement proper rate limiting and error handling

### Debug Mode

Enable debug logging to track event processing:

```typescript
// Add to your environment variables
DEBUG_EVENTS=true
DEBUG_ROUTING=true
```

## Advanced Features

### Custom Event Types

You can extend the system with custom event types:

```typescript
interface CustomEvent extends EventTrigger {
  type: 'custom_event';
  customField: string;
  // ... other custom fields
}
```

### Event Persistence

Store processed events for analysis:

```typescript
// Add to your event processing
await this.eventDatabase.save({
  event: event,
  response: response,
  timestamp: new Date(),
  agent: selectedAgent
});
```

### Event Analytics

Track event processing metrics:

```typescript
const metrics = {
  totalEvents: 1000,
  eventsByType: {
    breaking_news: 400,
    emerging_trend: 300,
    onchain_event: 300
  },
  averageProcessingTime: 2.5,
  agentUtilization: {
    oracle: 0.3,
    analyst: 0.4,
    degen: 0.3
  }
};
```

This event trigger system provides a powerful foundation for building real-time, event-driven AI applications that can respond to various types of external stimuli beyond just user messages. 