import os
import json
import asyncio
from typing import AsyncGenerator, Dict, Any

from .base_agent import BaseAgent
from .planner import PlannerAgent
from .reviewer import ReviewerAgent

# We will treat the existing `AutoDSAgent` (or a stripped down version) as the "Coder" logic
# For now, let's keep the core Agent logic here or import it.
# Actually, to avoid circular dependencies and huge refactors, let's make the Orchestrator
# WRAP the existing AutoDSAgent (which is effectively the Coder + Tools).

# BUT, the prompt logic in AutoDSAgent is monolithic.
# We need to inject the "Current Step" into it.


class OrchestratorAgent:
    def __init__(self, coder_agent):
        self.coder = coder_agent  # This is the main AutoDSAgent instance
        self.planner = PlannerAgent()
        self.reviewer = ReviewerAgent()

    async def process_request(
        self, prompt: str
    ) -> AsyncGenerator[Dict[str, Any], None]:
        # 0. Check complexity (Rule based for now)
        is_complex = (
            len(prompt.split()) > 10
            or "plan" in prompt.lower()
            or "analyze" in prompt.lower()
        )

        context_msg = ""
        if hasattr(self.coder, "active_df_path"):
            context_msg = f"Data Loaded: Columns: {self.coder.active_df_columns}"

        if not is_complex:
            # Fast path: Just forward to Coder
            async for msg in self.coder.process_prompt_stream(prompt):
                yield msg
            return

        # 1. PLAN
        yield {
            "type": "thinking",
            "content": "Orchestrator: Request is complex. Asking Planner...",
        }
        plan = await self.planner.create_plan(prompt, context_msg)

        yield {
            "type": "thinking",
            "content": f"Planner: Proposed Plan:\n"
            + "\n".join([f"{i+1}. {s}" for i, s in enumerate(plan)]),
        }

        # 2. EXECUTE LOOP
        for i, step in enumerate(plan):
            yield {"type": "status", "content": f"Step {i+1}/{len(plan)}: {step}"}

            # Forward step to Coder
            # Note: The coder streams updates. We yield them up.
            step_output_buffer = ""
            async for msg in self.coder.process_prompt_stream(
                f"Task: {step}\n(Execute this specific step on the current data state)."
            ):
                if msg["type"] == "response":
                    step_output_buffer += msg["content"]
                yield msg

            # 3. REVIEW (Optional, can enable for critical steps)
            # await self.reviewer.review(...)

        yield {"type": "done", "content": "Plan Complete"}
