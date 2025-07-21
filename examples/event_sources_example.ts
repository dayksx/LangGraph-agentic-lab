import 'dotenv/config';
import { AgenticPlatform } from '../src/index.js';
import { RSSEventSource } from '../src/events/RSSEventSource.js';
import { APIEventSource } from '../src/events/APIEventSource.js';
import { agentPersonas } from '../src/config/personas.js';
import { SearchPlugin } from '../src/plugins/SearchPlugin.js';
import { ERC20Plugin } from '../src/plugins/ERC20Plugin.js';
import { StartupEvaluationPlugin } from '../src/plugins/StartupEvaluationPlugin.js';

async function eventSourcesExample() {
  console.log('🚀 Starting Event Sources Example...');
  
  const platform = new AgenticPlatform();
  
  // Register agents
  await platform.registerAgent("analyst", {
    modelName: "gpt-4",
    temperature: 0.7,
    tools: [],
    persona: agentPersonas.analyst
  });
  
  await platform.registerAgent("degen", {
    modelName: "gpt-4",
    temperature: 0.9,
    tools: [],
    persona: agentPersonas.degen
  });
  
  await platform.registerAgent("oracle", {
    modelName: "gpt-4",
    temperature: 0.5,
    tools: [],
    persona: agentPersonas.oracle
  });

  // Register plugins
  await Promise.all([
    platform.registerPluginForAgent("oracle", new SearchPlugin()),
    platform.registerPluginForAgent("analyst", new StartupEvaluationPlugin()),
    platform.registerPluginForAgent("degen", new ERC20Plugin())
  ]);

  // Define workflow
  await platform.defineCoordinatorWorkflow();

  console.log('✅ Platform initialized!');
  console.log('📡 Registering event sources...\n');

  // Example 1: RSS Event Source
  console.log('📰 Example 1: RSS Event Source');
  
  try {
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
    console.log('✅ RSS event source registered');
  } catch (error) {
    console.log('⚠️  RSS source not available (using mock data)');
  }

  // Example 2: API Event Source
  console.log('\n🔌 Example 2: API Event Source');
  
  try {
    const apiSource = new APIEventSource({
      name: 'news_api',
      type: 'api',
      enabled: true,
      apiUrl: 'https://newsapi.org/v2/top-headlines?country=us&category=technology',
      apiKey: process.env.NEWS_API_KEY,
      headers: {
        'User-Agent': 'AgenticPlatform/1.0'
      },
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
    console.log('✅ API event source registered');
  } catch (error) {
    console.log('⚠️  API source not available (using mock data)');
  }

  // Example 3: Custom API Event Source with Transform
  console.log('\n🔧 Example 3: Custom API Event Source with Transform');
  
  try {
    const customApiSource = new APIEventSource({
      name: 'custom_api',
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
          sources: ['custom_api'],
          timestamp: new Date(),
          category: 'technology',
          impact: 'medium',
          metadata: {
            source: 'custom_api',
            originalData: trend
          }
        })) || [];
      }
    });

    await platform.registerEventSource(customApiSource);
    console.log('✅ Custom API event source registered');
  } catch (error) {
    console.log('⚠️  Custom API source not available (using mock data)');
  }

  // Start the platform (this will start all clients and event sources)
  console.log('\n🚀 Starting platform...');
  await platform.start();

  console.log('\n📊 Platform is now running with:');
  console.log('  - Multiple agents (Oracle, Analyst, Degen)');
  console.log('  - Event sources (RSS, API)');
  console.log('  - Automatic event processing and agent routing');
  console.log('  - Real-time event monitoring');

  // Let it run for a while to demonstrate
  console.log('\n⏰ Running for 30 seconds to demonstrate event processing...');
  await new Promise(resolve => setTimeout(resolve, 30000));

  // Stop the platform
  console.log('\n🛑 Stopping platform...');
  await platform.stop();

  console.log('\n✅ Event Sources Example completed!');
  console.log('\n💡 Key Features Demonstrated:');
  console.log('  - Event sources as workflow entry points (like clients)');
  console.log('  - RSS feed monitoring with filtering');
  console.log('  - API polling with authentication');
  console.log('  - Custom response transformation');
  console.log('  - Automatic event processing through workflow');
  console.log('  - Agent routing based on event type');
  console.log('  - Unified lifecycle management');
}

// Run the example
if (import.meta.url === `file://${process.argv[1]}`) {
  eventSourcesExample().catch(console.error);
}

export { eventSourcesExample }; 