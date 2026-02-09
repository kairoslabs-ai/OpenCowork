"""Planner module - converts goals to execution plans."""

import json
import logging
import os
from typing import Any, Dict, List, Optional

from opencowork.agent.llm_service import LLMService
from opencowork.core import Plan, Step, StepStatus
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
        llm_provider: str = "ollama",
        llm_model: str = "mistral",
        api_key: Optional[str] = None,
        tools: Optional[Dict[str, Any]] = None,
        use_llm: bool = True,
    ):
        """
        Initialize the Planner.

        Args:
            llm_provider: LLM provider (openai, anthropic, ollama)
            llm_model: Model name/ID to use
            api_key: API key for provider (if needed)
            tools: Dict of available tools {name: tool_class}
            use_llm: Whether to use LLM or demo planner
        """
        self.model_provider = llm_provider
        self.model_name = llm_model
        self.tools = tools or self._load_default_tools()
        self.use_llm = use_llm

        # Initialize LLM service if enabled
        self.llm_service = None
        if use_llm:
            try:
                # Get API key from environment if not provided
                if not api_key:
                    if llm_provider == "openai":
                        api_key = os.getenv("OPENAI_API_KEY")
                    elif llm_provider == "anthropic":
                        api_key = os.getenv("ANTHROPIC_API_KEY")

                self.llm_service = LLMService(
                    provider_type=llm_provider,
                    api_key=api_key,
                    model=llm_model,
                )
                logger.info(f"Initialized LLM Planner with {llm_provider}:{llm_model}")
            except Exception as e:
                logger.warning(f"Failed to initialize LLM service: {e}. Falling back to demo planner.")
                self.llm_service = None
                self.use_llm = False

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

        # Try LLM-based planning first
        if self.llm_service and self.use_llm:
            try:
                tool_schemas = self._get_tool_schemas()
                plan_data = await self.llm_service.generate_plan(goal, tool_schemas, context)

                # Convert LLM response to Plan object
                plan = self._parse_llm_plan(plan_data)
                logger.info(f"Generated LLM plan with {len(plan.steps)} steps")
                return plan

            except Exception as e:
                logger.warning(f"LLM planning failed: {e}. Falling back to demo plan.")

        # Fallback to demo plan
        tool_schemas = self._get_tool_schemas()
        plan = self._generate_demo_plan(goal, tool_schemas)
        logger.info(f"Generated demo plan with {len(plan.steps)} steps")
        return plan

    def _parse_llm_plan(self, plan_data: Dict[str, Any]) -> Plan:
        """Parse LLM response into Plan object"""
        steps = []
        for step_data in plan_data.get("steps", []):
            step = Step(
                step=step_data.get("step", len(steps) + 1),
                action=step_data.get("action", "unknown"),
                description=step_data.get("description", ""),
                arguments=step_data.get("arguments", {}),
                status=StepStatus.PENDING,
            )
            steps.append(step)

        plan = Plan(
            goal=plan_data.get("goal", ""),
            steps=steps,
            summary=plan_data.get("summary", ""),
            estimated_tokens=plan_data.get("estimated_tokens", 5000),
            estimated_duration_min=plan_data.get("estimated_duration_min", 10),
        )

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
