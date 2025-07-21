#!/usr/bin/env node
/**
 * Merged Platform Example
 * Demonstrates the unified AgenticPlatform that combines WorkflowManager and AgenticPlatform
 */

import 'dotenv/config';
import { AgenticPlatform } from '../src/index.js';
import { agentPersonas } from '../src/config/personas.js';
import { SearchPlugin } from '../src/plugins/SearchPlugin.js';
import { ERC20Plugin } from '../src/plugins/ERC20Plugin.js';
import { StartupEvaluationPlugin } from '../src/plugins/StartupEvaluationPlugin.js';
import { TerminalClient } from '../src/clients/TerminalClient.js';

async function mergedPlatformExample() {
  console.log('🚀 Starting Merged Platform Example...\n');

  // Create the unified platform
  const platform = new AgenticPlatform();
  
  console.log('✅ Created unified AgenticPlatform (merged WorkflowManager + AgenticPlatform)');
  
  // Register agents - now handled directly by the platform
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
  
  // Register plugins - now handled directly by the platform
  console.log('\n📦 Step 2: Registering plugins...');
  await Promise.all([
    platform.registerPluginForAgent("oracle", new SearchPlugin()),
    platform.registerPluginForAgent("analyst", new StartupEvaluationPlugin()),
    platform.registerPluginForAgent("degen", new ERC20Plugin())
  ]);
  
  console.log('✅ All plugins registered successfully');
  
  // Define the coordinator workflow - now handled directly by the platform
  console.log('\n🔄 Step 3: Defining coordinator workflow...');
  await platform.defineCoordinatorWorkflow();
  
  console.log('✅ Coordinator workflow defined successfully');
  
  // Register terminal client - now handled directly by the platform
  console.log('\n📱 Step 4: Registering terminal client...');
  await platform.registerClient(new TerminalClient());
  
  console.log('✅ Terminal client registered successfully');
  
  // Get platform status
  console.log('\n📊 Step 5: Platform Status:');
  const status = platform.getStatus();
  console.log('  Agents:', status.agents);
  console.log('  Clients:', status.clients);
  console.log('  Event Sources:', status.eventSources);
  
  // Start the platform
  console.log('\n🚀 Step 6: Starting platform...');
  await platform.start();
  
  console.log('\n🎉 Merged Platform Example Complete!');
  console.log('\n💡 Key Benefits of the Merged Platform:');
  console.log('  ✅ Single class handles all agent and workflow management');
  console.log('  ✅ No more confusion between WorkflowManager and AgenticPlatform');
  console.log('  ✅ Unified routing logic');
  console.log('  ✅ Simplified API');
  console.log('  ✅ Better separation of concerns');
  console.log('  ✅ Easier to understand and maintain');
  
  console.log('\n🔧 Try asking questions like:');
  console.log('  - "What\'s the weather in San Francisco?" (→ Oracle)');
  console.log('  - "Analyze this startup: [description]" (→ Analyst)');
  console.log('  - "Should I buy this token?" (→ Degen)');
  console.log('  - "Search for information about AI trends" (→ Oracle)');
  console.log('  - "Evaluate the market potential of this project" (→ Analyst)');
  console.log('  - "How do I make an onchain transaction?" (→ Degen)');
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    await platform.stop();
    process.exit(0);
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  mergedPlatformExample().catch(console.error);
} 