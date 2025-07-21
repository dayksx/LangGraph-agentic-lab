# RSS Feed Detection and Delta Detection Explained

## How RSS Feed Detection Works

The RSS feed detection system works through several key components that work together to monitor feeds and detect new posts.

### 1. **Monitoring Loop** (`monitoringLoop()`)

```typescript
// Main monitoring loop
private async monitoringLoop(): Promise<void> {
  while (this.isRunning) {
    try {
      await this.checkForNewEvents();
      await this.sleep(this.checkInterval); // Wait for next check
    } catch (error) {
      console.error(`❌ Error in RSS monitoring loop for ${this.config.name}:`, error);
      await this.sleep(30000); // 30 seconds retry on error
    }
  }
}
```

**What it does:**
- Runs continuously while `isRunning` is true
- Calls `checkForNewEvents()` every `checkInterval` milliseconds (default: 5 minutes)
- Handles errors gracefully with retry logic

### 2. **RSS Feed Fetching** (`fetchEvents()`)

```typescript
private async fetchEvents(): Promise<BreakingNewsEvent[]> {
  try {
    console.log(`📰 Checking RSS feed: ${this.config.name}`);
    
    // 1. HTTP Request to RSS Feed
    const response = await fetch(this.config.feedUrl);
    if (!response.ok) {
      throw new Error(`RSS feed request failed: ${response.status} ${response.statusText}`);
    }
    
    // 2. Parse XML Response
    const text = await response.text();
    const items = this.parseRSSFeed(text);
    
    // 3. DELTA DETECTION - Find New Items Only
    const newItems = items.filter(item => !this.lastItems.has(item.guid || item.link));
    
    // 4. Update Tracking Set
    newItems.forEach(item => {
      this.lastItems.add(item.guid || item.link);
    });

    this.lastCheck = new Date();

    // 5. Convert to Event Format
    return newItems.map(item => ({
      type: 'breaking_news',
      source: this.config.name,
      headline: item.title,
      content: item.description || item.content,
      timestamp: new Date(item.pubDate || Date.now()),
      category: this.determineCategory(item),
      urgency: this.determineUrgency(item),
      metadata: {
        source: 'rss',
        feedUrl: this.config.feedUrl,
        guid: item.guid,
        link: item.link
      }
    }));
  } catch (error) {
    console.error(`❌ Error fetching RSS feed from ${this.config.feedUrl}:`, error);
    return [];
  }
}
```

### 3. **Delta Detection Mechanism**

The key to detecting only new posts is the **delta detection** system:

```typescript
// State tracking for delta detection
private lastItems: Set<string> = new Set(); // Stores seen item IDs

// Delta detection logic
const newItems = items.filter(item => !this.lastItems.has(item.guid || item.link));

// Update tracking set with new items
newItems.forEach(item => {
  this.lastItems.add(item.guid || item.link);
});
```

**How Delta Detection Works:**

1. **Initial State**: `lastItems` starts as an empty Set
2. **First Check**: All items in the feed are considered "new" and added to `lastItems`
3. **Subsequent Checks**: Only items not in `lastItems` are considered new
4. **Persistence**: The Set persists between checks, so it remembers what was seen before

### 4. **RSS XML Parsing** (`parseRSSFeed()`)

```typescript
private parseRSSFeed(xmlText: string): any[] {
  const items: any[] = [];
  
  // Parse each <item> tag in the RSS feed
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  
  while ((match = itemRegex.exec(xmlText)) !== null) {
    const itemXml = match[1];
    
    // Extract individual fields
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
```

### 5. **Event Processing Flow**

```typescript
// Check for new events
private async checkForNewEvents(): Promise<void> {
  const events = await this.fetchEvents(); // Get only new items
  
  for (const event of events) {
    if (this.shouldProcessEvent(event)) { // Apply filters
      if (this.eventCallback) {
        try {
          await this.eventCallback(event); // Trigger callback
          console.log(`📨 Processed RSS event from ${this.config.name}: ${event.headline}`);
        } catch (error) {
          console.error(`❌ Error processing RSS event from ${this.config.name}:`, error);
        }
      }
    }
  }
}
```

## Example with Vitalik's Feed

For Vitalik's RSS feed (`https://vitalik.eth.limo/feed.xml`):

### First Check (Initial Load):
```xml
<item>
  <title>My response to AI 2027</title>
  <link>https://vitalik.ca/general/2025/07/10/2027.html</link>
  <guid>https://vitalik.ca/general/2025/07/10/2027.html</guid>
  <pubDate>Thu, 10 Jul 2025 00:00:00 +0000</pubDate>
</item>
```

**Result**: 
- `lastItems` becomes: `Set { "https://vitalik.ca/general/2025/07/10/2027.html" }`
- Event triggered for this post

### Second Check (1 minute later):
**If no new posts**: `newItems = []` (empty array)
**If new post added**:
```xml
<item>
  <title>New Ethereum Proposal</title>
  <link>https://vitalik.ca/general/2025/07/11/new-proposal.html</link>
  <guid>https://vitalik.ca/general/2025/07/11/new-proposal.html</guid>
  <pubDate>Fri, 11 Jul 2025 00:00:00 +0000</pubDate>
</item>
```

**Result**:
- `newItems` contains only the new post
- `lastItems` becomes: `Set { "https://vitalik.ca/general/2025/07/10/2027.html", "https://vitalik.ca/general/2025/07/11/new-proposal.html" }`
- Event triggered only for the new post

## Key Benefits of This Approach

1. **Efficient**: Only processes new items, not the entire feed
2. **Reliable**: Uses GUID/link as unique identifier
3. **Memory Efficient**: Uses Set for O(1) lookup performance
4. **Fault Tolerant**: Handles network errors and retries
5. **Configurable**: Check interval can be adjusted per feed

## Configuration Options

```typescript
const vitalikRSS = new RSSEventSource({
  name: 'vitalik_blog',
  type: 'rss',
  enabled: true,
  feedUrl: 'https://vitalik.eth.limo/feed.xml',
  checkInterval: 60000, // Check every minute
  filters: [
    {
      field: 'category',
      operator: 'contains',
      value: 'crypto'
    }
  ]
});
```

This system ensures that your callback is only triggered for genuinely new posts, making it efficient and avoiding duplicate processing. 