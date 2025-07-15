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
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { ChatOpenAI } from '@langchain/openai';
import { AIMessage } from '@langchain/core/messages';

export class AgenticPlatform {
  private workflowManager: WorkflowManager;
  private clients: Map<string, Client> = new Map();
  private config: AppConfig;
  private routingChain: any;
  private selectedAgent: string = "oracle"; // Store selected agent

  constructor(config: Partial<AppConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    this.workflowManager = new WorkflowManager();
    this.initializeCoordinatorRouting();
  }

  private initializeCoordinatorRouting(): void {
    // Create the routing prompt for the coordinator
    const routingPrompt = ChatPromptTemplate.fromMessages([
      ["system", `You are an expert coordinator agent responsible for routing requests to the most appropriate specialized agent. 
      Based on the user's request, determine which agent should handle it and respond ONLY with the agent name.

      Available agents:
      - "oracle": For general knowledge questions, searches, research, and broad inquiries
      - "analyst": For financial analysis, startup evaluation, market research, and data-driven insights
      - "degen": For crypto trading, onchain transactions, token analysis, and high-risk opportunities

      Routing guidelines:
      - If the request involves general knowledge, searches, or broad questions → "oracle"
      - If the request involves financial analysis, startup evaluation, or market research → "analyst"  
      - If the request involves crypto trading, onchain transactions, or token analysis → "degen"
      
      Respond with ONLY one of: "oracle", "analyst", or "degen". No explanations or additional text.`],
      new MessagesPlaceholder("messages"),
    ]);

    const routingModel = new ChatOpenAI({
      model: "gpt-4o-mini",
      temperature: 0,
    });

    this.routingChain = routingPrompt.pipe(routingModel);
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

  // Method to define coordinator workflow with intelligent routing
  public async defineCoordinatorWorkflow(): Promise<void> {
    await this.defineWorkflow((graph) => {
      graph
        // Main coordinator node that decides which agent to use
        .addNode("Coordinator", async (state) => {
          try {
            const result = await this.routingChain.invoke({ messages: state.messages });
            this.selectedAgent = result.content.toLowerCase().trim();
            
            console.log(`🔄 Coordinator: Routing to ${this.selectedAgent} agent`);
            console.log(`🔍 Debug - selectedAgent value: "${this.selectedAgent}" (length: ${this.selectedAgent.length})`);
            
            // Return the selected agent name in the state
            return { 
              messages: [new AIMessage(`Routing to ${this.selectedAgent} agent...`)],
              selectedAgent: this.selectedAgent 
            };
          } catch (error) {
            console.error("Routing error:", error);
            this.selectedAgent = "oracle";
            return { 
              messages: [new AIMessage("Routing to oracle agent (fallback)...")],
              selectedAgent: this.selectedAgent 
            };
          }
        })
        
        // Specialized agent nodes using the existing platform.getAgent() method
        .addNode("analyst", async (state) => {
          const agent = this.getAgent("analyst");
          if (!agent) throw new Error("Analyst agent not found");
          const messages = Array.isArray(state.messages) ? state.messages : [state.messages];
          const response = await agent.processMessage(messages);
          return { messages: [response] }; 
        })
        
        .addNode("degen", async (state) => {
          const agent = this.getAgent("degen");
          if (!agent) throw new Error("Degen agent not found");
          const messages = Array.isArray(state.messages) ? state.messages : [state.messages];
          const response = await agent.processMessage(messages);
          return { messages: [response] };
        })
        
        .addNode("oracle", async (state) => {
          const agent = this.getAgent("oracle");
          if (!agent) throw new Error("Oracle agent not found");
          const messages = Array.isArray(state.messages) ? state.messages : [state.messages];
          const response = await agent.processMessage(messages);
          return { messages: [response] };
        })
        
        // Routing logic using conditional edges
        .addEdge("__start__", "Coordinator")
        .addConditionalEdges("Coordinator", (state) => {
          console.log(`🔍 Conditional edges - state.selectedAgent: "${this.selectedAgent}"`);
          return this.selectedAgent || "oracle";
        }, {
          "oracle": "oracle",
          "analyst": "analyst",
          "degen": "degen"
        })
        .addEdge("analyst", "__end__")
        .addEdge("degen", "__end__")
        .addEdge("oracle", "__end__");
    });
  }
}

// Example usage with coordinator agent
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
  
  // Define the coordinator workflow with intelligent routing
  await platform.defineCoordinatorWorkflow();
  
  // Register clients
  await platform.registerClient(new TerminalClient());
  
  console.log("✅ Main Coordinator Agent setup complete!");
  console.log("💡 Try asking questions like:");
  console.log("  - 'What's the weather in San Francisco?' (→ Oracle)");
  console.log("  - 'Analyze this startup: [description]' (→ Analyst)");
  console.log("  - 'Should I buy this token?' (→ Degen)");
  console.log("  - 'Search for information about AI trends' (→ Oracle)");
  console.log("  - 'Evaluate the market potential of this project' (→ Analyst)");
  console.log("  - 'How do I make an onchain transaction?' (→ Degen)\n");
  
  await platform.start();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
