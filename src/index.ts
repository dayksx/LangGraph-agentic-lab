import 'dotenv/config';
import { Agent } from './core/Agent';
import { Client } from './clients/Client';
import { Plugin } from './plugins/Plugin';
import { AppConfig, defaultConfig } from './config/config';
import { SearchPlugin } from './plugins/SearchPlugin';
import { TerminalClient } from './clients/TerminalClient';
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { ChatOpenAI } from "@langchain/openai";
import { MemorySaver } from "@langchain/langgraph";
import { HumanMessage } from "@langchain/core/messages";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { DynamicTool, tool } from "@langchain/core/tools";
import { ERC20Plugin } from './plugins/ERC20Plugin';

export class AgenticPlatform {
  private agent: Agent;
  private clients: Map<string, Client> = new Map();
  private plugins: Map<string, Plugin> = new Map();
  private config: AppConfig;

  constructor(config: Partial<AppConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    this.agent = new Agent(this.config.agent);
  }

  public async registerClient(client: Client): Promise<void> {
    await client.initialize();
    this.clients.set(client.config.name, client);
    
    client.onMessage(async (message) => {
      const response = await this.agent.processMessage([message]);
      await client.sendMessage(response);
    });
  }

  public async registerPlugin(plugin: Plugin): Promise<void> {
    await plugin.initialize();
    this.plugins.set(plugin.config.name, plugin);
    // Add plugin tools to the agent
    this.agent.addTools(plugin.tools);
  }

  public async start(): Promise<void> {
  // Initialize all plugins
  for (const plugin of this.plugins.values()) {
    await plugin.initialize();
  }

  // Start all clients
  for (const client of this.clients.values()) {
    await client.start();
  }


  }

  public async stop(): Promise<void> {
    // Stop all clients
    for (const client of this.clients.values()) {
      await client.stop();
    }

    // Cleanup all plugins
    for (const plugin of this.plugins.values()) {
      await plugin.cleanup();
    }
  }
}

// Example usage
async function main() {
  const platform = new AgenticPlatform();
  
  // Register clients and plugins
  await platform.registerClient(new TerminalClient());
  await Promise.all([
    platform.registerPlugin(new SearchPlugin()),
    platform.registerPlugin(new ERC20Plugin())
  ]);
  
  await platform.start();
}

if (require.main === module) {
  main().catch(console.error);
}
