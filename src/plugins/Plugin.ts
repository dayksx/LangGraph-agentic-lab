import { DynamicTool } from "@langchain/core/tools";

export interface PluginConfig {
  name: string;
  description: string;
  version: string;
}

export interface Plugin {
  config: PluginConfig;
  tools: any[];
  
  initialize(): Promise<void>;
  cleanup(): Promise<void>;
} 