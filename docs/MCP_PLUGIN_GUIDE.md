# MCP Plugin Guide

The MCP (Model Context Protocol) Plugin provides a generic interface for connecting your AI agents to any MCP server using LangGraph's built-in MCP integration. This allows your agents to access external tools and services through a standardized protocol with minimal configuration.

## Overview

The MCP Plugin is designed to be flexible and configurable, allowing you to:
- Connect to multiple MCP servers simultaneously
- Configure different transport methods (stdio, tcp, websocket)
- Set custom environment variables and working directories
- Dynamically add servers at runtime
- Use factory methods for common server configurations

## Quick Start

### 1. Install Dependencies

First, install the MCP server dependencies:

```bash
npm run mcp:setup
```

### 2. Basic Usage

The MCP Plugin leverages LangGraph's `MultiServerMCPClient` for seamless integration:

```typescript
import { MCPPlugin, MCPPluginFactory } from './plugins/MCPPlugin.js';

// Using factory method for common servers
const taskManagementMCP = MCPPluginFactory.createTaskManagementPlugin();
await platform.registerPluginForAgent("analyst", taskManagementMCP);

// Or create a custom configuration
const customMCP = new MCPPlugin({
  name: 'my_mcp',
  description: 'My custom MCP plugin',
  servers: [
    {
      name: 'my_server',
      command: 'python',
      args: ['./mcp_servers/my_server.py'],
      transport: 'stdio'
    }
  ]
});
await platform.registerPluginForAgent("oracle", customMCP);
```

## Configuration Options

### MCPPluginConfig

```typescript
interface MCPPluginConfig {
  name: string;                    // Plugin name
  description: string;             // Plugin description
  version: string;                 // Plugin version
  servers: MCPServerConfig[];      // Array of server configurations
  autoConnect?: boolean;           // Auto-connect on initialization (default: true)
}
```

### MCPServerConfig

```typescript
interface MCPServerConfig {
  name: string;                    // Server name (must be unique)
  command?: string;                // Command to run the server (for stdio)
  args?: string[];                 // Command arguments (for stdio)
  url?: string;                    // Server URL (for sse/tcp/websocket)
  transport: 'stdio' | 'tcp' | 'websocket' | 'sse';  // Transport method
  env?: Record<string, string>;    // Environment variables
  cwd?: string;                    // Working directory
}
```

## Examples

### Example 1: Task Management Server

```typescript
const taskManagementMCP = MCPPluginFactory.createTaskManagementPlugin();
await platform.registerPluginForAgent("analyst", taskManagementMCP);
```

This creates a plugin that connects to the task management server and provides tools for:
- Creating tasks
- Listing all tasks
- Getting project statistics
- Generating task suggestions

### Example 1b: Math Server

```typescript
const mathMCP = MCPPluginFactory.createMathPlugin();
await platform.registerPluginForAgent("oracle", mathMCP);
```

This creates a plugin that connects to the math server and provides tools for:
- Basic arithmetic operations (add, subtract, multiply, divide)
- Power and square root calculations
- Expression evaluation

### Example 2: Multiple Servers

```typescript
const multiServerMCP = new MCPPlugin({
  name: 'multi_server_mcp',
  description: 'MCP plugin with multiple servers',
  servers: [
    {
      name: 'task_management',
      command: 'python',
      args: ['./mcp_servers/task_management_server.py'],
      transport: 'stdio'
    },
    {
      name: 'filesystem',
      command: 'python',
      args: ['./mcp_servers/filesystem_server.py'],
      transport: 'stdio'
    }
  ]
});
```

### Example 3: Custom Configuration

```typescript
const advancedMCP = new MCPPlugin({
  name: 'advanced_mcp',
  description: 'Advanced MCP plugin with custom settings',
  autoConnect: false, // Don't connect automatically
  servers: [
    {
      name: 'my_server',
      command: 'python',
      args: ['./mcp_servers/my_server.py'],
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
```

### Example 4: Dynamic Server Addition

```typescript
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
```

## Available Factory Methods

The `MCPPluginFactory` provides pre-configured plugins for common use cases:

### createTaskManagementPlugin()
Creates a plugin for task management operations.

### createMathPlugin()
Creates a plugin for mathematical operations.

### createWeatherPlugin()
Creates a plugin for weather information (requires SSE server).

### createFileSystemPlugin()
Creates a plugin for filesystem operations.

### createDatabasePlugin()
Creates a plugin for database operations.

### createCustomPlugin(name, description, servers)
Creates a custom plugin with your own configuration.

## API Reference

### MCPPlugin Methods

#### `initialize(): Promise<void>`
Initializes the MCP client and connects to configured servers.

#### `connect(): Promise<void>`
Manually connects to MCP servers (useful when `autoConnect: false`).

#### `disconnect(): Promise<void>`
Disconnects from all MCP servers.

#### `cleanup(): Promise<void>`
Cleans up resources and disconnects from servers.

#### `addServer(serverConfig: MCPServerConfig): void`
Adds a new server configuration to the plugin.

#### `getAvailableTools(): DynamicTool[]`
Returns all available tools from connected MCP servers.

#### `getServerStatus(): { connected: boolean; serverCount: number; toolCount: number }`
Returns the current status of the MCP plugin.

## Creating Your Own MCP Server

To create a custom MCP server, you can use the FastMCP library for Python, which provides a simple way to define tools and run them as servers. Here's a basic example:

```python
#!/usr/bin/env python3
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("MyServer")

@mcp.tool()
def my_tool(input: str) -> str:
    """My custom tool that processes input."""
    return f"Processed: {input}"

@mcp.tool()
def calculate_something(a: int, b: int) -> int:
    """Calculate something with two numbers."""
    return a + b * 2

if __name__ == "__main__":
    mcp.run(transport="stdio")
```

For SSE transport (useful for web-based servers):

```python
#!/usr/bin/env python3
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("MyWebServer")

@mcp.tool()
async def web_tool(input: str) -> str:
    """A tool that can be called via SSE."""
    return f"Web processed: {input}"

if __name__ == "__main__":
    mcp.run(transport="sse")
```

## Troubleshooting

### Common Issues

1. **Server not found**: Make sure the MCP server file exists and is executable
2. **Connection failed**: Check that the server command and arguments are correct
3. **Tools not available**: Ensure the server implements the `list_tools` and `call_tool` handlers
4. **Permission denied**: Make sure the server file has execute permissions

### Debug Mode

Enable debug mode by setting environment variables:

```typescript
const debugMCP = new MCPPlugin({
  servers: [{
    name: 'debug_server',
    command: 'python',
    args: ['./mcp_servers/debug_server.py'],
    transport: 'stdio',
    env: {
      'DEBUG': 'true',
      'LOG_LEVEL': 'debug'
    }
  }]
});
```

## Best Practices

1. **Use factory methods** for common server types
2. **Set appropriate timeouts** for long-running operations
3. **Handle errors gracefully** in your MCP server implementations
4. **Use environment variables** for configuration
5. **Test your MCP servers** independently before integrating
6. **Monitor server status** using `getServerStatus()`

## Integration with Agentic Platform

The MCP plugin integrates seamlessly with the Agentic Platform:

```typescript
// Register MCP plugin for specific agents
await platform.registerPluginForAgent("analyst", taskManagementMCP);
await platform.registerPluginForAgent("oracle", customMCP);

// The coordinator will automatically route requests to the appropriate agent
// Agents will have access to MCP tools based on their registered plugins
```

This allows your agents to leverage external tools and services while maintaining the platform's intelligent routing and coordination capabilities. 