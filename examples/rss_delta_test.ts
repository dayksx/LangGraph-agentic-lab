// Simple demonstration of RSS delta detection logic
// This shows how the RSSEventSource determines which posts are new

// Mock RSS feed data to demonstrate delta detection
const mockRSSFeed1 = `<?xml version="1.0" ?>
<rss version="2.0">
<channel>
  <title>Vitalik Buterin's website</title>
  <link>https://vitalik.ca/</link>
  <description>Vitalik Buterin's website</description>
  <item>
    <title>My response to AI 2027</title>
    <link>https://vitalik.ca/general/2025/07/10/2027.html</link>
    <guid>https://vitalik.ca/general/2025/07/10/2027.html</guid>
    <pubDate>Thu, 10 Jul 2025 00:00:00 +0000</pubDate>
    <description>Response to AI predictions for 2027</description>
  </item>
  <item>
    <title>Why I used to prefer permissive licenses and now favor copyleft</title>
    <link>https://vitalik.ca/general/2025/07/07/copyleft.html</link>
    <guid>https://vitalik.ca/general/2025/07/07/copyleft.html</guid>
    <pubDate>Mon, 07 Jul 2025 00:00:00 +0000</pubDate>
    <description>Thoughts on software licensing</description>
  </item>
</channel>
</rss>`;

const mockRSSFeed2 = `<?xml version="1.0" ?>
<rss version="2.0">
<channel>
  <title>Vitalik Buterin's website</title>
  <link>https://vitalik.ca/</link>
  <description>Vitalik Buterin's website</description>
  <item>
    <title>NEW POST: Ethereum 2.0 Update</title>
    <link>https://vitalik.ca/general/2025/07/11/eth2-update.html</link>
    <guid>https://vitalik.ca/general/2025/07/11/eth2-update.html</guid>
    <pubDate>Fri, 11 Jul 2025 00:00:00 +0000</pubDate>
    <description>Latest updates on Ethereum 2.0</description>
  </item>
  <item>
    <title>My response to AI 2027</title>
    <link>https://vitalik.ca/general/2025/07/10/2027.html</link>
    <guid>https://vitalik.ca/general/2025/07/10/2027.html</guid>
    <pubDate>Thu, 10 Jul 2025 00:00:00 +0000</pubDate>
    <description>Response to AI predictions for 2027</description>
  </item>
  <item>
    <title>Why I used to prefer permissive licenses and now favor copyleft</title>
    <link>https://vitalik.ca/general/2025/07/07/copyleft.html</link>
    <guid>https://vitalik.ca/general/2025/07/07/copyleft.html</guid>
    <pubDate>Mon, 07 Jul 2025 00:00:00 +0000</pubDate>
    <description>Thoughts on software licensing</description>
  </item>
</channel>
</rss>`;

// Simple RSS parser (same logic as RSSEventSource)
function parseRSSFeed(xmlText: string): any[] {
  const items: any[] = [];
  
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  
  while ((match = itemRegex.exec(xmlText)) !== null) {
    const itemXml = match[1];
    
    const title = extractTag(itemXml, 'title');
    const description = extractTag(itemXml, 'description');
    const link = extractTag(itemXml, 'link');
    const pubDate = extractTag(itemXml, 'pubDate');
    const guid = extractTag(itemXml, 'guid');
    
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

function extractTag(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`);
  const match = xml.match(regex);
  return match ? match[1].trim() : '';
}

async function demonstrateDeltaDetection() {
  console.log('🧪 RSS Delta Detection Demonstration');
  console.log('=====================================\n');

  // Simulate the delta detection logic
  const lastItems = new Set<string>(); // This is what RSSEventSource uses internally
  let callCount = 0;

  // First check - should find 2 new posts
  callCount++;
  console.log(`🔄 Call #${callCount} - Checking RSS feed...`);
  
  const items1 = parseRSSFeed(mockRSSFeed1);
  const newItems1 = items1.filter(item => !lastItems.has(item.guid || item.link));
  
  console.log(`📊 Found ${items1.length} total items in feed`);
  console.log(`🆕 Found ${newItems1.length} new items`);
  console.log(`💾 Already seen ${lastItems.size} items`);
  
  // Update tracking set
  newItems1.forEach(item => {
    lastItems.add(item.guid || item.link);
    console.log(`➕ Added to tracking: ${item.title}`);
  });

  console.log('\n🔔 CALLBACKS WOULD BE TRIGGERED FOR:');
  newItems1.forEach(item => {
    console.log(`  📰 ${item.title}`);
    console.log(`  🔗 ${item.link}`);
  });

  // Second check - should find 0 new posts (same feed)
  callCount++;
  console.log(`\n🔄 Call #${callCount} - Checking RSS feed again...`);
  
  const items2 = parseRSSFeed(mockRSSFeed1); // Same feed
  const newItems2 = items2.filter(item => !lastItems.has(item.guid || item.link));
  
  console.log(`📊 Found ${items2.length} total items in feed`);
  console.log(`🆕 Found ${newItems2.length} new items`);
  console.log(`💾 Already seen ${lastItems.size} items`);
  
  if (newItems2.length === 0) {
    console.log('✅ No new items found - no callbacks triggered');
  }

  // Third check - should find 1 new post (new feed with additional post)
  callCount++;
  console.log(`\n🔄 Call #${callCount} - Checking RSS feed with new post...`);
  
  const items3 = parseRSSFeed(mockRSSFeed2); // New feed with additional post
  const newItems3 = items3.filter(item => !lastItems.has(item.guid || item.link));
  
  console.log(`📊 Found ${items3.length} total items in feed`);
  console.log(`🆕 Found ${newItems3.length} new items`);
  console.log(`💾 Already seen ${lastItems.size} items`);
  
  // Update tracking set
  newItems3.forEach(item => {
    lastItems.add(item.guid || item.link);
    console.log(`➕ Added to tracking: ${item.title}`);
  });

  console.log('\n🔔 CALLBACKS WOULD BE TRIGGERED FOR:');
  newItems3.forEach(item => {
    console.log(`  📰 ${item.title}`);
    console.log(`  🔗 ${item.link}`);
  });
  
  console.log('\n✅ Delta Detection Test Completed!');
  console.log('\n📋 Summary:');
  console.log('  - First check: Found 2 new posts (initial load)');
  console.log('  - Second check: Found 0 new posts (no changes)');
  console.log('  - Third check: Found 1 new post (Ethereum 2.0 Update)');
  console.log('  - Delta detection successfully filtered out already-seen posts');
  console.log('\n💡 This is exactly how RSSEventSource works internally!');
}

// Run the demonstration
if (import.meta.url === `file://${process.argv[1]}`) {
  demonstrateDeltaDetection().catch(console.error);
}

export { demonstrateDeltaDetection }; 