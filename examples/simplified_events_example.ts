#!/usr/bin/env node
/**
 * Simplified Events Example
 * Demonstrates the new simplified event system with just OnchainEvent and WebEvent
 */

import 'dotenv/config';
import { AgenticPlatform } from '../src/index.js';
import { OnchainEvent, WebEvent } from '../src/types/events.js';
import { agentPersonas } from '../src/config/personas.js';
import { SearchPlugin } from '../src/plugins/SearchPlugin.js';
import { ERC20Plugin } from '../src/plugins/ERC20Plugin.js';
import { StartupEvaluationPlugin } from '../src/plugins/StartupEvaluationPlugin.js';
import { TerminalClient } from '../src/clients/TerminalClient.js';

async function simplifiedEventsExample() {
  console.log('🚀 Starting Simplified Events Example...\n');

  // Create the platform
  const platform = new AgenticPlatform();
  
  console.log('✅ Created platform with simplified event system');
  
  // Register agents
  console.log('\n🤖 Step 1: Registering agents...');
  await platform.registerAgent("oracle", {
    modelName: "gpt-4",
    temperature: 0.5,
    tools: [],
    persona: agentPersonas.oracle
  });
  
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
  
  console.log('✅ All agents registered successfully');
  
  // Register plugins
  console.log('\n📦 Step 2: Registering plugins...');
  await Promise.all([
    platform.registerPluginForAgent("oracle", new SearchPlugin()),
    platform.registerPluginForAgent("analyst", new StartupEvaluationPlugin()),
    platform.registerPluginForAgent("degen", new ERC20Plugin())
  ]);
  
  console.log('✅ All plugins registered successfully');
  
  // Define the coordinator workflow
  console.log('\n🔄 Step 3: Defining coordinator workflow...');
  await platform.defineCoordinatorWorkflow();
  
  console.log('✅ Coordinator workflow defined successfully');
  
  // Register terminal client
  console.log('\n📱 Step 4: Registering terminal client...');
  await platform.registerClient(new TerminalClient());
  
  console.log('✅ Terminal client registered successfully');
  
  // Test simplified events
  console.log('\n🧪 Step 5: Testing simplified events...');
  
  // Test WebEvent
  console.log('\n🌐 Testing WebEvent:');
  const webEvent: WebEvent = {
    type: 'web_event',
    source: 'TechCrunch',
    title: 'AI Startup Raises $50M Series A',
    content: 'A promising AI startup focused on natural language processing has raised $50 million in Series A funding, led by prominent venture capital firms.',
    url: 'https://techcrunch.com/ai-startup-funding',
    timestamp: new Date(),
    metadata: {
      category: 'startup',
      funding: '50M'
    }
  };
  
  try {
    const webResponse = await platform.processEvent(webEvent);
    console.log('🤖 WebEvent Response:', typeof webResponse.content === 'string' ? webResponse.content.substring(0, 200) + '...' : 'Complex response');
  } catch (error) {
    console.error('❌ Error processing WebEvent:', error);
  }
  
  // Test OnchainEvent
  console.log('\n⛓️ Testing OnchainEvent:');
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
    metadata: {
      significance: 'medium'
    }
  };
  
  try {
    const onchainResponse = await platform.processEvent(onchainEvent);
    console.log('🤖 OnchainEvent Response:', typeof onchainResponse.content === 'string' ? onchainResponse.content.substring(0, 200) + '...' : 'Complex response');
  } catch (error) {
    console.error('❌ Error processing OnchainEvent:', error);
  }
  
  // Test custom agent routing
  console.log('\n🎯 Testing custom agent routing:');
  try {
    const customResponse = await platform.processEvent(webEvent, 'analyst');
    console.log('🤖 Custom routed Response:', typeof customResponse.content === 'string' ? customResponse.content.substring(0, 200) + '...' : 'Complex response');
  } catch (error) {
    console.error('❌ Error processing custom routed event:', error);
  }
  
  // Final summary
  console.log('\n🎉 Simplified Events Example Complete!');
  console.log('\n💡 Key Simplifications:');
  console.log('  ✅ Only 2 event types: OnchainEvent and WebEvent');
  console.log('  ✅ No complex categories, urgency levels, or confidence scores');
  console.log('  ✅ Simple, flat structure');
  console.log('  ✅ Easy to understand and extend');
  console.log('  ✅ Generic enough for any web or blockchain data');
  
  console.log('\n🔧 Event Types:');
  console.log('  - WebEvent: Any web content (news, articles, social media, etc.)');
  console.log('  - OnchainEvent: Any blockchain transaction or event');
  
  console.log('\n🔄 Automatic Routing:');
  console.log('  - WebEvent → Oracle agent (general analysis)');
  console.log('  - OnchainEvent → Degen agent (blockchain analysis)');
  console.log('  - Custom routing: Specify preferred agent in processEvent()');
  
  // Start the platform
  console.log('\n🚀 Starting platform...');
  await platform.start();
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    await platform.stop();
    process.exit(0);
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  simplifiedEventsExample().catch(console.error);
} 