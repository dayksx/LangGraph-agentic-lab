#!/bin/bash

# MCP Servers Launcher Script
# Launches all MCP servers in the background

echo "🚀 Launching MCP Servers..."

# Change to the mcp_servers directory
cd "$(dirname "$0")/../mcp_servers"

# Check if Python is available
if ! command -v python &> /dev/null; then
    echo "❌ Python is not installed or not in PATH"
    exit 1
fi

# Check if required packages are installed
if ! python -c "import mcp" &> /dev/null; then
    echo "❌ MCP package not found. Installing dependencies..."
    pip install -r requirements.txt
fi

# Function to launch a server
launch_server() {
    local server_name=$1
    local server_file=$2
    local transport=$3
    
    echo "📡 Starting $server_name server ($server_file)..."
    
    if [ -f "$server_file" ]; then
        # Make sure the file is executable
        chmod +x "$server_file"
        
        # Launch the server in the background
        python "$server_file" &
        local pid=$!
        
        # Store the PID for later cleanup
        echo $pid > ".${server_name}_server.pid"
        
        echo "✅ $server_name server started (PID: $pid)"
    else
        echo "❌ Server file not found: $server_file"
    fi
}

# Launch all servers
echo "🔧 Launching stdio transport servers..."

# Math server
launch_server "math" "math_server.py" "stdio"

# Task management server
launch_server "task_management" "task_management_server.py" "stdio"

# Weather server (SSE transport)
echo "🌤️  Launching SSE transport server..."
launch_server "weather" "weather_server.py" "sse"

echo ""
echo "🎉 All MCP servers launched!"
echo ""
echo "📊 Server Status:"
echo "  - Math Server: $(cat .math_server.pid 2>/dev/null || echo 'Not running')"
echo "  - Task Management Server: $(cat .task_management_server.pid 2>/dev/null || echo 'Not running')"
echo "  - Weather Server: $(cat .weather_server.pid 2>/dev/null || echo 'Not running')"
echo ""
echo "💡 To stop all servers, run: ./scripts/stop_mcp_servers.sh"
echo "💡 To check server status, run: ./scripts/status_mcp_servers.sh"
echo ""
echo "🔗 Weather server available at: http://localhost:8000/sse"
echo "📝 Math and Task servers running on stdio transport" 