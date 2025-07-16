#!/usr/bin/env python3
"""
Math MCP Server using FastMCP
Demonstrates basic math operations using the FastMCP library
"""

from mcp.server.fastmcp import FastMCP

mcp = FastMCP("Math")

@mcp.tool()
def add(a: int, b: int) -> int:
    """Add two numbers"""
    return a + b

@mcp.tool()
def subtract(a: int, b: int) -> int:
    """Subtract b from a"""
    return a - b

@mcp.tool()
def multiply(a: int, b: int) -> int:
    """Multiply two numbers"""
    return a * b

@mcp.tool()
def divide(a: float, b: float) -> float:
    """Divide a by b"""
    if b == 0:
        raise ValueError("Cannot divide by zero")
    return a / b

@mcp.tool()
def power(base: float, exponent: float) -> float:
    """Raise base to the power of exponent"""
    return base ** exponent

@mcp.tool()
def square_root(number: float) -> float:
    """Calculate the square root of a number"""
    if number < 0:
        raise ValueError("Cannot calculate square root of negative number")
    return number ** 0.5

@mcp.tool()
def calculate_expression(expression: str) -> float:
    """Calculate the result of a mathematical expression"""
    try:
        # Note: eval can be dangerous, but for this example we'll use it
        # In production, you should use a safer expression parser
        return eval(expression)
    except Exception as e:
        raise ValueError(f"Invalid expression: {expression}. Error: {str(e)}")

if __name__ == "__main__":
    mcp.run(transport="stdio") 