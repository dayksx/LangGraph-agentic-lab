import { StateGraph, MessagesAnnotation, Annotation } from "@langchain/langgraph";
import { BaseMessage, HumanMessage } from "@langchain/core/messages";
import { Agent } from "./Agent.js";
import { AgentConfig } from "./Agent.js";
import { Plugin } from "../plugins/Plugin.js";

// Define event types for different triggers
export interface BreakingNewsEvent {
  type: 'breaking_news';
  source: string;
  headline: string;
  content: string;
  timestamp: Date;
  category?: string;
  urgency?: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, any>;
}

export interface EmergingTrendEvent {
  type: 'emerging_trend';
  topic: string;
  description: string;
  confidence: number; // 0-1
  sources: string[];
  timestamp: Date;
  category?: string;
  impact?: 'low' | 'medium' | 'high';
  metadata?: Record<string, any>;
}

export interface OnchainEvent {
  type: 'onchain_event';
  network: string;
  eventType: string;
  contractAddress?: string;
  transactionHash?: string;
  blockNumber?: number;
  data: any;
  timestamp: Date;
  significance?: 'low' | 'medium' | 'high';
  metadata?: Record<string, any>;
}

export type EventTrigger = BreakingNewsEvent | EmergingTrendEvent | OnchainEvent;

// Define custom state schema with selectedAgent and event context
const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  selectedAgent: Annotation<string>({
    reducer: (x, y) => y ?? x ?? "oracle",
    default: () => "oracle",
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

export class WorkflowManager {
  private agents: Map<string, Agent> = new Map();
  private workflow: StateGraph<typeof AgentState.State>;
  
  constructor() {
    this.workflow = new StateGraph(AgentState);
  }
  
  async addAgent(name: string, config: AgentConfig): Promise<Agent> {
    const agent = new Agent(config);
    this.agents.set(name, agent);
    return agent;
  }

  async registerPluginForAgent(agentName: string, plugin: Plugin): Promise<void> {
    const agent = this.agents.get(agentName);
    if (!agent) {
      throw new Error(`Agent ${agentName} not found`);
    }
    await agent.registerPlugin(plugin);
  }
  
  defineWorkflow(workflowDefinition: (graph: StateGraph<any>) => void): void {
    workflowDefinition(this.workflow);
  }
  
  // Original method for processing messages
  async processMessage(message: BaseMessage) {
    const app = this.workflow.compile();
    const result = await app.invoke({ 
      messages: [message],
      selectedAgent: "oracle",
      eventContext: null,
      triggerType: 'message'
    });
    
    return result.messages[result.messages.length - 1];
  }

  // New method for processing breaking news events
  async processBreakingNews(event: BreakingNewsEvent, preferredAgent?: string) {
    const app = this.workflow.compile();
    
    // Create a message from the breaking news event
    const newsMessage = new HumanMessage(
      `🚨 BREAKING NEWS ALERT 🚨\n\nSource: ${event.source}\nHeadline: ${event.headline}\n\n${event.content}\n\nPlease analyze this breaking news and provide insights.`
    );

    const result = await app.invoke({ 
      messages: [newsMessage],
      selectedAgent: preferredAgent || this.determineAgentForBreakingNews(event),
      eventContext: event,
      triggerType: 'event'
    });
    
    return result.messages[result.messages.length - 1];
  }

  // New method for processing emerging trend events
  async processEmergingTrend(event: EmergingTrendEvent, preferredAgent?: string) {
    const app = this.workflow.compile();
    
    // Create a message from the emerging trend event
    const trendMessage = new HumanMessage(
      `📈 EMERGING TREND DETECTED 📈\n\nTopic: ${event.topic}\nConfidence: ${(event.confidence * 100).toFixed(1)}%\nSources: ${event.sources.join(', ')}\n\nDescription: ${event.description}\n\nPlease analyze this emerging trend and provide insights.`
    );

    const result = await app.invoke({ 
      messages: [trendMessage],
      selectedAgent: preferredAgent || this.determineAgentForEmergingTrend(event),
      eventContext: event,
      triggerType: 'event'
    });
    
    return result.messages[result.messages.length - 1];
  }

  // New method for processing onchain events
  async processOnchainEvent(event: OnchainEvent, preferredAgent?: string) {
    const app = this.workflow.compile();
    
    // Create a message from the onchain event
    const onchainMessage = new HumanMessage(
      `⛓️ ONCHAIN EVENT DETECTED ⛓️\n\nNetwork: ${event.network}\nEvent Type: ${event.eventType}\n${event.contractAddress ? `Contract: ${event.contractAddress}\n` : ''}${event.transactionHash ? `Tx Hash: ${event.transactionHash}\n` : ''}${event.blockNumber ? `Block: ${event.blockNumber}\n` : ''}\nData: ${JSON.stringify(event.data, null, 2)}\n\nPlease analyze this onchain event and provide insights.`
    );

    const result = await app.invoke({ 
      messages: [onchainMessage],
      selectedAgent: preferredAgent || this.determineAgentForOnchainEvent(event),
      eventContext: event,
      triggerType: 'event'
    });
    
    return result.messages[result.messages.length - 1];
  }

  // Generic method for processing any event type
  async processEvent(event: EventTrigger, preferredAgent?: string) {
    switch (event.type) {
      case 'breaking_news':
        return this.processBreakingNews(event, preferredAgent);
      case 'emerging_trend':
        return this.processEmergingTrend(event, preferredAgent);
      case 'onchain_event':
        return this.processOnchainEvent(event, preferredAgent);
      default:
        throw new Error(`Unknown event type: ${(event as any).type}`);
    }
  }

  // Helper methods to determine the best agent for each event type
  private determineAgentForBreakingNews(event: BreakingNewsEvent): string {
    // Route based on news category and urgency
    if (event.category === 'financial' || event.category === 'market') {
      return 'analyst';
    }
    if (event.category === 'crypto' || event.category === 'blockchain') {
      return 'degen';
    }
    if (event.urgency === 'critical' || event.urgency === 'high') {
      return 'analyst'; // High urgency news often needs analysis
    }
    return 'oracle'; // Default to oracle for general news
  }

  private determineAgentForEmergingTrend(event: EmergingTrendEvent): string {
    // Route based on trend category and impact
    if (event.category === 'financial' || event.category === 'market') {
      return 'analyst';
    }
    if (event.category === 'crypto' || event.category === 'defi') {
      return 'degen';
    }
    if (event.impact === 'high') {
      return 'analyst'; // High impact trends need analysis
    }
    return 'oracle'; // Default to oracle for general trends
  }

  private determineAgentForOnchainEvent(event: OnchainEvent): string {
    // Onchain events typically go to the degen agent
    if (event.eventType.includes('transfer') || event.eventType.includes('mint') || event.eventType.includes('burn')) {
      return 'degen';
    }
    if (event.significance === 'high') {
      return 'analyst'; // High significance events might need analysis
    }
    return 'degen'; // Default to degen for onchain events
  }

  async cleanup(): Promise<void> {
    for (const agent of this.agents.values()) {
      await agent.cleanup();
    }
  }

  getAgent(name: string): Agent | undefined {
    return this.agents.get(name);
  }
}

// Export the state type for use in other files
export type AgentStateType = typeof AgentState.State; 