import 'dotenv/config';
import { AgenticPlatform } from '../src/index.js';
import { BreakingNewsEvent, EmergingTrendEvent, OnchainEvent, EventTrigger } from '../src/types/events.js';
import { agentPersonas } from '../src/config/personas.js';
import { SearchPlugin } from '../src/plugins/SearchPlugin.js';
import { ERC20Plugin } from '../src/plugins/ERC20Plugin.js';
import { StartupEvaluationPlugin } from '../src/plugins/StartupEvaluationPlugin.js';

// Event source interfaces
interface NewsSource {
  name: string;
  url: string;
  category: string;
  checkInterval: number; // milliseconds
}

interface TrendSource {
  name: string;
  apiKey?: string;
  endpoint: string;
  checkInterval: number;
}

interface BlockchainSource {
  name: string;
  network: string;
  rpcUrl: string;
  contractAddresses: string[];
  checkInterval: number;
}

class RealtimeEventProcessor {
  private platform: AgenticPlatform;
  // No longer needed - workflow management is now part of the platform
  private isRunning: boolean = false;
  private eventQueue: EventTrigger[] = [];
  private processingQueue: boolean = false;

  // Event sources configuration
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
    },
    {
      name: 'CoinDesk',
      url: 'https://www.coindesk.com/api/news',
      category: 'crypto',
      checkInterval: 120000 // 2 minutes
    }
  ];

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

  private blockchainSources: BlockchainSource[] = [
    {
      name: 'Ethereum Mainnet',
      network: 'Ethereum',
      rpcUrl: process.env.ETHEREUM_RPC_URL || 'https://mainnet.infura.io/v3/your-project-id',
      contractAddresses: [
        '0xA0b86a33E6441b8c4C8C8C8C8C8C8C8C8C8C8C8C', // Example contract
        '0xB0b86a33E6441b8c4C8C8C8C8C8C8C8C8C8C8C8C'  // Example contract
      ],
      checkInterval: 15000 // 15 seconds
    }
  ];

  constructor() {
    this.platform = new AgenticPlatform();
    // No longer needed - workflow management is now part of the platform
  }

  async initialize(): Promise<void> {
    console.log('🚀 Initializing Realtime Event Processor...');

    // Register agents
    await this.platform.registerAgent("analyst", {
      modelName: "gpt-4",
      temperature: 0.7,
      tools: [],
      persona: agentPersonas.analyst
    });
    
    await this.platform.registerAgent("degen", {
      modelName: "gpt-4",
      temperature: 0.9,
      tools: [],
      persona: agentPersonas.degen
    });
    
    await this.platform.registerAgent("oracle", {
      modelName: "gpt-4",
      temperature: 0.5,
      tools: [],
      persona: agentPersonas.oracle
    });

    // Register plugins
    await Promise.all([
      this.platform.registerPluginForAgent("oracle", new SearchPlugin()),
      this.platform.registerPluginForAgent("analyst", new StartupEvaluationPlugin()),
      this.platform.registerPluginForAgent("degen", new ERC20Plugin())
    ]);

    // Define workflow
    await this.platform.defineCoordinatorWorkflow();

    console.log('✅ Realtime Event Processor initialized!');
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️  Processor is already running');
      return;
    }

    this.isRunning = true;
    console.log('🔄 Starting real-time event processing...');

    // Start event queue processor
    this.startEventQueueProcessor();

    // Start monitoring different event sources
    this.startNewsMonitoring();
    this.startTrendMonitoring();
    this.startBlockchainMonitoring();

    console.log('📡 All event sources are now being monitored');
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    console.log('🛑 Stopping real-time event processing...');
  }

  // Event queue management
  private async startEventQueueProcessor(): Promise<void> {
    const processQueue = async () => {
      if (this.processingQueue || this.eventQueue.length === 0) {
        return;
      }

      this.processingQueue = true;
      
      while (this.eventQueue.length > 0 && this.isRunning) {
        const event = this.eventQueue.shift();
        if (event) {
          try {
            console.log(`📥 Processing event: ${event.type}`);
            const response = await this.platform.processEvent(event);
                          console.log(`📤 Event processed by agent: ${typeof response.content === 'string' ? response.content.substring(0, 100) : 'Complex response'}...`);
          } catch (error) {
            console.error(`❌ Error processing event:`, error);
          }
        }
      }

      this.processingQueue = false;
    };

    // Process queue every 5 seconds
    setInterval(processQueue, 5000);
  }

  private addEventToQueue(event: EventTrigger): void {
    this.eventQueue.push(event);
    console.log(`📨 Added ${event.type} event to queue (queue size: ${this.eventQueue.length})`);
  }

  // News monitoring
  private startNewsMonitoring(): void {
    this.newsSources.forEach(source => {
      setInterval(async () => {
        if (!this.isRunning) return;
        
        try {
          const newsEvents = await this.fetchNewsFromSource(source);
          newsEvents.forEach(event => this.addEventToQueue(event));
        } catch (error) {
          console.error(`❌ Error fetching news from ${source.name}:`, error);
        }
      }, source.checkInterval);
    });
  }

  private async fetchNewsFromSource(source: NewsSource): Promise<BreakingNewsEvent[]> {
    // This is a mock implementation - replace with actual API calls
    console.log(`📰 Checking ${source.name} for breaking news...`);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock news events based on source
    const mockEvents: BreakingNewsEvent[] = [];
    
    if (source.category === 'crypto' && Math.random() > 0.7) {
      mockEvents.push({
        type: 'breaking_news',
        source: source.name,
        headline: 'Bitcoin Price Surges Past Previous Resistance',
        content: 'Bitcoin has broken through a key resistance level, showing strong bullish momentum in the cryptocurrency market.',
        timestamp: new Date(),
        category: 'crypto',
        urgency: 'high'
      });
    }

    if (source.category === 'financial' && Math.random() > 0.8) {
      mockEvents.push({
        type: 'breaking_news',
        source: source.name,
        headline: 'Major Market Index Reaches New High',
        content: 'A major stock market index has reached a new all-time high, driven by strong corporate earnings and economic optimism.',
        timestamp: new Date(),
        category: 'financial',
        urgency: 'medium'
      });
    }

    return mockEvents;
  }

  // Trend monitoring
  private startTrendMonitoring(): void {
    this.trendSources.forEach(source => {
      setInterval(async () => {
        if (!this.isRunning) return;
        
        try {
          const trendEvents = await this.fetchTrendsFromSource(source);
          trendEvents.forEach(event => this.addEventToQueue(event));
        } catch (error) {
          console.error(`❌ Error fetching trends from ${source.name}:`, error);
        }
      }, source.checkInterval);
    });
  }

  private async fetchTrendsFromSource(source: TrendSource): Promise<EmergingTrendEvent[]> {
    console.log(`📈 Checking ${source.name} for emerging trends...`);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Mock trend events
    const mockEvents: EmergingTrendEvent[] = [];
    
    if (Math.random() > 0.6) {
      mockEvents.push({
        type: 'emerging_trend',
        topic: 'AI-Powered Trading Algorithms',
        description: 'Growing adoption of AI-powered trading algorithms in traditional and crypto markets, with significant performance improvements reported.',
        confidence: 0.75 + Math.random() * 0.2,
        sources: [source.name, 'Market Analysis Reports'],
        timestamp: new Date(),
        category: 'technology',
        impact: 'high'
      });
    }

    return mockEvents;
  }

  // Blockchain monitoring
  private startBlockchainMonitoring(): void {
    this.blockchainSources.forEach(source => {
      setInterval(async () => {
        if (!this.isRunning) return;
        
        try {
          const blockchainEvents = await this.fetchBlockchainEvents(source);
          blockchainEvents.forEach(event => this.addEventToQueue(event));
        } catch (error) {
          console.error(`❌ Error fetching blockchain events from ${source.name}:`, error);
        }
      }, source.checkInterval);
    });
  }

  private async fetchBlockchainEvents(source: BlockchainSource): Promise<OnchainEvent[]> {
    console.log(`⛓️ Checking ${source.name} for onchain events...`);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Mock blockchain events
    const mockEvents: OnchainEvent[] = [];
    
    if (Math.random() > 0.5) {
      mockEvents.push({
        type: 'onchain_event',
        network: source.network,
        eventType: 'LargeTransfer',
        contractAddress: source.contractAddresses[0],
        transactionHash: `0x${Math.random().toString(16).substring(2, 66)}`,
        blockNumber: Math.floor(Math.random() * 1000000) + 18000000,
        data: {
          from: `0x${Math.random().toString(16).substring(2, 42)}`,
          to: `0x${Math.random().toString(16).substring(2, 42)}`,
          value: (Math.random() * 1000000).toString(),
          token: 'USDC'
        },
        timestamp: new Date(),
        significance: Math.random() > 0.7 ? 'high' : 'medium'
      });
    }

    return mockEvents;
  }

  // Manual event injection for testing
  async injectEvent(event: EventTrigger): Promise<void> {
    console.log(`🎯 Manually injecting event: ${event.type}`);
    this.addEventToQueue(event);
  }

  // Get current status
  getStatus(): {
    isRunning: boolean;
    queueSize: number;
    processingQueue: boolean;
    newsSources: number;
    trendSources: number;
    blockchainSources: number;
  } {
    return {
      isRunning: this.isRunning,
      queueSize: this.eventQueue.length,
      processingQueue: this.processingQueue,
      newsSources: this.newsSources.length,
      trendSources: this.trendSources.length,
      blockchainSources: this.blockchainSources.length
    };
  }
}

