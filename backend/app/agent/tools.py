AGENT_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "execute_python",
            "description": "Execute python code for data analysis, plotting, and machine learning. Use 'pd' for pandas, 'plt' for matplotlib, and 'sns' for seaborn. State is persistent.",
            "parameters": {
                "type": "object",
                "properties": {
                    "code": {
                        "type": "string",
                        "description": "The python code to execute."
                    },
                    "description": {
                        "type": "string",
                        "description": "A brief description of what this code does."
                    }
                },
                "required": ["code", "description"]
            }
        }
    }
]
