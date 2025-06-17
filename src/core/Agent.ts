import { ChatOpenAI } from "@langchain/openai";
import { MessagesAnnotation, StateGraph } from "@langchain/langgraph";
import { BaseMessage, AIMessage, AIMessageChunk } from "@langchain/core/messages";
import { DynamicTool } from "@langchain/core/tools";
import { z } from "zod";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { Runnable } from "@langchain/core/runnables";
import { ChatOpenAICallOptions } from "@langchain/openai";
import { BaseLanguageModelInput } from "@langchain/core/language_models/base";

export interface AgentConfig {
  modelName: string;
  temperature: number;
  tools: DynamicTool[];
  maxContextMessages?: number;
}

export class Agent {
  private model!: Runnable<BaseLanguageModelInput, AIMessageChunk, ChatOpenAICallOptions>;
  private workflow: any;
  private tools: DynamicTool[];
  private modelConfig: { modelName: string; temperature: number };

  constructor(config: AgentConfig) {
    this.tools = config.tools;
    this.modelConfig = {
      modelName: config.modelName,
      temperature: config.temperature,
    };
    
    // Initialize model with initial tools
    this.initializeModel();
    this.workflow = this.createWorkflow();
  }

  private initializeModel(): void {
    this.model = new ChatOpenAI({
      model: this.modelConfig.modelName,
      temperature: this.modelConfig.temperature,
    }).bindTools(this.tools);
  }

  public addTools(newTools: DynamicTool[]): void {
    this.tools = [...this.tools, ...newTools];
    // Reinitialize model with all tools
    this.initializeModel();
    // Recreate workflow with new tools
    this.workflow = this.createWorkflow();
  }

  private createWorkflow(): any {
    // Create the workflow with Zod schema
    const workflow = new StateGraph(MessagesAnnotation);
    const toolNode = new ToolNode(this.tools);

    // Define the function that calls the model
    const callModel = async (state: typeof MessagesAnnotation.State) => {
      const response = await this.model.invoke(state.messages);
      return { messages: [response] };
    };

    // Define the router function
    const shouldContinue = (state: any) => {
      const lastMessage = state.messages[state.messages.length - 1] as AIMessage;
      if (lastMessage.tool_calls?.length) {
        return "tools";
      }
      return "__end__";
    };

    // Add nodes and edges
    workflow
      .addNode("agent", callModel)
      .addEdge("__start__", "agent")
      .addNode("tools", toolNode)
      .addEdge("tools", "agent")
      .addConditionalEdges("agent", shouldContinue);

    return workflow;
  }

  public async processMessage(messages: BaseMessage[]) {
    const app = this.workflow.compile();
    const finalState = await app.invoke({ messages });
    return finalState.messages[finalState.messages.length - 1];
  }
} 