import 'dotenv/config';
import { Agent, AgentConfig } from './core/Agent.js';
import { Client } from './clients/Client.js';
import { Plugin } from './plugins/Plugin.js';
import { AppConfig, defaultConfig } from './config/config.js';
import { agentPersonas } from './config/personas.js';
import { SearchPlugin } from './plugins/SearchPlugin.js';
import { TerminalClient } from './clients/TerminalClient.js';
import { ERC20Plugin } from './plugins/ERC20Plugin.js';
import { StartupEvaluationPlugin } from './plugins/StartupEvaluationPlugin.js';
import { AttestationPlugin } from './plugins/AttestationPlugin.js';
import { WorkflowManager } from './core/WorkflowManager.js';
import { StateGraph } from '@langchain/langgraph';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts.js';
import { ChatOpenAI } from '@langchain/openai';

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
    platform.registerPluginForAgent("analyst", new StartupEvaluationPlugin()),
    platform.registerPluginForAgent("degen", new ERC20Plugin()),
    platform.registerPluginForAgent("degen", new AttestationPlugin()),
    platform.registerPluginForAgent("oracle", new SearchPlugin())
  ]);
  
  // Define the workflow
  await platform.defineWorkflow((graph) => {
    graph
      .addNode("Analyst", async (state) => {
        // The Analyst agent is able to evaluate any web3 startups, protocols and tokens
        const agent = platform.getAgent("analyst");
        if (!agent) throw new Error("Analyst agent not found");
        const messages = Array.isArray(state.messages) ? state.messages : [state.messages];
        const response = await agent.processMessage(messages);
        return { messages: [response] }; 
      })
      .addNode("Degen", async (state) => {
        // The Degen agent is able to do onchain transactions, reading, and answering questions about web3 startups and tokens, or any other questions that are related to the other agents.
        const agent = platform.getAgent("degen");
        if (!agent) throw new Error("Degen agent not found");
        const messages = Array.isArray(state.messages) ? state.messages : [state.messages];
        const response = await agent.processMessage(messages);
        return { messages: [response] };
      })
      .addNode("Oracle", async (state) => {
        // The Oracle agent is able to answer any questions about everything, and has a knowledge base of all the information in the world.
        const agent = platform.getAgent("oracle");
        if (!agent) throw new Error("Oracle agent not found");
        const messages = Array.isArray(state.messages) ? state.messages : [state.messages];
        const response = await agent.processMessage(messages);
        return { messages: [response] };
      })
      // Example workflow: start with Analyst, then Oracle, then Degen, then end
      .addEdge("__start__", "Analyst")
      .addEdge("__start__", "Oracle")
      .addEdge("__start__", "Degen")
      .addEdge("Analyst", "__end__")
      .addEdge("Oracle", "__end__")
      .addEdge("Degen", "__end__");
  });
  
  // Register clients
  await platform.registerClient(new TerminalClient());
  
  await platform.start();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
