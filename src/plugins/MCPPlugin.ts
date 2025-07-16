import { Plugin, PluginConfig } from './Plugin';
import { DynamicTool } from '@langchain/core/tools';
import { MultiServerMCPClient } from '@langchain/mcp-adapters';
import path from 'path';

export interface MCPServerConfig {
  name: string;
  command?: string;
  args?: string[];
  url?: string;
  transport: 'stdio' | 'tcp' | 'websocket' | 'sse';
  env?: Record<string, string>;
  cwd?: string;
}

export interface MCPPluginConfig extends PluginConfig {
  servers: MCPServerConfig[];
  autoConnect?: boolean;
}

export class MCPPlugin implements Plugin {
  private mcpClient: MultiServerMCPClient | null = null;
  private serverConfigs: MCPServerConfig[];
  private autoConnect: boolean;

  public config: MCPPluginConfig;

  constructor(config: Partial<MCPPluginConfig> = {}) {
    this.serverConfigs = config.servers || [];
    this.autoConnect = config.autoConnect ?? true;
    
    this.config = {
      name: config.name || 'mcp',
      description: config.description || 'Generic MCP plugin for connecting to MCP servers',
      version: config.version || '1.0.0',
      servers: this.serverConfigs,
      autoConnect: this.autoConnect
    };
  }

  public tools: any[] = [];

  public async initialize(): Promise<void> {
    if (this.serverConfigs.length === 0) {
      console.warn('⚠️  MCPPlugin: No servers configured');
      return;
    }

    try {
      // Create MCP client configuration using LangGraph's MultiServerMCPClient
      const mcpServers: Record<string, any> = {};
      
      for (const serverConfig of this.serverConfigs) {
        const serverConfigForClient: any = {
          transport: serverConfig.transport
        };

        // Handle different transport types
        if (serverConfig.transport === 'stdio') {
          if (!serverConfig.command || !serverConfig.args) {
            throw new Error(`stdio transport requires command and args for server ${serverConfig.name}`);
          }
          
          serverConfigForClient.command = serverConfig.command;
          serverConfigForClient.args = serverConfig.args.map(arg => {
            // Resolve relative paths to absolute paths
            if (arg.startsWith('./') || arg.startsWith('../')) {
              return path.resolve(arg);
            }
            return arg;
          });
          
          if (serverConfig.env) {
            serverConfigForClient.env = serverConfig.env;
          }
          if (serverConfig.cwd) {
            serverConfigForClient.cwd = serverConfig.cwd;
          }
        } else if (serverConfig.transport === 'sse') {
          if (!serverConfig.url) {
            throw new Error(`sse transport requires url for server ${serverConfig.name}`);
          }
          serverConfigForClient.url = serverConfig.url;
        } else {
          // For tcp and websocket, we'll need to implement additional logic
          // For now, we'll support the basic stdio and sse transports
          throw new Error(`Transport ${serverConfig.transport} not yet supported`);
        }

        mcpServers[serverConfig.name] = serverConfigForClient;
      }

      // Initialize MCP client using LangGraph's MultiServerMCPClient
      this.mcpClient = new MultiServerMCPClient({ mcpServers });

      if (this.autoConnect) {
        await this.connect();
      }

      console.log(`✅ MCPPlugin initialized with ${this.serverConfigs.length} server(s)`);
    } catch (error) {
      console.error('❌ Failed to initialize MCPPlugin:', error);
      throw error;
    }
  }

