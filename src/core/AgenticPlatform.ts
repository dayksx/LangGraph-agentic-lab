import 'dotenv/config';
import { Agent, AgentConfig } from './Agent.js';
import { Client } from '../clients/Client.js';
import { Plugin } from '../plugins/Plugin.js';
import { AppConfig, defaultConfig } from '../config/config.js';
import { EventSource } from '../events/EventSource.js';
import { StateGraph, MessagesAnnotation, Annotation } from "@langchain/langgraph";
import { BaseMessage, HumanMessage } from "@langchain/core/messages";
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { OnchainEvent, WebEvent, EventTrigger } from '../types/events.js';

// Type-safe agent routing constants
const AGENT_ROUTES = {
  ORACLE: 'oracle',
  ANALYST: 'analyst', 
  DEGEN: 'degen',
  COORDINATOR: 'coordinator',
  SUMMARIZER: 'summarizer',
  DONE: 'done',
  COMPLETE: 'complete'
} as const;

type AgentRoute = typeof AGENT_ROUTES[keyof typeof AGENT_ROUTES];

// State schema for workflows
const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  selectedAgent: Annotation<string>({
    reducer: (x, y) => y ?? x ?? AGENT_ROUTES.ORACLE,
    default: () => AGENT_ROUTES.ORACLE,
  }),
  eventContext: Annotation<EventTrigger | null>({
    reducer: (x, y) => y ?? x ?? null,
    default: () => null,
  }),
  triggerType: Annotation<'message' | 'event'>({
    reducer: (x, y) => y ?? x ?? 'message',
    default: () => 'message',
  }),
});

export class AgenticPlatform {
  // Core platform components
  private config: AppConfig;
  private clients: Map<string, Client> = new Map();
  private eventSources: Map<string, EventSource> = new Map();
  
  // Agent and workflow management
  private agents: Map<string, Agent> = new Map();
  private workflow: StateGraph<typeof AgentState.State>;
  
  // Routing system
  private selectedAgent: string = AGENT_ROUTES.ORACLE;

  constructor(config: Partial<AppConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    this.workflow = new StateGraph(AgentState);
  }

  // ============================================================================
  // AGENT MANAGEMENT
  // ============================================================================

  /**
   * Register an agent with the platform
   */
  public async registerAgent(name: string, config: AgentConfig): Promise<void> {
    const agent = new Agent(config);
    this.agents.set(name, agent);
    console.log(`✅ Registered agent: ${name}`);
  }

  /**
   * Register a plugin for a specific agent
   */
  /**
   * Register one or more plugins for a specific agent
   */
  public async registerPluginsForAgent(agentName: string, plugins: Plugin | Plugin[]): Promise<void> {
    const agent = this.agents.get(agentName);
    if (!agent) {
      throw new Error(`Agent ${agentName} not found`);
    }

    const pluginArray = Array.isArray(plugins) ? plugins : [plugins];
    await Promise.all(pluginArray.map(plugin => agent.registerPlugin(plugin)));
    
    if (pluginArray.length === 1) {
      console.log(`✅ Registered plugin ${pluginArray[0].config.name} for agent ${agentName}`);
    } else {
      console.log(`✅ ${pluginArray.length} plugin(s) registered for agent '${agentName}': ${pluginArray.map(p => p.config.name).join(', ')}`);
    }
  }

  /**
   * Get an agent by name
   */
  public getAgent(name: string): Agent | undefined {
    return this.agents.get(name);
  }

  // ============================================================================
  // WORKFLOW MANAGEMENT
  // ============================================================================

  /**
   * Define a custom workflow
   */
  public async defineWorkflow(workflowDefinition: (graph: StateGraph<any>) => void): Promise<void> {
    workflowDefinition(this.workflow);
  }

  /**
   * Process a message through the workflow
   */
  public async processMessage(message: BaseMessage): Promise<BaseMessage> {
    const app = this.workflow.compile();
    const result = await app.invoke({ 
      messages: [message],
      selectedAgent: "oracle",
      eventContext: null,
      triggerType: 'message'
    });
    
    return result.messages[result.messages.length - 1];
  }

