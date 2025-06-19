import { StateGraph, MessagesAnnotation } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";
import { Agent } from "./Agent.js";
import { AgentConfig } from "./Agent.js";
import { Plugin } from "../plugins/Plugin.js";

export class WorkflowManager {
  private agents: Map<string, Agent> = new Map();
  private workflow: StateGraph<typeof MessagesAnnotation.State>;
  
  constructor() {
    this.workflow = new StateGraph(MessagesAnnotation);
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
  
  defineWorkflow(workflowDefinition: (graph: StateGraph<typeof MessagesAnnotation.State>) => void): void {
    workflowDefinition(this.workflow);
  }
  
  async processMessage(message: BaseMessage) {
    console.log('Processing message:', message.content);
    console.log('Number of agents:', this.agents.size);
    
    const app = this.workflow.compile();
    const result = await app.invoke({ messages: [message] });
    console.log('Workflow result:', result);
    
    return result.messages[result.messages.length - 1];
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