  public async connect(): Promise<void> {
    if (!this.mcpClient) {
      throw new Error('MCP client not initialized');
    }

    try {
      // Get available tools from all connected servers using LangGraph's client
      // The tools returned by MultiServerMCPClient are already in the correct format
      // and compatible with LangChain's tool system
      this.tools = await this.mcpClient.getTools();

      console.log(`🛠️  MCPPlugin: Loaded ${this.tools.length} tools from MCP servers`);
      
      // Log the specific tools that were loaded
      if (this.tools.length > 0) {
        console.log('📋 Available MCP tools:');
        this.tools.forEach((tool, index) => {
          console.log(`  ${index + 1}. ${tool.name} - ${tool.description || 'No description'}`);
        });
      }

      // Wrap each tool to add logging when it's invoked
      this.tools = this.tools.map(tool => {
        const originalInvoke = tool.invoke.bind(tool);
        tool.invoke = async (...args: any[]) => {
          console.log(`🔧 Using MCP tool: ${tool.name}`);
          console.log(`📥 Input: ${JSON.stringify(args[0].name)}: ${JSON.stringify(args[0].args)}`);
          const result = await originalInvoke(...args);
          
          // Extract content from ToolMessage if available
          let content = 'No content available';
          if (result && typeof result === 'object') {
            if (result.content !== undefined) {
              content = result.content;
            } else if (result.kwargs && result.kwargs.content !== undefined) {
              content = result.kwargs.content;
            }
          }
          
          console.log(`📤 Result: ${JSON.stringify(result)}`);
          console.log(`📄 Content: ${content}`);
          return result;
        };
        return tool;
      });
    } catch (error) {
      console.error('❌ Failed to connect to MCP servers:', error);
      throw error;
    }
  }



  public async disconnect(): Promise<void> {
    if (this.mcpClient) {
      await this.mcpClient.close();
      this.mcpClient = null;
      console.log('🔌 MCPPlugin: Disconnected from MCP servers');
    }
  }

  public async cleanup(): Promise<void> {
    await this.disconnect();
  }

  // Helper method to add a server configuration
  public addServer(serverConfig: MCPServerConfig): void {
    this.serverConfigs.push(serverConfig);
    this.config.servers = this.serverConfigs;
  }

  // Helper method to get available tools
  public getAvailableTools(): any[] {
    return this.tools;
  }

  // Helper method to get server status
  public getServerStatus(): { connected: boolean; serverCount: number; toolCount: number } {
    return {
      connected: this.mcpClient !== null,
      serverCount: this.serverConfigs.length,
      toolCount: this.tools.length
    };
  }

  // Helper method to get the raw MCP client for advanced usage
  public getMCPClient(): MultiServerMCPClient | null {
    return this.mcpClient;
  }
}

// Factory function for common MCP server configurations
export class MCPPluginFactory {
  static createTaskManagementPlugin(): MCPPlugin {
    return new MCPPlugin({
      name: 'task_management_mcp',
      description: 'MCP plugin for task management server',
      servers: [{
        name: 'task_management',
        command: 'python',
        args: ['./mcp_servers/task_management_server.py'],
        transport: 'stdio'
      }]
    });
  }

  static createMathPlugin(): MCPPlugin {
    return new MCPPlugin({
      name: 'math_mcp',
      description: 'MCP plugin for math operations',
      servers: [{
        name: 'math',
        command: 'python',
        args: ['./mcp_servers/math_server.py'],
        transport: 'stdio'
      }]
    });
  }

  static createWeatherPlugin(): MCPPlugin {
    return new MCPPlugin({
      name: 'weather_mcp',
      description: 'MCP plugin for weather information',
      servers: [{
        name: 'weather',
        url: 'http://localhost:8000/sse',
        transport: 'sse'
      }]
    });
  }

  static createFileSystemPlugin(): MCPPlugin {
    return new MCPPlugin({
      name: 'filesystem_mcp',
      description: 'MCP plugin for filesystem operations',
      servers: [{
        name: 'filesystem',
        command: 'python',
        args: ['./mcp_servers/filesystem_server.py'],
        transport: 'stdio'
      }]
    });
  }

  static createEFPPlugin(): MCPPlugin {
    return new MCPPlugin({
      name: 'efp_mcp',
      description: 'MCP plugin for EFP (Ethereum Foundation Protocol) server',
      servers: [{
        name: 'efp',
        url: 'https://efp-mcp.efp.workers.dev/sse',
        transport: 'sse'
      }]
    });
  }

  static createDatabasePlugin(): MCPPlugin {
    return new MCPPlugin({
      name: 'database_mcp',
      description: 'MCP plugin for database operations',
      servers: [{
        name: 'database',
        command: 'python',
        args: ['./mcp_servers/database_server.py'],
        transport: 'stdio'
      }]
    });
  }

  static createCustomPlugin(
    name: string,
    description: string,
    servers: MCPServerConfig[]
  ): MCPPlugin {
    return new MCPPlugin({
      name,
      description,
      servers
    });
  }
} 