"""Planner module - converts goals to execution plans."""

import json
import logging
from typing import Any, Dict, List, Optional

from opencowork.core import Plan, Step
from opencowork.tools import FILESYSTEM_TOOLS, ToolSchema

logger = logging.getLogger(__name__)


class Planner:
    """
    Converts a user goal into a structured execution plan.

    The Planner uses an LLM to break down a high-level goal into
    step-by-step tasks that can be executed by the Executor.
    """

    def __init__(
        self,
        model_provider: str = "openrouter",
        model_name: str = "meta-llama/llama-3.1-70b-instruct",
        tools: Optional[Dict[str, Any]] = None,
    ):
        """
        Initialize the Planner.

        Args:
            model_provider: LLM provider (openrouter, ollama, etc.)
            model_name: Model name/ID to use
            tools: Dict of available tools {name: tool_class}
        """
        self.model_provider = model_provider
        self.model_name = model_name
        self.tools = tools or self._load_default_tools()
        logger.info(f"Initialized Planner with {model_provider}:{model_name}")
        logger.info(f"Loaded {len(self.tools)} tools")

    def _load_default_tools(self) -> Dict[str, Any]:
        """Load default tool set."""
        tools = {}
        for name, tool_class in FILESYSTEM_TOOLS.items():
            try:
                tools[name] = tool_class()
            except Exception as e:
                logger.warning(f"Failed to load tool {name}: {str(e)}")

        return tools

    def _get_tool_schemas(self) -> List[Dict[str, Any]]:
        """Get JSON schemas for all available tools.

        Returns:
            List of tool schemas
        """
        schemas = []
        for tool in self.tools.values():
            try:
                schema = tool.get_schema()
                schemas.append(schema.to_json_schema())
            except Exception as e:
                logger.warning(f"Failed to get schema for {tool.name}: {str(e)}")

        return schemas

    async def plan(
        self, goal: str, context: Optional[Dict[str, Any]] = None
    ) -> Plan:
        """
        Generate a plan from a user goal.

        Args:
            goal: User's desired outcome
            context: Optional context information

        Returns:
            Plan object with structured steps
        """
        logger.info(f"Planning goal: {goal}")

        if context is None:
            context = {}

        # Get available tools and their schemas
        tool_schemas = self._get_tool_schemas()

        # TODO: Call LLM with goal and tool schemas to generate plan
        # For now, return a simple demo plan
        plan = self._generate_demo_plan(goal, tool_schemas)

        logger.info(f"Generated plan with {len(plan.steps)} steps")
        return plan

    def _generate_demo_plan(self, goal: str, tool_schemas: List[Dict[str, Any]]) -> Plan:
        """Generate a demo plan (placeholder until LLM integration).

        Args:
            goal: User goal
            tool_schemas: Available tool schemas

        Returns:
            Demo plan
        """
        steps = []

        # Step 1: List current directory
        if any(t["name"] == "file_list" for t in tool_schemas):
            steps.append(
                Step(
                    step=1,
                    action="file_list",
                    description="List current directory contents",
                    arguments={"path": "."},
                )
            )

        # Step 2: Ask for confirmation
        steps.append(
            Step(
                step=len(steps) + 1,
                action="confirm_action",
                description=f"Confirm: {goal}",
                arguments={"message": f"Proceed with: {goal}?"},
            )
        )

        plan = Plan(
            goal=goal,
            steps=steps,
            summary=f"Plan for: {goal}",
            estimated_tokens=5000,
            estimated_duration_min=5,
        )

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

        # TODO: Implement intelligent replanning based on error
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

            # Validate that action is a known tool or special action
            if step.action not in self.tools and step.action not in [
                "confirm_action",
                "ask_human",
                "wait",
            ]:
                logger.warning(f"Unknown action: {step.action}")

        return True
