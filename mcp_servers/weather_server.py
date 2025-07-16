#!/usr/bin/env python3
"""
Weather MCP Server using FastMCP
Demonstrates weather information using the FastMCP library with SSE transport
"""

from mcp.server.fastmcp import FastMCP
import random

mcp = FastMCP("Weather")

# Mock weather data for demonstration
WEATHER_DATA = {
    "new york": {
        "temperature": "22°C",
        "condition": "Partly Cloudy",
        "humidity": "65%",
        "wind": "15 km/h"
    },
    "london": {
        "temperature": "18°C",
        "condition": "Rainy",
        "humidity": "80%",
        "wind": "25 km/h"
    },
    "tokyo": {
        "temperature": "25°C",
        "condition": "Sunny",
        "humidity": "55%",
        "wind": "10 km/h"
    },
    "sydney": {
        "temperature": "28°C",
        "condition": "Clear",
        "humidity": "45%",
        "wind": "20 km/h"
    },
    "paris": {
        "temperature": "20°C",
        "condition": "Cloudy",
        "humidity": "70%",
        "wind": "12 km/h"
    }
}

@mcp.tool()
async def get_weather(location: str) -> str:
    """Get weather for a specific location."""
    location_lower = location.lower()
    
    if location_lower in WEATHER_DATA:
        weather = WEATHER_DATA[location_lower]
        return f"Weather in {location}: {weather['temperature']}, {weather['condition']}, Humidity: {weather['humidity']}, Wind: {weather['wind']}"
    else:
        # Generate random weather for unknown locations
        conditions = ["Sunny", "Cloudy", "Rainy", "Partly Cloudy", "Clear"]
        temp = random.randint(15, 30)
        humidity = random.randint(40, 90)
        wind = random.randint(5, 30)
        condition = random.choice(conditions)
        
        return f"Weather in {location}: {temp}°C, {condition}, Humidity: {humidity}%, Wind: {wind} km/h"

@mcp.tool()
async def get_forecast(location: str, days: int = 5) -> str:
    """Get weather forecast for a location for the next N days."""
    if days > 7:
        return "Forecast limited to 7 days maximum"
    
    forecast = []
    for day in range(1, days + 1):
        temp = random.randint(15, 30)
        conditions = ["Sunny", "Cloudy", "Rainy", "Partly Cloudy", "Clear"]
        condition = random.choice(conditions)
        forecast.append(f"Day {day}: {temp}°C, {condition}")
    
    return f"Forecast for {location}:\n" + "\n".join(forecast)

@mcp.tool()
async def get_temperature(location: str) -> str:
    """Get current temperature for a location."""
    location_lower = location.lower()
    
    if location_lower in WEATHER_DATA:
        temp = WEATHER_DATA[location_lower]["temperature"]
        return f"Current temperature in {location}: {temp}"
    else:
        temp = random.randint(15, 30)
        return f"Current temperature in {location}: {temp}°C"

@mcp.tool()
async def get_weather_alert(location: str) -> str:
    """Check for weather alerts in a location."""
    # Simulate weather alerts
    alerts = [
        "No weather alerts for this location.",
        "Heavy rain warning in effect.",
        "High wind advisory until 6 PM.",
        "Heat wave warning - stay hydrated.",
        "Frost advisory for tonight."
    ]
    
    alert = random.choice(alerts)
    return f"Weather alert for {location}: {alert}"

if __name__ == "__main__":
    mcp.run(transport="sse") 