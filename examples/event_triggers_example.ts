import 'dotenv/config';
import { AgenticPlatform } from '../src/index.js';
import { BreakingNewsEvent, EmergingTrendEvent, OnchainEvent } from '../src/types/events.js';
import { agentPersonas } from '../src/config/personas.js';
import { SearchPlugin } from '../src/plugins/SearchPlugin.js';
import { ERC20Plugin } from '../src/plugins/ERC20Plugin.js';
import { StartupEvaluationPlugin } from '../src/plugins/StartupEvaluationPlugin.js';

async function eventTriggersExample() {
  console.log('🚀 Starting Event Triggers Example...');
  
  const platform = new AgenticPlatform();
  
  // Register agents with unique personas
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
  
  // Register plugins for specific agents
  await Promise.all([
    platform.registerPluginForAgent("oracle", new SearchPlugin()),
    platform.registerPluginForAgent("analyst", new StartupEvaluationPlugin()),
    platform.registerPluginForAgent("degen", new ERC20Plugin())
  ]);

  // Define the coordinator workflow
  await platform.defineCoordinatorWorkflow();
  
  console.log('✅ Platform setup complete!');
  console.log('📡 Testing different event triggers...\n');

  // Example 1: Breaking News Event
  console.log('📰 Example 1: Breaking News Event');
  const breakingNewsEvent: BreakingNewsEvent = {
    type: 'breaking_news',
    source: 'Reuters',
    headline: 'Major Tech Company Announces AI Breakthrough',
    content: 'A leading technology company has announced a significant breakthrough in artificial intelligence that could revolutionize the industry. The new AI model shows unprecedented capabilities in natural language processing and reasoning.',
    timestamp: new Date(),
    category: 'technology',
    urgency: 'high'
  };

  try {
    const response1 = await platform.processEvent(breakingNewsEvent);
    console.log('🤖 Agent Response:', response1.content);
    console.log('📍 Routed to agent based on news category and urgency\n');
  } catch (error) {
    console.error('❌ Error processing breaking news:', error);
  }

  // Example 2: Emerging Trend Event
  console.log('📈 Example 2: Emerging Trend Event');
  const emergingTrendEvent: EmergingTrendEvent = {
    type: 'emerging_trend',
    topic: 'Decentralized Finance (DeFi) Growth',
    description: 'Significant increase in DeFi protocol adoption and TVL across multiple networks, with new innovative lending and yield farming mechanisms emerging.',
    confidence: 0.85,
    sources: ['CoinGecko', 'DeFi Pulse', 'Messari'],
    timestamp: new Date(),
    category: 'defi',
    impact: 'high'
  };

  try {
    const response2 = await platform.processEvent(emergingTrendEvent);
    console.log('🤖 Agent Response:', response2.content);
    console.log('📍 Routed to agent based on trend category and impact\n');
  } catch (error) {
    console.error('❌ Error processing emerging trend:', error);
  }

  // Example 3: Onchain Event
  console.log('⛓️ Example 3: Onchain Event');
  const onchainEvent: OnchainEvent = {
    type: 'onchain_event',
    network: 'Ethereum',
    eventType: 'TokenTransfer',
    contractAddress: '0x1234567890123456789012345678901234567890',
    transactionHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    blockNumber: 18500000,
    data: {
      from: '0x1111111111111111111111111111111111111111',
      to: '0x2222222222222222222222222222222222222222',
      value: '1000000000000000000000', // 1000 tokens
      token: 'USDC'
    },
    timestamp: new Date(),
    significance: 'medium'
  };

  try {
    const response3 = await platform.processEvent(onchainEvent);
    console.log('🤖 Agent Response:', response3.content);
    console.log('📍 Routed to agent based on event type and significance\n');
  } catch (error) {
    console.error('❌ Error processing onchain event:', error);
  }

  // Example 4: Generic Event Processing
  console.log('🔄 Example 4: Generic Event Processing');
  const financialNewsEvent: BreakingNewsEvent = {
    type: 'breaking_news',
    source: 'Bloomberg',
    headline: 'Federal Reserve Announces Interest Rate Decision',
    content: 'The Federal Reserve has announced its latest interest rate decision, which could have significant implications for financial markets and investment strategies.',
    timestamp: new Date(),
    category: 'financial',
    urgency: 'critical'
  };

  try {
    const response4 = await platform.processEvent(financialNewsEvent);
    console.log('🤖 Agent Response:', response4.content);
    console.log('📍 Routed to agent using generic processEvent method\n');
  } catch (error) {
    console.error('❌ Error processing generic event:', error);
  }

  // Example 5: Custom Agent Routing
  console.log('🎯 Example 5: Custom Agent Routing');
  const cryptoNewsEvent: BreakingNewsEvent = {
    type: 'breaking_news',
    source: 'CoinDesk',
    headline: 'Bitcoin Reaches New All-Time High',
    content: 'Bitcoin has reached a new all-time high, surpassing previous records and showing strong momentum in the cryptocurrency market.',
    timestamp: new Date(),
    category: 'crypto',
    urgency: 'high'
  };

  try {
    // Force routing to a specific agent
    const response5 = await platform.processEvent(cryptoNewsEvent, 'degen');
    console.log('🤖 Agent Response:', response5.content);
    console.log('📍 Manually routed to degen agent\n');
  } catch (error) {
    console.error('❌ Error processing with custom routing:', error);
  }

  console.log('✅ Event triggers example completed!');
  console.log('\n💡 Key Features Demonstrated:');
  console.log('  - Breaking news events with urgency-based routing');
  console.log('  - Emerging trend detection with confidence scoring');
  console.log('  - Onchain event processing with blockchain data');
  console.log('  - Generic event processing for any event type');
  console.log('  - Custom agent routing for specific use cases');
  console.log('  - Automatic agent selection based on event characteristics');
}

// Run the example
if (import.meta.url === `file://${process.argv[1]}`) {
  eventTriggersExample().catch(console.error);
}

export { eventTriggersExample }; 