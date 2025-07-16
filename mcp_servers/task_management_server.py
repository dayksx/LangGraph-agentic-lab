#!/usr/bin/env python3
"""
Task Management MCP Server using FastMCP
Demonstrates task management operations using the FastMCP library
"""

from mcp.server.fastmcp import FastMCP

mcp = FastMCP("TaskManagement")

# In-memory storage for tasks
tasks = []
task_id_counter = 1

@mcp.tool()
def create_task(title: str, description: str, priority: str = "medium") -> str:
    """Create a new task with title, description, and priority"""
    global task_id_counter
    task = {
        "id": task_id_counter,
        "title": title,
        "description": description,
        "priority": priority,
        "status": "pending",
        "created_at": "2024-01-01T00:00:00Z"
    }
    tasks.append(task)
    task_id_counter += 1
    return f"Task created: {task}"

@mcp.tool()
def get_all_tasks() -> str:
    """Get all tasks in the system"""
    return f"All tasks: {tasks}"

@mcp.tool()
def get_project_statistics() -> str:
    """Get project statistics including task counts and completion rates"""
    total_tasks = len(tasks)
    pending_tasks = len([t for t in tasks if t["status"] == "pending"])
    completed_tasks = len([t for t in tasks if t["status"] == "completed"])
    high_priority = len([t for t in tasks if t["priority"] == "high"])
    
    stats = {
        "total_tasks": total_tasks,
        "pending_tasks": pending_tasks,
        "completed_tasks": completed_tasks,
        "high_priority_tasks": high_priority,
        "completion_rate": (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
    }
    return f"Project statistics: {stats}"

@mcp.tool()
def generate_task_suggestions(project_type: str) -> str:
    """Generate task suggestions based on project type"""
    suggestions = {
        "web_app": [
            {"title": "Set up development environment", "description": "Install necessary tools and dependencies", "priority": "high"},
            {"title": "Design database schema", "description": "Plan and create database structure", "priority": "high"},
            {"title": "Create user authentication", "description": "Implement login and registration system", "priority": "medium"},
            {"title": "Design UI/UX", "description": "Create wireframes and mockups", "priority": "medium"},
            {"title": "Set up CI/CD pipeline", "description": "Configure automated testing and deployment", "priority": "low"}
        ],
        "mobile_app": [
            {"title": "Set up mobile development environment", "description": "Install React Native or Flutter", "priority": "high"},
            {"title": "Design app architecture", "description": "Plan app structure and navigation", "priority": "high"},
            {"title": "Create app store assets", "description": "Design icons and screenshots", "priority": "medium"},
            {"title": "Implement push notifications", "description": "Set up notification system", "priority": "medium"},
            {"title": "Test on multiple devices", "description": "Ensure compatibility across devices", "priority": "low"}
        ],
        "api": [
            {"title": "Design API endpoints", "description": "Plan RESTful API structure", "priority": "high"},
            {"title": "Set up authentication", "description": "Implement API key or OAuth", "priority": "high"},
            {"title": "Create API documentation", "description": "Write comprehensive API docs", "priority": "medium"},
            {"title": "Implement rate limiting", "description": "Add request throttling", "priority": "medium"},
            {"title": "Set up monitoring", "description": "Add logging and metrics", "priority": "low"}
        ]
    }
    
    result = suggestions.get(project_type, [])
    return f"Task suggestions for {project_type}: {result}"

@mcp.tool()
def complete_task(task_id: int) -> str:
    """Mark a task as completed"""
    for task in tasks:
        if task["id"] == task_id:
            task["status"] = "completed"
            return f"Task {task_id} marked as completed"
    return f"Task {task_id} not found"

@mcp.tool()
def delete_task(task_id: int) -> str:
    """Delete a task"""
    global tasks
    original_length = len(tasks)
    tasks = [t for t in tasks if t["id"] != task_id]
    if len(tasks) < original_length:
        return f"Task {task_id} deleted"
    return f"Task {task_id} not found"

if __name__ == "__main__":
    mcp.run(transport="stdio") 