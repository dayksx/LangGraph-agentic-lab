#!/bin/bash

# MCP Servers Stop Script
# Stops all running MCP servers

echo "🛑 Stopping MCP Servers..."

# Change to the mcp_servers directory
cd "$(dirname "$0")/../mcp_servers"

# Function to stop a server
stop_server() {
    local server_name=$1
    local pid_file=".${server_name}_server.pid"
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        echo "🛑 Stopping $server_name server (PID: $pid)..."
        
        if kill -0 "$pid" 2>/dev/null; then
            kill "$pid"
            echo "✅ $server_name server stopped"
        else
            echo "⚠️  $server_name server was not running"
        fi
        
        rm -f "$pid_file"
    else
        echo "⚠️  No PID file found for $server_name server"
    fi
}

# Stop all servers
stop_server "math"
stop_server "task_management"
stop_server "weather"

echo ""
echo "🎉 All MCP servers stopped!" 