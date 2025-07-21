import 'dotenv/config';
import { AgenticPlatform } from './core/AgenticPlatform.js';
import { agentPersonas } from './config/personas.js';
import { SearchPlugin } from './plugins/SearchPlugin.js';
import { TerminalClient } from './clients/TerminalClient.js';
import { TelegramClient } from './clients/TelegramClient.js';
import { ERC20Plugin } from './plugins/ERC20Plugin.js';
import { StartupEvaluationPlugin } from './plugins/StartupEvaluationPlugin.js';
import { AttestationPlugin } from './plugins/AttestationPlugin.js';
import { MCPPlugin, MCPPluginFactory } from './plugins/MCPPlugin.js';
import { RSSEventSource } from './events/RSSEventSource.js';

// Re-export the merged AgenticPlatform from core
export { AgenticPlatform } from './core/AgenticPlatform.js';

// Re-export event types
export { OnchainEvent, WebEvent, EventTrigger } from './types/events.js';

// Example usage with merged platform
async function main() {
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

  // Register coordinator and summarizer agents
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
  
  // Register plugins for specific agents
  await Promise.all([
    platform.registerPluginsForAgent("analyst", new StartupEvaluationPlugin()),
    platform.registerPluginsForAgent("degen", [new ERC20Plugin(), new AttestationPlugin()]),
    platform.registerPluginsForAgent("oracle", new SearchPlugin())
  ]);

  // Register MCP plugins for different agents
  const taskManagementMCP = MCPPluginFactory.createTaskManagementPlugin();
  const mathMCP = MCPPluginFactory.createMathPlugin();
  const efpMCP = MCPPluginFactory.createEFPPlugin();
  
  await Promise.all([
    platform.registerPluginsForAgent("analyst", taskManagementMCP),
    platform.registerPluginsForAgent("oracle", mathMCP),
    platform.registerPluginsForAgent("degen", efpMCP)
  ]);

  // Example 4: Weather MCP for oracle agent (requires SSE server running)
  // const weatherMCP = MCPPluginFactory.createWeatherPlugin();
  // await platform.registerPluginForAgent("oracle", weatherMCP);

  // Example 5: Custom MCP plugin with multiple servers
  const customMCP = new MCPPlugin({
    name: 'custom_mcp',
    description: 'Custom MCP plugin with multiple servers',
    servers: [
      {
        name: 'task_management',
        command: 'python',
        args: ['./mcp_servers/task_management_server.py'],
        transport: 'stdio'
      },
      {
        name: 'math',
        command: 'python',
        args: ['./mcp_servers/math_server.py'],
        transport: 'stdio'
      }
    ]
  });

  await platform.registerPluginsForAgent("oracle", customMCP);
  
  // Define the coordinator workflow with intelligent routing
  await platform.defineCoordinatorWorkflow();
  
  // Register clients
  await platform.registerClient(new TerminalClient());
  
  // Register Telegram client (optional - requires TELEGRAM_BOT_TOKEN env var)
  if (process.env.TELEGRAM_BOT_TOKEN) {
    try {
      await platform.registerClient(new TelegramClient());
      console.log('✅ Telegram client registered successfully!');
    } catch (error) {
      console.warn('⚠️  Telegram client not registered:', error instanceof Error ? error.message : String(error));
    }
  } else {
    console.log('ℹ️  Telegram client not registered - set TELEGRAM_BOT_TOKEN environment variable to enable');
  }

  // Register event sources
  console.log('\n📡 Registering event sources...');
  
  // Register Vitalik's RSS feed
  try {
    const vitalikRSS = new RSSEventSource({
      name: 'vitalik_blog',
      type: 'rss',
      enabled: true,
      feedUrl: 'https://vitalik.eth.limo/feed.xml',
      checkInterval: 300000, // Check every 5 minutes
      filters: [
        // Filter for crypto/blockchain related posts
        {
          field: 'category',
          operator: 'contains',
          value: 'crypto'
        }
      ]
    });

    await platform.registerEventSource(vitalikRSS);
    console.log('✅ Vitalik RSS feed registered successfully!');
    console.log('   📰 Monitoring: https://vitalik.eth.limo/feed.xml');
    console.log('   ⏰ Check interval: Every 5 minutes');
    console.log('   🏷️  Filter: Crypto/blockchain related posts only');
  } catch (error) {
    console.warn('⚠️  Vitalik RSS feed not registered:', error instanceof Error ? error.message : String(error));
  }
  
  console.log("✅ Merged AgenticPlatform setup complete!");
  console.log("💡 Key improvements:");
  console.log("  ✅ Unified agent and workflow management");
  console.log("  ✅ Centralized routing logic");
  console.log("  ✅ Simplified architecture");
  console.log("  ✅ Better separation of concerns");
  console.log("\n🔧 Try asking questions like:");
  console.log("  - 'What's the weather in San Francisco?' (→ Oracle)");
  console.log("  - 'Analyze this startup: [description]' (→ Analyst)");
  console.log("  - 'Should I buy this token?' (→ Degen)");
  console.log("  - 'Search for information about AI trends' (→ Oracle)");
  console.log("  - 'Evaluate the market potential of this project' (→ Analyst)");
  console.log("  - 'How do I make an onchain transaction?' (→ Degen)");
  console.log("  - 'Create a task: Build a web app' (→ Analyst via MCP)");
  console.log("  - 'Get project statistics' (→ Oracle via MCP)");
  console.log("  - 'Generate task suggestions for mobile app' (→ Analyst via MCP)");
  console.log("  - 'Calculate 15 * 23' (→ Oracle via Math MCP)");
  console.log("  - 'What is the square root of 144?' (→ Oracle via Math MCP)");
  console.log("  - 'What is the weather in Tokyo?' (→ Oracle via Weather MCP)");
  console.log("  - 'EFP related queries' (→ Degen via EFP MCP)");
  console.log("\n📰 Event Sources:");
  console.log("  - Vitalik's blog RSS feed (monitoring for new crypto posts)");
  console.log("  - New posts will automatically trigger agent analysis\n");
  
  await platform.start();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
