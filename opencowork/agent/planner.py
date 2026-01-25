"""Planner module - converts goals to execution plans."""

import json
import logging
from typing import Any, Dict, List, Optional

from opencowork.core import Plan, Step

logger = logging.getLogger(__name__)


class Planner:
    """
    Converts a user goal into a structured execution plan.

    The Planner uses an LLM to break down a high-level goal into
    step-by-step tasks that can be executed by the Executor.
    """

    def __init__(self, model_provider: str = "openrouter", model_name: str = "meta-llama/llama-3.1-70b-instruct"):
        """
        Initialize the Planner.

        Args:
            model_provider: LLM provider (openrouter, ollama, etc.)
            model_name: Model name/ID to use
        """
        self.model_provider = model_provider
        self.model_name = model_name
        logger.info(f"Initialized Planner with {model_provider}:{model_name}")

    async def plan(
        self, goal: str, context: Optional[Dict[str, Any]] = None, available_tools: Optional[List[str]] = None
    ) -> Plan:
        """
        Generate a plan from a user goal.

        Args:
            goal: User's desired outcome
            context: Optional context information
            available_tools: List of available tool names

        Returns:
            Plan object with structured steps
        """
        logger.info(f"Planning goal: {goal}")

        if context is None:
            context = {}
        if available_tools is None:
            available_tools = [
                "file_read",
                "file_write",
                "file_list",
                "file_move",
                "file_delete",
                "text_search",
                "text_replace",
                "ask_human",
                "run_command",
            ]

        # TODO: Integrate with LLM
        # For now, return a placeholder plan
        plan = Plan(
            goal=goal,
            steps=[
                Step(
                    step=1,
                    action="ask_human",
                    description="Confirm goal and scope",
                    arguments={"question": f"Proceed with: {goal}?"},
                )
            ],
            summary=f"Plan for: {goal}",
            estimated_tokens=5000,
            estimated_duration_min=5,
        )

        logger.info(f"Generated plan with {len(plan.steps)} steps")
        return plan

    async def replan(
        self, goal: str, error: str, context: Optional[Dict[str, Any]] = None
    ) -> Plan:
        """
        Replan after an error occurs.

        Args:
            goal: Original goal
            error: Error message from execution
            context: Optional execution context

        Returns:
            Revised Plan object
        """
        logger.warning(f"Replanning due to error: {error}")

        # TODO: Implement intelligent replanning
        return await self.plan(goal, context)

    def _validate_plan(self, plan: Plan) -> bool:
        """
        Validate that a plan is well-formed.

        Args:
            plan: Plan to validate

        Returns:
            True if valid, False otherwise
        """
        if not plan.steps:
            logger.error("Plan has no steps")
            return False

        for i, step in enumerate(plan.steps, 1):
            if step.step != i:
                logger.error(f"Step numbering is incorrect at step {i}")
                return False

        return True
