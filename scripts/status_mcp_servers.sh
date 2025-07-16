#!/bin/bash

# MCP Servers Status Script
# Shows the status of all MCP servers

echo "📊 MCP Servers Status"
echo "===================="

# Change to the mcp_servers directory
cd "$(dirname "$0")/../mcp_servers"

# Function to check server status
check_server() {
    local server_name=$1
    local pid_file=".${server_name}_server.pid"
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            echo "✅ $server_name server: RUNNING (PID: $pid)"
        else
            echo "❌ $server_name server: STOPPED (stale PID file)"
            rm -f "$pid_file"
        fi
    else
        echo "❌ $server_name server: NOT RUNNING"
    fi
}

# Check all servers
check_server "math"
check_server "task_management"
check_server "weather"

echo ""
echo "💡 To start all servers: ./scripts/launch_mcp_servers.sh"
echo "💡 To stop all servers: ./scripts/stop_mcp_servers.sh" 