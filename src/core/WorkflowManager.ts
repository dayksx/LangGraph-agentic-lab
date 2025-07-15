import { StateGraph, MessagesAnnotation, Annotation } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";
import { Agent } from "./Agent.js";
import { AgentConfig } from "./Agent.js";
import { Plugin } from "../plugins/Plugin.js";

// Define custom state schema with selectedAgent
const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  selectedAgent: Annotation<string>({
    reducer: (x, y) => y ?? x ?? "oracle",
    default: () => "oracle",
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
  
  async processMessage(message: BaseMessage) {
    const app = this.workflow.compile();
    const result = await app.invoke({ 
      messages: [message],
      selectedAgent: "oracle"
    });
    
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

// Export the state type for use in other files
export type AgentStateType = typeof MessagesAnnotation.State; 