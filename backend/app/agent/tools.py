AGENT_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "execute_python",
            "description": "Execute valid Python code. Data is pre-loaded in 'df'. Use standard print() statements for output. Supports pandas, matplotlib, and seaborn.",
            "parameters": {
                "type": "object",
                "properties": {
                    "code": {
                        "type": "string",
                        "description": "A single string containing valid Python code to execute."
                    },
                    "description": {
                        "type": "string",
                        "description": "Brief summary of the code's purpose."
                    }
                },
                "required": ["code", "description"]
            }
        }
    }
]
