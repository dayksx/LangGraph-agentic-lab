import 'dotenv/config';
import { Agent, AgentConfig } from './core/Agent.js';
import { Client } from './clients/Client.js';
import { Plugin } from './plugins/Plugin.js';
import { AppConfig, defaultConfig } from './config/config.js';
import { SearchPlugin } from './plugins/SearchPlugin.js';
import { TerminalClient } from './clients/TerminalClient.js';
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { ChatOpenAI } from "@langchain/openai";
import { MemorySaver } from "@langchain/langgraph";
import { HumanMessage, BaseMessage } from "@langchain/core/messages";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { DynamicTool, tool } from "@langchain/core/tools";
import { ERC20Plugin } from './plugins/ERC20Plugin.js';
import { StartupEvaluationPlugin } from './plugins/StartupEvaluationPlugin.js';
import { AttestationPlugin } from './plugins/AttestationPlugin.js';
import { WorkflowManager } from './core/WorkflowManager.js';
import { StateGraph } from '@langchain/langgraph';

export class AgenticPlatform {
  private workflowManager: WorkflowManager;
  private clients: Map<string, Client> = new Map();
  private config: AppConfig;

  constructor(config: Partial<AppConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    this.workflowManager = new WorkflowManager();
  }

  public async registerAgent(name: string, config: AgentConfig): Promise<void> {
    await this.workflowManager.addAgent(name, config);
  }

  public async registerPluginForAgent(agentName: string, plugin: Plugin): Promise<void> {
    await this.workflowManager.registerPluginForAgent(agentName, plugin);
  }

  public async defineWorkflow(workflowDefinition: (graph: StateGraph<any>) => void): Promise<void> {
    this.workflowManager.defineWorkflow(workflowDefinition);
  }

  public async registerClient(client: Client): Promise<void> {
    await client.initialize();
    this.clients.set(client.config.name, client);
    
    client.onMessage(async (message) => {
      const response = await this.workflowManager.processMessage(message);
      await client.sendMessage(response);
    });
  }

  public async start(): Promise<void> {
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

    // Cleanup workflow manager (which will cleanup all agents and their plugins)
    await this.workflowManager.cleanup();
  }

  // Helper method to get agent for workflow nodes
  public getAgent(name: string) {
    return this.workflowManager.getAgent(name);
  }
}

// Example usage
async function main() {
  const platform = new AgenticPlatform();
  
  // Register agents
  await platform.registerAgent("curator", {
    modelName: "gpt-4",
    temperature: 0.7,
    tools: []
  });
  
  await platform.registerAgent("degen", {
    modelName: "gpt-4",
    temperature: 0.7,
    tools: []
  });
  
  await platform.registerAgent("consultant", {
    modelName: "gpt-4",
    temperature: 0.7,
    tools: []
  });
  
  // Register plugins for specific agents
  await Promise.all([
    platform.registerPluginForAgent("curator", new StartupEvaluationPlugin()),
    platform.registerPluginForAgent("degen", new ERC20Plugin()),
    platform.registerPluginForAgent("consultant", new SearchPlugin())
  ]);
  
  // Define the workflow
  await platform.defineWorkflow((graph) => {
    graph
      .addNode("Curator", async (state) => {
        const agent = platform.getAgent("curator");
        if (!agent) throw new Error("Curator agent not found");
        const messages = Array.isArray(state.messages) ? state.messages : [state.messages];
        const response = await agent.processMessage(messages);
        return { messages: [response] };
      })
      .addNode("Degen", async (state) => {
        const agent = platform.getAgent("degen");
        if (!agent) throw new Error("Degen agent not found");
        const messages = Array.isArray(state.messages) ? state.messages : [state.messages];
        const response = await agent.processMessage(messages);
        return { messages: [response] };
      })
      .addNode("Consultant", async (state) => {
        const agent = platform.getAgent("consultant");
        if (!agent) throw new Error("Consultant agent not found");
        const messages = Array.isArray(state.messages) ? state.messages : [state.messages];
        const response = await agent.processMessage(messages);
        return { messages: [response] };
      })
      // Example workflow: start with Curator, then Consultant, then Degen, then end
      .addEdge("__start__", "Curator")
      .addEdge("Curator", "Consultant")
      .addEdge("Consultant", "Degen")
      .addEdge("Degen", "__end__");
  });
  
  // Register clients
  await platform.registerClient(new TerminalClient());
  
  await platform.start();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
