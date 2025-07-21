# Event Sources - Workflow Entry Points

Event sources provide another way to trigger the workflow, similar to how clients work. Instead of creating a separate event sourcing system, event sources are integrated as additional entry points that use the same `app.invoke()` pattern.

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Event Source  │    │     Client      │    │  Manual Input   │
│   (RSS/API/etc) │    │ (Terminal/Telegram) │   (Direct Call)  │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────▼─────────────┐
                    │   AgenticPlatform         │
                    │                           │
                    │  ┌─────────────────────┐  │
                    │  │  WorkflowManager    │  │
                    │  │                     │  │
                    │  │  app.invoke()       │  │
                    │  │                     │  │
                    │  └─────────────────────┘  │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │     Agents               │
                    │  (Oracle/Analyst/Degen)  │
                    └───────────────────────────┘
```

## Key Concepts

### 1. Event Sources as Entry Points
Event sources follow the same pattern as clients:
- They implement a common interface (`EventSource`)
- They register with the platform using `registerEventSource()`
- They trigger the workflow through `app.invoke()`
- They have unified lifecycle management (start/stop/cleanup)

### 2. Event Types
Events are structured data that get converted to messages for the workflow:

```typescript
// Breaking news events
interface BreakingNewsEvent {
  type: 'breaking_news';
  source: string;
  headline: string;
  content: string;
  timestamp: Date;
  category?: string;
  urgency?: 'low' | 'medium' | 'high' | 'critical';
}

// Emerging trend events
interface EmergingTrendEvent {
  type: 'emerging_trend';
  topic: string;
  description: string;
  confidence: number;
  sources: string[];
  timestamp: Date;
  category?: string;
  impact?: 'low' | 'medium' | 'high';
}

// Onchain events
interface OnchainEvent {
  type: 'onchain_event';
  network: string;
  eventType: string;
  contractAddress?: string;
  transactionHash?: string;
  data: any;
  timestamp: Date;
  significance?: 'low' | 'medium' | 'high';
}
```

### 3. Automatic Agent Routing
Events are automatically routed to the most appropriate agent:
- **Breaking News**: Financial/crypto news → Analyst, General news → Oracle
- **Emerging Trends**: High impact → Analyst, Crypto/DeFi → Degen
- **Onchain Events**: Transfers/mints → Degen, High significance → Analyst

## Usage Examples

### 1. RSS Event Source

```typescript
import { RSSEventSource } from './src/events/RSSEventSource.js';

const rssSource = new RSSEventSource({
  name: 'reuters_tech',
  type: 'rss',
  enabled: true,
  feedUrl: 'https://feeds.reuters.com/reuters/technologyNews',
  checkInterval: 300000, // 5 minutes
  filters: [
    {
      field: 'category',
      operator: 'contains',
      value: 'technology'
    }
  ]
});

await platform.registerEventSource(rssSource);
```

### 2. API Event Source

```typescript
import { APIEventSource } from './src/events/APIEventSource.js';

const apiSource = new APIEventSource({
  name: 'news_api',
  type: 'api',
  enabled: true,
  apiUrl: 'https://newsapi.org/v2/top-headlines?country=us&category=technology',
  apiKey: process.env.NEWS_API_KEY,
  checkInterval: 600000, // 10 minutes
  filters: [
    {
      field: 'urgency',
      operator: 'equals',
      value: 'high'
    }
  ]
});

await platform.registerEventSource(apiSource);
```

### 3. Custom API with Transform

```typescript
const customApiSource = new APIEventSource({
  name: 'trends_api',
  type: 'api',
  enabled: true,
  apiUrl: 'https://api.example.com/trends',
  checkInterval: 900000, // 15 minutes
  transformResponse: (data: any) => {
    // Custom transformation logic
    return data.trends?.map((trend: any) => ({
      type: 'emerging_trend',
      topic: trend.name,
      description: trend.description,
      confidence: trend.score,
      sources: ['trends_api'],
      timestamp: new Date(),
      category: 'technology',
      impact: 'medium'
    })) || [];
  }
});

await platform.registerEventSource(customApiSource);
```

## Event Filtering

Event sources support filtering to process only relevant events:

```typescript
filters: [
  {
    field: 'category',
    operator: 'contains',
    value: 'crypto'
  },
  {
    field: 'urgency',
    operator: 'equals',
    value: 'high'
  },
  {
    field: 'confidence',
    operator: 'greater_than',
    value: 0.8
  }
]
```

Supported operators:
- `equals`: Exact match
- `contains`: String contains
- `regex`: Regular expression match
- `greater_than`: Numeric comparison
- `less_than`: Numeric comparison

## Integration with Platform

Event sources are fully integrated into the platform lifecycle:

```typescript
// Registration
await platform.registerEventSource(eventSource);

// Start platform (starts all clients AND event sources)
await platform.start();

// Stop platform (stops all clients AND event sources)
await platform.stop();
```

## Benefits of This Approach

### 1. **Consistency**
- Same pattern as clients
- Unified lifecycle management
- Consistent error handling

### 2. **Simplicity**
- No separate event sourcing system
- Uses existing workflow infrastructure
- Minimal code duplication

### 3. **Flexibility**
- Easy to add new event source types
- Custom transformation functions
- Configurable filtering

### 4. **Reliability**
- Built-in error handling and retries
- Automatic deduplication
- Graceful degradation

### 5. **Extensibility**
- Plugin-based architecture
- Easy to add new event types
- Custom routing logic

## Running Examples

```bash
# Run the event sources example
npm run event-sources:dev

# Or build and run
npm run build
npm run event-sources
```

## Comparison with Previous Approach

| Aspect | Previous Approach | New Approach |
|--------|------------------|--------------|
| Architecture | Separate event sourcing system | Integrated as workflow entry points |
| Pattern | Custom event manager | Same as clients |
| Lifecycle | Manual management | Unified with platform |
| Complexity | High (separate system) | Low (integrated) |
| Consistency | Different patterns | Same pattern as clients |
| Maintenance | More code to maintain | Less code, unified |

The new approach is much cleaner and follows the existing architecture patterns, making it easier to understand, maintain, and extend. 