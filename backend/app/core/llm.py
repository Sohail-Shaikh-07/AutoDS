from openai import AsyncOpenAI
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class LLMService:
    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=settings.DEEPINFRA_API_KEY,
            base_url=settings.DEEPINFRA_BASE_URL
        )
        self.model = settings.LLM_MODEL

    async def get_response(self, messages: list, tools: list = None, stream: bool = False):
        """
        Wrapper to call DeepInfra LLM (GLM-4.7)
        """
        try:
            logger.info(f"Sending request to LLM: {self.model}")
            
            # Prepare arguments
            kwargs = {
                "model": self.model,
                "messages": messages,
                "temperature": 0.1, # Lower for better logic/code generation
                "stream": stream
            }
            
            if tools:
                kwargs["tools"] = tools
                kwargs["tool_choice"] = "auto"

            response = await self.client.chat.completions.create(**kwargs)
            return response
            
        except Exception as e:
            logger.error(f"Error calling LLM: {str(e)}")
            raise e

llm_client = LLMService()
