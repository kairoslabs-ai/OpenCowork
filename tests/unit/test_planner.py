"""Unit tests for Planner."""

import pytest

from opencowork.agent import Planner
from opencowork.core import Plan


@pytest.mark.asyncio
async def test_planner_initialization():
    """Test planner initialization."""
    planner = Planner()
    assert planner.model_provider == "openrouter"
    assert planner.model_name == "meta-llama/llama-3.1-70b-instruct"


@pytest.mark.asyncio
async def test_planner_plan_generation(planner):
    """Test plan generation from goal."""
    goal = "Organize my files"
    plan = await planner.plan(goal)

    assert isinstance(plan, Plan)
    assert plan.goal == goal
    assert len(plan.steps) > 0
    assert all(step.step > 0 for step in plan.steps)


@pytest.mark.asyncio
async def test_planner_plan_validation(planner):
    """Test plan validation."""
    goal = "Test task"
    plan = await planner.plan(goal)

    assert planner._validate_plan(plan)
    assert plan.steps[0].step == 1
