#!/usr/bin/env node
/**
 * Test MCP Plugin
 * Simple test to verify MCP plugin functionality
 */

import { MCPPlugin, MCPPluginFactory } from '../plugins/MCPPlugin.js';

async function testMCPPlugin() {
  console.log("🧪 Testing MCP Plugin...\n");

  try {
    // Test 1: Math MCP Plugin
    console.log("📊 Test 1: Math MCP Plugin");
    const mathMCP = MCPPluginFactory.createMathPlugin();
    await mathMCP.initialize();
    
    const mathStatus = mathMCP.getServerStatus();
    console.log("Math MCP Status:", mathStatus);
    
    const mathTools = mathMCP.getAvailableTools();
    console.log("Math Tools:", mathTools.map(t => t.name));
    console.log("✅ Math MCP Plugin test completed\n");

    // Test 2: Task Management MCP Plugin
    console.log("📋 Test 2: Task Management MCP Plugin");
    const taskMCP = MCPPluginFactory.createTaskManagementPlugin();
    await taskMCP.initialize();
    
    const taskStatus = taskMCP.getServerStatus();
    console.log("Task MCP Status:", taskStatus);
    
    const taskTools = taskMCP.getAvailableTools();
    console.log("Task Tools:", taskTools.map(t => t.name));
    console.log("✅ Task Management MCP Plugin test completed\n");

    // Test 3: Custom MCP Plugin
    console.log("🔧 Test 3: Custom MCP Plugin");
    const customMCP = new MCPPlugin({
      name: 'test_mcp',
      description: 'Test MCP plugin',
      servers: [
        {
          name: 'math',
          command: 'python',
          args: ['./mcp_servers/math_server.py'],
          transport: 'stdio'
        }
      ]
    });
    
    await customMCP.initialize();
    const customStatus = customMCP.getServerStatus();
    console.log("Custom MCP Status:", customStatus);
    console.log("✅ Custom MCP Plugin test completed\n");

    // Test 4: Dynamic Server Addition
    console.log("➕ Test 4: Dynamic Server Addition");
    const dynamicMCP = new MCPPlugin({
      name: 'dynamic_mcp',
      description: 'Dynamic MCP plugin'
    });
    
    console.log("Initial status:", dynamicMCP.getServerStatus());
    
    dynamicMCP.addServer({
      name: 'math',
      command: 'python',
      args: ['./mcp_servers/math_server.py'],
      transport: 'stdio'
    });
    
    await dynamicMCP.initialize();
    console.log("After adding server:", dynamicMCP.getServerStatus());
    console.log("✅ Dynamic Server Addition test completed\n");

    // Cleanup
    await mathMCP.cleanup();
    await taskMCP.cleanup();
    await customMCP.cleanup();
    await dynamicMCP.cleanup();
    
    console.log("🎉 All MCP Plugin tests completed successfully!");

  } catch (error) {
    console.error("❌ MCP Plugin test failed:", error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  testMCPPlugin();
}

export { testMCPPlugin }; 