// Example usage
async function realtimeEventProcessorExample() {
  const processor = new RealtimeEventProcessor();
  
  try {
    await processor.initialize();
    await processor.start();

    // Let it run for a while to see events being processed
    console.log('⏰ Running for 30 seconds to demonstrate real-time processing...');
    await new Promise(resolve => setTimeout(resolve, 30000));

    // Show status
    const status = processor.getStatus();
    console.log('\n📊 Final Status:', status);

    // Inject a manual event
    console.log('\n🎯 Injecting manual event...');
    const manualEvent: BreakingNewsEvent = {
      type: 'breaking_news',
      source: 'Manual Injection',
      headline: 'Test Event from Manual Injection',
      content: 'This is a test event injected manually to demonstrate the system.',
      timestamp: new Date(),
      category: 'test',
      urgency: 'low'
    };
    await processor.injectEvent(manualEvent);

    // Wait a bit more to see the manual event processed
    await new Promise(resolve => setTimeout(resolve, 10000));

    await processor.stop();
    console.log('✅ Realtime event processor example completed!');

  } catch (error) {
    console.error('❌ Error in realtime event processor:', error);
  }
}

// Run the example
if (import.meta.url === `file://${process.argv[1]}`) {
  realtimeEventProcessorExample().catch(console.error);
}

export { RealtimeEventProcessor, realtimeEventProcessorExample }; 