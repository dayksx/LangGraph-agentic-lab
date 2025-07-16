# LangChain Agentic Platform with MCP Integration

A modular agentic platform with multi-agent coordination and Model Context Protocol (MCP) integration for connecting AI agents to external tools and services.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- Python 3.8+
- pnpm (recommended) or npm

### Installation

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd langchain-agent
pnpm install
```

2. **Install MCP server dependencies:**
```bash
cd mcp_servers
pip install -r requirements.txt
cd ..
```

3. **Set up environment variables:**
```bash
cp .env.example .env
# Edit .env with your API keys and configuration
```

### Running the Platform

#### Option 1: Full Agentic Platform (Recommended)
```bash
# Build the project
pnpm run build

# Start the platform with MCP integration
pnpm start
```

This will start the full AgenticPlatform with:
- Coordinator agent for intelligent routing
- Multiple specialized agents (Oracle, Analyst, Degen)
- MCP plugins for external tools
- Terminal client for interaction

#### Option 2: Development Mode
```bash
# Run in development mode with hot reload
pnpm run dev
```

## 🔧 MCP Server Management

### Available MCP Servers

The platform includes several pre-configured MCP servers:

#### 1. Math Server
**Location:** `mcp_servers/math_server.py`
**Tools:** Basic arithmetic, power, square root, expression evaluation

**Manual Testing:**
```bash
cd mcp_servers
python math_server.py
# Server runs on stdio transport (no manual interaction needed)
```

#### 2. Task Management Server
**Location:** `mcp_servers/task_management_server.py`
**Tools:** Create tasks, list tasks, get statistics, generate suggestions

**Manual Testing:**
```bash
cd mcp_servers
python task_management_server.py
# Server runs on stdio transport
```

#### 3. Weather Server
**Location:** `mcp_servers/weather_server.py`
**Tools:** Get weather, forecasts, temperature, alerts

**Manual Testing:**
```bash
cd mcp_servers
python weather_server.py
# Server runs on SSE transport (requires web server)
```

### Starting MCP Servers Manually

#### For stdio transport (Math & Task Management):
```bash
cd mcp_servers
python math_server.py &
python task_management_server.py &
```

#### For SSE transport (Weather):
```bash
cd mcp_servers
python weather_server.py &
# Server will be available at http://localhost:8000/sse
```

### Testing MCP Servers

You can test the MCP integration directly:

```bash
# Test MCP plugin functionality
pnpm run build
node dist/examples/test_mcp_plugin.js
```

## 🤖 Using the Agentic Platform

### Starting the Platform

```bash
# Build and start
pnpm run build && pnpm start
```

### Available Commands

Once the platform is running, you can interact with it through the terminal client:

#### General Knowledge (Oracle Agent)
- `"What's the weather in San Francisco?"`
- `"Search for information about AI trends"`
- `"Calculate 15 * 23"` (via Math MCP)
- `"What is the square root of 144?"` (via Math MCP)

#### Analysis (Analyst Agent)
- `"Analyze this startup: [description]"`
- `"Evaluate the market potential of this project"`
- `"Create a task: Build a web app"` (via Task MCP)
- `"Generate task suggestions for mobile app"` (via Task MCP)

#### Crypto/Blockchain (Degen Agent)
- `"Should I buy this token?"`
- `"How do I make an onchain transaction?"`

#### Task Management (via MCP)
- `"Create a task: Implement user authentication, high priority"`
- `"Get all tasks"`
- `"Show project statistics"`
- `"Complete task 1"`

#### Math Operations (via MCP)
- `"Calculate 3 + 5"`
- `"What is 10 to the power of 3?"`
- `"Calculate the square root of 256"`
- `"Evaluate expression: (15 + 7) * 3"`

### Agent Routing

The platform automatically routes your requests to the most appropriate agent:

- **Oracle**: General knowledge, searches, math operations
- **Analyst**: Financial analysis, startup evaluation, task management
- **Degen**: Crypto trading, onchain transactions

## 📁 Project Structure

```
langchain-agent/
├── src/
│   ├── core/                 # Core agent and workflow logic
│   ├── plugins/              # Plugin system including MCP
│   ├── clients/              # Client interfaces
│   ├── config/               # Configuration files
│   └── examples/             # Example implementations
├── mcp_servers/              # MCP server implementations
│   ├── math_server.py        # Math operations server
│   ├── task_management_server.py  # Task management server
│   ├── weather_server.py     # Weather information server
│   └── requirements.txt      # Python dependencies
├── docs/                     # Documentation
└── dist/                     # Compiled JavaScript
```

## 🔌 MCP Plugin Configuration

### Using Factory Methods

```typescript
import { MCPPluginFactory } from './plugins/MCPPlugin.js';

// Quick setup for common servers
const mathMCP = MCPPluginFactory.createMathPlugin();
const taskMCP = MCPPluginFactory.createTaskManagementPlugin();
const weatherMCP = MCPPluginFactory.createWeatherPlugin();
```

### Custom Configuration

```typescript
import { MCPPlugin } from './plugins/MCPPlugin.js';

const customMCP = new MCPPlugin({
  name: 'my_mcp',
  description: 'Custom MCP plugin',
  servers: [
    {
      name: 'my_server',
      command: 'python',
      args: ['./mcp_servers/my_server.py'],
      transport: 'stdio'
    }
  ]
});
```

## 🛠️ Development

### Building the Project

```bash
# Build TypeScript to JavaScript
pnpm run build

# Watch mode for development
pnpm run build -- --watch
```

### Running Examples

```bash
# MCP plugin examples
node dist/examples/mcp_plugin_example.js

# Test MCP functionality
node dist/examples/test_mcp_plugin.js

# Coordinator agent example
node dist/examples/coordinator_agent.js
```

### Creating Custom MCP Servers

1. **Create a new server file:**
```python
#!/usr/bin/env python3
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("MyServer")

@mcp.tool()
def my_tool(input: str) -> str:
    """My custom tool."""
    return f"Processed: {input}"

if __name__ == "__main__":
    mcp.run(transport="stdio")
```

2. **Add to your plugin configuration:**
```typescript
const customMCP = new MCPPlugin({
  name: 'custom_mcp',
  servers: [{
    name: 'my_server',
    command: 'python',
    args: ['./mcp_servers/my_server.py'],
    transport: 'stdio'
  }]
});
```

## 🐛 Troubleshooting

### Common Issues

1. **MCP Server Connection Failed**
   - Ensure Python dependencies are installed: `pip install -r mcp_servers/requirements.txt`
   - Check server file permissions: `chmod +x mcp_servers/*.py`
   - Verify server paths are correct

2. **OpenAI API Quota Exceeded**
   - Add credits to your OpenAI account
   - Or switch to a different model in the configuration

3. **Build Errors**
   - Ensure TypeScript is installed: `pnpm add -g typescript`
   - Clean and rebuild: `rm -rf dist && pnpm run build`

### Debug Mode

Enable debug logging:

```bash
# Set debug environment variable
DEBUG=true pnpm start
```

### Logs

Check the console output for:
- MCP server connection status
- Tool loading information
- Agent routing decisions
- Error messages

## 📚 Documentation

- [MCP Plugin Guide](docs/MCP_PLUGIN_GUIDE.md) - Detailed MCP integration guide
- [Agent Configuration](docs/AGENT_CONFIG.md) - Agent setup and configuration
- [Plugin Development](docs/PLUGIN_DEVELOPMENT.md) - Creating custom plugins

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 🆘 Support

For issues and questions:
1. Check the troubleshooting section
2. Review the documentation
3. Open an issue on GitHub

---

**Happy coding with your AI agents! 🤖✨** 