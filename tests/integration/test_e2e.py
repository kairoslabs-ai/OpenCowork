"""Integration tests for end-to-end workflows."""

import pytest

from opencowork.agent import Executor, Planner
from opencowork.core import ExecutionStatus


@pytest.mark.asyncio
async def test_end_to_end_task_execution():
    """Test complete task execution flow."""
    planner = Planner()
    executor = Executor()

    # Create plan
    goal = "Test end-to-end execution"
    plan = await planner.plan(goal)

    # Execute plan
    result = await executor.execute(plan)

    assert result.status == ExecutionStatus.SUCCESS
    assert result.plan.goal == goal
    assert len(result.context.observations) > 0


@pytest.mark.asyncio
async def test_complex_goal_planning():
    """Test planning of complex multi-step goal."""
    planner = Planner()

    goal = "Organize files, create reports, and send notifications"
    plan = await planner.plan(goal)

    assert len(plan.steps) >= 1
    assert all(step.step > 0 for step in plan.steps)
    assert planner._validate_plan(plan)