  /**
   * Process an event through the workflow
   */
  public async processEvent(event: EventTrigger, preferredAgent?: string): Promise<BaseMessage> {
    const app = this.workflow.compile();
    
    let message: HumanMessage;
    let selectedAgent: string;

    switch (event.type) {
      case 'web_event':
        message = new HumanMessage(
          `🌐 WEB EVENT DETECTED 🌐\n\nSource: ${event.source}\nTitle: ${event.title}\n${event.url ? `URL: ${event.url}\n` : ''}\nContent: ${event.content}\n\nPlease analyze this web event and provide insights.`
        );
        selectedAgent = preferredAgent || this.determineAgentForWebEvent(event);
        break;
        
      case 'onchain_event':
        message = new HumanMessage(
          `⛓️ ONCHAIN EVENT DETECTED ⛓️\n\nNetwork: ${event.network}\nEvent Type: ${event.eventType}\n${event.contractAddress ? `Contract: ${event.contractAddress}\n` : ''}${event.transactionHash ? `Tx Hash: ${event.transactionHash}\n` : ''}${event.blockNumber ? `Block: ${event.blockNumber}\n` : ''}\nData: ${JSON.stringify(event.data, null, 2)}\n\nPlease analyze this onchain event and provide insights.`
        );
        selectedAgent = preferredAgent || this.determineAgentForOnchainEvent(event);
        break;
        
      default:
        throw new Error(`Unknown event type: ${(event as any).type}`);
    }

    const result = await app.invoke({ 
      messages: [message],
      selectedAgent,
      eventContext: event,
      triggerType: 'event'
    });
    
    return result.messages[result.messages.length - 1];
  }

  // ============================================================================
  // CLIENT MANAGEMENT
  // ============================================================================

  /**
   * Register a client with the platform
   */
  public async registerClient(client: Client): Promise<void> {
    await client.initialize();
    this.clients.set(client.config.name, client);
    
    client.onMessage(async (message) => {
      const response = await this.processMessage(message);
      
      // Preserve metadata from the original message to the response
      if ((message as any).metadata) {
        (response as any).metadata = (message as any).metadata;
      }
      
      await client.sendMessage(response);
    });
    
    console.log(`✅ Registered client: ${client.config.name}`);
  }

  /**
   * Register an event source with the platform
   */
  public async registerEventSource(eventSource: EventSource): Promise<void> {
    await eventSource.initialize();
    this.eventSources.set(eventSource.config.name, eventSource);
    
    eventSource.onEvent(async (event) => {
      const response = await this.processEvent(event);
      
      // Preserve metadata from the original event to the response
      if (event.metadata) {
        (response as any).metadata = event.metadata;
      }
      
      console.log(`✅ Processed ${event.type} event from ${eventSource.config.name}`);
    });
    
    console.log(`✅ Registered event source: ${eventSource.config.name}`);
  }

  // ============================================================================
  // PLATFORM LIFECYCLE
  // ============================================================================

  /**
   * Start the platform
   */
  public async start(): Promise<void> {
    console.log('🚀 Starting AgenticPlatform...');
    
    // Start all clients
    for (const client of this.clients.values()) {
      await client.start();
    }
    
    // Start all event sources
    for (const eventSource of this.eventSources.values()) {
      await eventSource.start();
    }
    
    console.log('✅ AgenticPlatform started successfully');
  }

  /**
   * Stop the platform
   */
  public async stop(): Promise<void> {
    console.log('🛑 Stopping AgenticPlatform...');
    
    // Stop all clients
    for (const client of this.clients.values()) {
      await client.stop();
    }
    
    // Stop all event sources
    for (const eventSource of this.eventSources.values()) {
      await eventSource.stop();
    }

    // Cleanup agents
    for (const agent of this.agents.values()) {
      await agent.cleanup();
    }
    
    console.log('✅ AgenticPlatform stopped successfully');
  }

  // ============================================================================
  // ROUTING SYSTEM
  // ============================================================================

