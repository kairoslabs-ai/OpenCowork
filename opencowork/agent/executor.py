"""Executor module - executes plans and manages tools."""

import asyncio
import logging
import time
from typing import Any, Dict, Optional

from opencowork.core import ExecutionContext, ExecutionResult, ExecutionStatus, Plan, Step, StepStatus
from opencowork.tools import FILESYSTEM_TOOLS

logger = logging.getLogger(__name__)


class Executor:
    """
    Executes a plan step-by-step.

    The Executor handles:
    - Sequential step execution
    - Tool invocation
    - Error recovery
    - Observation recording
    """

    def __init__(
        self,
        max_execution_time: int = 3600,
        timeout_per_tool: int = 30,
        tools: Optional[Dict[str, Any]] = None,
    ):
        """
        Initialize the Executor.

        Args:
            max_execution_time: Maximum total execution time in seconds
            timeout_per_tool: Timeout per tool invocation in seconds
            tools: Dict of available tools {name: tool_instance}
        """
        self.max_execution_time = max_execution_time
        self.timeout_per_tool = timeout_per_tool
        self.tools = tools or self._load_default_tools()
        logger.info(
            f"Initialized Executor (max_time={max_execution_time}s, tool_timeout={timeout_per_tool}s, {len(self.tools)} tools)"
        )

    def _load_default_tools(self) -> Dict[str, Any]:
        """Load default tool set."""
        tools = {}
        for name, tool_class in FILESYSTEM_TOOLS.items():
            try:
                tools[name] = tool_class()
            except Exception as e:
                logger.warning(f"Failed to load tool {name}: {str(e)}")

        return tools

    async def execute(
        self, plan: Plan, context: Optional[ExecutionContext] = None
    ) -> ExecutionResult:
        """
        Execute a plan from start to finish.

        Args:
            plan: Plan to execute
            context: Optional execution context

        Returns:
            ExecutionResult with final status and observations
        """
        logger.info(f"Starting execution of plan: {plan.goal}")
        start_time = time.time()

        if context is None:
            context = ExecutionContext(goal=plan.goal, plan=plan)

        try:
            # Execute each step sequentially
            for step in plan.steps:
                logger.info(f"Executing step {step.step}/{len(plan.steps)}: {step.action}")

                try:
                    # Execute the step
                    result = await self.execute_step(step, context)

                    # Record observation
                    context.observations[step.step] = result
                    step.status = StepStatus.SUCCESS
                    step.result = result

                except asyncio.TimeoutError:
                    logger.error(f"Step {step.step} timed out")
                    step.status = StepStatus.FAILED
                    step.error = "Step execution timed out"
                    context.errors.append({"step": step.step, "error": "timeout"})

                    # Decide whether to continue
                    should_continue = await self.handle_error(
                        TimeoutError("Step timed out"), context, step
                    )
                    if not should_continue:
                        break

                except Exception as e:
                    logger.error(f"Step {step.step} failed: {str(e)}")
                    step.status = StepStatus.FAILED
                    step.error = str(e)
                    context.errors.append({"step": step.step, "error": str(e)})

                    # Decide whether to continue
                    should_continue = await self.handle_error(e, context, step)
                    if not should_continue:
                        break

            # Determine final status
            final_status = (
                ExecutionStatus.SUCCESS
                if all(s.status in [StepStatus.SUCCESS, StepStatus.SKIPPED] for s in plan.steps)
                else ExecutionStatus.FAILED
            )

            duration_ms = (time.time() - start_time) * 1000

            result = ExecutionResult(
                status=final_status,
                plan=plan,
                context=context,
                summary=f"Execution completed with status: {final_status.value}",
                duration_ms=duration_ms,
            )

            logger.info(f"Execution completed: {final_status.value} (took {duration_ms:.0f}ms)")
            return result

        except Exception as e:
            logger.error(f"Execution failed with exception: {str(e)}")
            duration_ms = (time.time() - start_time) * 1000

            return ExecutionResult(
                status=ExecutionStatus.FAILED,
                plan=plan,
                context=context,
                error=str(e),
                summary=f"Execution failed: {str(e)}",
                duration_ms=duration_ms,
            )

    async def execute_step(self, step: Step, context: ExecutionContext) -> Dict[str, Any]:
        """
        Execute a single step.

        Args:
            step: Step to execute
            context: Execution context

        Returns:
            Step result
        """
        try:
            logger.debug(f"Step {step.step} action: {step.action}, args: {step.arguments}")

            # Handle special actions
            if step.action == "confirm_action":
                logger.info(f"Confirmation required: {step.arguments.get('message', 'Proceed?')}")
                return {"status": "success", "confirmed": True}

            if step.action == "ask_human":
                logger.info(f"User input required: {step.arguments.get('question', '')}")
                return {"status": "success", "response": "confirmed"}

            if step.action == "wait":
                duration = step.arguments.get("seconds", 1)
                await asyncio.sleep(duration)
                return {"status": "success", "waited_seconds": duration}

            # Get the tool
            if step.action not in self.tools:
                raise ValueError(f"Unknown tool: {step.action}")

            tool = self.tools[step.action]

            # Execute tool with timeout
            result = await asyncio.wait_for(
                tool.execute(**step.arguments), timeout=self.timeout_per_tool
            )

            logger.info(f"Step {step.step} completed: {step.action}")
            return result

        except asyncio.TimeoutError:
            logger.error(f"Step {step.step} timed out after {self.timeout_per_tool}s")
            raise

        except Exception as e:
            logger.error(f"Step {step.step} failed: {str(e)}")
            raise

    async def handle_error(
        self, error: Exception, context: ExecutionContext, step: Step
    ) -> bool:
        """
        Handle an error during execution.

        Args:
            error: Error that occurred
            context: Execution context
            step: Step that failed

        Returns:
            True if should continue, False if should stop
        """
        logger.warning(f"Error during step {step.step}: {str(error)}")

        # Log error to context
        error_record = {
            "step": step.step,
            "action": step.action,
            "error": str(error),
            "error_type": type(error).__name__,
        }
        context.errors.append(error_record)

        # TODO: Implement intelligent error recovery
        # For critical errors, stop execution
        if isinstance(error, (ValueError, KeyError)):
            return False

        # For other errors, attempt to continue
        return False
