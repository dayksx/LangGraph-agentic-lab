import { AgentConfig } from "../core/Agent";
import { ClientConfig } from "../clients/Client";
import { PluginConfig } from "../plugins/Plugin";

export interface AppConfig {
  agent: AgentConfig;
  clients: ClientConfig[];
  plugins: PluginConfig[];
}

export const defaultConfig: AppConfig = {
  agent: {
    modelName: "gpt-4",
    temperature: 0,
    tools: [],
    maxContextMessages: 10,
  },
  clients: [],
  plugins: [],
}; 