  /**
   * Clean and validate agent routing response
   */
  private parseAgentRoutingResponse(content: string): AgentRoute {
    const cleanContent = content.toLowerCase().trim();
    
    // Direct matches
    if (Object.values(AGENT_ROUTES).includes(cleanContent as AgentRoute)) {
      return cleanContent as AgentRoute;
    }
    
    // Extract agent name from response
    for (const route of Object.values(AGENT_ROUTES)) {
      if (cleanContent.includes(route)) {
        return route;
      }
    }
    
    // Clean common patterns and try again
    const cleaned = cleanContent
      .replace(/[()\[\]{}]/g, '') // Remove brackets
      .replace(/["']/g, '') // Remove quotes
      .replace(/routing\s+to\s+/i, '') // Remove "routing to"
      .replace(/\s+agent.*$/i, '') // Remove "agent" and anything after
      .replace(/\s*\.\.\..*$/i, '') // Remove "..." and anything after
      .trim();
    
    // Final validation
    if (Object.values(AGENT_ROUTES).includes(cleaned as AgentRoute)) {
      return cleaned as AgentRoute;
    }
    
    console.warn(`⚠️  Invalid agent routing response: "${content}", defaulting to oracle`);
    return AGENT_ROUTES.ORACLE;
  }

  /**
   * Check if workflow should complete
   */
  private isWorkflowComplete(route: AgentRoute): boolean {
    return route === AGENT_ROUTES.DONE || route === AGENT_ROUTES.COMPLETE;
  }

  // ============================================================================
  // EVENT ROUTING LOGIC
  // ============================================================================

  private determineAgentForWebEvent(event: WebEvent): string {
    // Route web events to oracle for general analysis
    return AGENT_ROUTES.ORACLE;
  }

  private determineAgentForOnchainEvent(event: OnchainEvent): string {
    // Route onchain events to degen for blockchain-specific analysis
    return AGENT_ROUTES.DEGEN;
  }

  // ============================================================================
  // COORDINATOR WORKFLOW
  // ============================================================================

  public async defineCoordinatorWorkflow(): Promise<void> {
    // Verify that coordinator and summarizer agents exist
    if (!this.agents.has(AGENT_ROUTES.COORDINATOR)) {
      throw new Error(`Coordinator agent not found. Please register it using platform.registerAgent("${AGENT_ROUTES.COORDINATOR}", config)`);
    }

    if (!this.agents.has(AGENT_ROUTES.SUMMARIZER)) {
      throw new Error(`Summarizer agent not found. Please register it using platform.registerAgent("${AGENT_ROUTES.SUMMARIZER}", config)`);
    }

    await this.defineWorkflow((graph) => {
      graph
        // Coordinator agent node
        .addNode("coordinator", async (state) => {
          const agent = this.getAgent(AGENT_ROUTES.COORDINATOR);
          if (!agent) throw new Error("Coordinator agent not found");
          
          const messages = Array.isArray(state.messages) ? state.messages : [state.messages];
          const response = await agent.processMessage(messages);
          
          // Parse the coordinator's response using the clean parsing method
          const content = typeof response.content === 'string' ? response.content : '';
          const selectedAgent = this.parseAgentRoutingResponse(content);
          
          console.log(`🔍 Coordinator response: "${content}" → ${selectedAgent}`);
          
          this.selectedAgent = selectedAgent;
          
          // Check if workflow is complete
          const isComplete = this.isWorkflowComplete(selectedAgent);
          console.log(isComplete ? `🏁 Coordinator: Workflow complete` : `🔄 Coordinator: Routing to ${selectedAgent} agent`);
          
          return { 
            messages: [response],
            selectedAgent: this.selectedAgent 
          };
        })
        
        // Specialized agent nodes
        .addNode(AGENT_ROUTES.ANALYST, async (state) => {
          const agent = this.getAgent(AGENT_ROUTES.ANALYST);
          if (!agent) throw new Error("Analyst agent not found");
          const messages = Array.isArray(state.messages) ? state.messages : [state.messages];
          const response = await agent.processMessage(messages);
          return { messages: [response] }; 
        })
        
        .addNode(AGENT_ROUTES.DEGEN, async (state) => {
          const agent = this.getAgent(AGENT_ROUTES.DEGEN);
          if (!agent) throw new Error("Degen agent not found");
          const messages = Array.isArray(state.messages) ? state.messages : [state.messages];
          const response = await agent.processMessage(messages);
          return { messages: [response] };
        })
        
        .addNode(AGENT_ROUTES.ORACLE, async (state) => {
          const agent = this.getAgent(AGENT_ROUTES.ORACLE);
          if (!agent) throw new Error("Oracle agent not found");
          const messages = Array.isArray(state.messages) ? state.messages : [state.messages];
          const response = await agent.processMessage(messages);
          return { messages: [response] };
        })
        
        // Summarizer agent node
        .addNode(AGENT_ROUTES.SUMMARIZER, async (state) => {
          const agent = this.getAgent(AGENT_ROUTES.SUMMARIZER);
          if (!agent) throw new Error("Summarizer agent not found");
          
          const allMessages = state.messages || [];
          
          // Filter out routing messages and keep only substantive responses
          const substantiveMessages = allMessages.filter((msg: any) => {
            const content = typeof msg.content === 'string' ? msg.content.toLowerCase() : '';
            return !content.includes("routing to") && 
                   !content.includes("workflow complete") &&
                   !content.includes("fallback") &&
                   (typeof msg.content === 'string' ? msg.content.trim().length > 10 : false);
          });
          
          const response = await agent.processMessage(substantiveMessages);
          
          console.log("📝 Summarizer agent created final response from all agent contributions");
          
          return { 
            messages: [response]
          };
        })
        
        // Routing logic
        .addEdge("__start__", AGENT_ROUTES.COORDINATOR)
        .addConditionalEdges(AGENT_ROUTES.COORDINATOR, (state) => {
          console.log(`🔍 Conditional edges - state.selectedAgent: "${this.selectedAgent}"`);
          
          const lastMessage = state.messages[state.messages.length - 1];
          const content = lastMessage.content.toLowerCase();
          
          if (content.includes("done") || content.includes("complete") || content.includes("finished")) {
            console.log("🏁 Coordinator decided to end workflow - proceeding to summarizer");
            return AGENT_ROUTES.SUMMARIZER;
          }
          
          if (state.messages && state.messages.length > 4) {
            const recentMessages = state.messages.slice(-4);
            const messageContents = recentMessages.map((msg: any) => 
              typeof msg.content === 'string' ? msg.content.toLowerCase().trim() : ''
            );
            
            const routingMessages = messageContents.filter((content: string) => 
              content.includes("routing to") || content.includes("agent")
            );
            
            if (routingMessages.length >= 3) {
              console.log("🔄 Detected routing loop - ending workflow");
              return AGENT_ROUTES.SUMMARIZER;
            }
            
            const uniqueContents = new Set(messageContents.filter((content: string) => content.length > 10));
            if (uniqueContents.size <= 2 && messageContents.length >= 4) {
              console.log("🔄 Detected conversation loop - ending workflow");
              return AGENT_ROUTES.SUMMARIZER;
            }
          }
          
          return this.selectedAgent || AGENT_ROUTES.ORACLE;
        }, {
          [AGENT_ROUTES.ORACLE]: AGENT_ROUTES.ORACLE,
          [AGENT_ROUTES.ANALYST]: AGENT_ROUTES.ANALYST,
          [AGENT_ROUTES.DEGEN]: AGENT_ROUTES.DEGEN,
          [AGENT_ROUTES.SUMMARIZER]: AGENT_ROUTES.SUMMARIZER
        })
        .addEdge(AGENT_ROUTES.ANALYST, AGENT_ROUTES.COORDINATOR)  
        .addEdge(AGENT_ROUTES.DEGEN, AGENT_ROUTES.COORDINATOR)
        .addEdge(AGENT_ROUTES.ORACLE, AGENT_ROUTES.COORDINATOR)
        .addEdge(AGENT_ROUTES.SUMMARIZER, "__end__");
    });
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Get platform status
   */
  public getStatus(): Record<string, any> {
    return {
      agents: Array.from(this.agents.keys()),
      clients: Array.from(this.clients.keys()),
      eventSources: Array.from(this.eventSources.keys()),
      config: this.config
    };
  }
} 