#!/usr/bin/env node
/**
 * MCP Plugin Example
 * Demonstrates how to use the generic MCP plugin with different configurations
 */

import { AgenticPlatform } from '../index.js';
import { MCPPlugin, MCPPluginFactory } from '../plugins/MCPPlugin.js';
import { agentPersonas } from '../config/personas.js';

async function main() {
  console.log("🤖 Starting MCP Plugin Example...\n");

  const platform = new AgenticPlatform();

  // Register agents
  await platform.registerAgent("analyst", {
    modelName: "gpt-4",
    temperature: 0.7,
    tools: [],
    persona: agentPersonas.analyst
  });

  await platform.registerAgent("oracle", {
    modelName: "gpt-4",
    temperature: 0.5,
    tools: [],
    persona: agentPersonas.oracle
  });

  // Example 1: Using the factory method for common MCP servers
  console.log("📦 Example 1: Using MCPPluginFactory");
  const taskManagementMCP = MCPPluginFactory.createTaskManagementPlugin();
  await platform.registerPluginForAgent("analyst", taskManagementMCP);
  console.log("✅ Task management MCP plugin registered for analyst agent\n");

  // Example 1b: Math MCP plugin
  const mathMCP = MCPPluginFactory.createMathPlugin();
  await platform.registerPluginForAgent("oracle", mathMCP);
  console.log("✅ Math MCP plugin registered for oracle agent\n");

  // Example 2: Creating a custom MCP plugin with multiple servers
  console.log("🔧 Example 2: Custom MCP plugin with multiple servers");
  const customMCP = new MCPPlugin({
    name: 'multi_server_mcp',
    description: 'MCP plugin with multiple servers',
    servers: [
      {
        name: 'task_management',
        command: 'python',
        args: ['./mcp_servers/task_management_server.py'],
        transport: 'stdio'
      }
      // You can add more servers here:
      // {
      //   name: 'filesystem',
      //   command: 'python',
      //   args: ['./mcp_servers/filesystem_server.py'],
      //   transport: 'stdio'
      // },
      // {
      //   name: 'database',
      //   command: 'python',
      //   args: ['./mcp_servers/database_server.py'],
      //   transport: 'stdio'
      // }
    ]
  });
  await platform.registerPluginForAgent("oracle", customMCP);
  console.log("✅ Custom MCP plugin registered for oracle agent\n");

  // Example 3: Creating an MCP plugin with custom configuration
  console.log("⚙️  Example 3: MCP plugin with custom configuration");
  const advancedMCP = new MCPPlugin({
    name: 'advanced_mcp',
    description: 'Advanced MCP plugin with custom settings',
    autoConnect: false, // Don't connect automatically
    servers: [
      {
        name: 'task_management',
        command: 'python',
        args: ['./mcp_servers/task_management_server.py'],
        transport: 'stdio',
        env: {
          'PYTHONPATH': './mcp_servers',
          'DEBUG': 'true'
        },
        cwd: './mcp_servers'
      }
    ]
  });

  // Manually connect when ready
  await advancedMCP.initialize();
  await advancedMCP.connect();
  
  // Get server status
  const status = advancedMCP.getServerStatus();
  console.log("📊 Advanced MCP Status:", status);
  
  // Get available tools
  const tools = advancedMCP.getAvailableTools();
  console.log("🛠️  Available tools:", tools.map(t => t.name));
  
  await platform.registerPluginForAgent("analyst", advancedMCP);
  console.log("✅ Advanced MCP plugin registered for analyst agent\n");

  // Example 4: Adding servers dynamically
  console.log("➕ Example 4: Adding servers dynamically");
  const dynamicMCP = new MCPPlugin({
    name: 'dynamic_mcp',
    description: 'MCP plugin with dynamically added servers'
  });

  // Add servers after creation
  dynamicMCP.addServer({
    name: 'task_management',
    command: 'python',
    args: ['./mcp_servers/task_management_server.py'],
    transport: 'stdio'
  });

  await platform.registerPluginForAgent("oracle", dynamicMCP);
  console.log("✅ Dynamic MCP plugin registered for oracle agent\n");

  // Define the coordinator workflow
  await platform.defineCoordinatorWorkflow();

  console.log("🎯 MCP Plugin Examples Complete!");
  console.log("💡 Try these commands:");
  console.log("  - 'Create a task: Implement user authentication, high priority'");
  console.log("  - 'Get all tasks'");
  console.log("  - 'Show project statistics'");
  console.log("  - 'Generate task suggestions for web_app'");
  console.log("  - 'Calculate 15 * 23'");
  console.log("  - 'What is the square root of 144?'");
  console.log("  - 'What tools are available from the MCP servers?'\n");

  // Start the platform
  await platform.start();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { main }; 