#!/usr/bin/env node
/**
 * Agent-Based Coordinator Example
 * Demonstrates the new system where coordinator and summarizer are proper Agent objects
 */

import 'dotenv/config';
import { AgenticPlatform } from '../src/index.js';
import { agentPersonas } from '../src/config/personas.js';
import { SearchPlugin } from '../src/plugins/SearchPlugin.js';
import { ERC20Plugin } from '../src/plugins/ERC20Plugin.js';
import { AttestationPlugin } from '../src/plugins/AttestationPlugin.js';
import { StartupEvaluationPlugin } from '../src/plugins/StartupEvaluationPlugin.js';
import { TerminalClient } from '../src/clients/TerminalClient.js';
import { HumanMessage } from '@langchain/core/messages';

async function agentBasedCoordinatorExample() {
  console.log('🚀 Starting Agent-Based Coordinator Example...\n');

  // Create the platform
  const platform = new AgenticPlatform();
  
  console.log('✅ Created platform with agent-based coordinator system');
  
  // Register specialized agents
  console.log('\n🤖 Step 1: Registering specialized agents...');
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
  
  console.log('✅ All specialized agents registered successfully');
  
  // Register coordinator and summarizer agents
  console.log('\n🎯 Step 2: Registering coordinator and summarizer agents...');
  await platform.registerAgent("coordinator", {
    modelName: "gpt-4o-mini",
    temperature: 0,
    tools: [],
    persona: agentPersonas.coordinator
  });

  await platform.registerAgent("summarizer", {
    modelName: "gpt-4o-mini",
    temperature: 0.3,
    tools: [],
    persona: agentPersonas.summarizer
  });
  
  console.log('✅ Coordinator and summarizer agents registered successfully');
  
  // Register plugins
  console.log('\n📦 Step 3: Registering plugins...');
  await Promise.all([
    platform.registerPluginsForAgent("oracle", new SearchPlugin()),
    platform.registerPluginsForAgent("analyst", new StartupEvaluationPlugin()),
    platform.registerPluginsForAgent("degen", [new ERC20Plugin(), new AttestationPlugin()])
  ]);
  
  console.log('✅ All plugins registered successfully');
  
  // Define the coordinator workflow
  console.log('\n🔄 Step 4: Defining coordinator workflow...');
  await platform.defineCoordinatorWorkflow();
  
  console.log('✅ Coordinator workflow defined successfully');
  
  // Register terminal client
  console.log('\n📱 Step 4: Registering terminal client...');
  await platform.registerClient(new TerminalClient());
  
  console.log('✅ Terminal client registered successfully');
  
  // Test the agent-based system
  console.log('\n🧪 Step 5: Testing agent-based coordinator system...');
  
  // Test multi-step workflow
  console.log('\n🔄 Testing multi-step workflow:');
  console.log('User: "Research Vitalik.eth and issue an attestation if he seems trustworthy"');
  
  try {
    const response = await platform.processMessage(new HumanMessage("Research Vitalik.eth and issue an attestation if he seems trustworthy"));
    
    console.log('🤖 Final Response:', typeof response.content === 'string' ? response.content.substring(0, 300) + '...' : 'Complex response');
  } catch (error) {
    console.error('❌ Error processing multi-step request:', error);
  }
  
  // Test simple routing
  console.log('\n🎯 Testing simple routing:');
  console.log('User: "What is the weather in San Francisco?"');
  
  try {
    const response = await platform.processMessage(new HumanMessage("What is the weather in San Francisco?"));
    
    console.log('🤖 Final Response:', typeof response.content === 'string' ? response.content.substring(0, 200) + '...' : 'Complex response');
  } catch (error) {
    console.error('❌ Error processing simple request:', error);
  }
  
  // Test analysis request
  console.log('\n📊 Testing analysis request:');
  console.log('User: "Analyze this startup: A new AI company focused on natural language processing"');
  
  try {
    const response = await platform.processMessage(new HumanMessage("Analyze this startup: A new AI company focused on natural language processing"));
    
    console.log('🤖 Final Response:', typeof response.content === 'string' ? response.content.substring(0, 200) + '...' : 'Complex response');
  } catch (error) {
    console.error('❌ Error processing analysis request:', error);
  }
  
  // Final summary
  console.log('\n🎉 Agent-Based Coordinator Example Complete!');
  console.log('\n💡 Key Improvements:');
  console.log('  ✅ Coordinator is now a proper Agent object with persona and configuration');
  console.log('  ✅ Summarizer is now a proper Agent object with persona and configuration');
  console.log('  ✅ Both agents can be customized, have plugins, and follow the same patterns');
  console.log('  ✅ Much more consistent architecture');
  console.log('  ✅ Easier to debug and extend');
  console.log('  ✅ Better separation of concerns');
  
  console.log('\n🔧 Agent Architecture:');
  console.log('  - Coordinator Agent: Routes requests and manages workflow');
  console.log('  - Summarizer Agent: Combines responses into final answer');
  console.log('  - Oracle Agent: Handles research and general knowledge');
  console.log('  - Analyst Agent: Handles analysis and evaluation');
  console.log('  - Degen Agent: Handles onchain actions');
  
  console.log('\n🔄 Workflow:');
  console.log('  1. User request → Coordinator Agent (decides routing)');
  console.log('  2. Coordinator → Specialized Agent (oracle/analyst/degen)');
  console.log('  3. Specialized Agent → Coordinator (check if more work needed)');
  console.log('  4. If complete → Summarizer Agent (combine responses)');
  console.log('  5. Summarizer → Final response to user');
  
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
  agentBasedCoordinatorExample().catch(console.error);
} 