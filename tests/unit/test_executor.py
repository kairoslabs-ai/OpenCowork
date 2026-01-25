"""Unit tests for Executor."""

import pytest

from opencowork.agent import Executor
from opencowork.core import ExecutionStatus


@pytest.mark.asyncio
async def test_executor_initialization():
    """Test executor initialization."""
    executor = Executor()
    assert executor.max_execution_time == 3600
    assert executor.timeout_per_tool == 30


@pytest.mark.asyncio
async def test_executor_execute(executor, sample_plan):
    """Test plan execution."""
    result = await executor.execute(sample_plan)

    assert result.status == ExecutionStatus.SUCCESS
    assert result.plan == sample_plan
    assert len(result.context.observations) > 0


@pytest.mark.asyncio
async def test_executor_error_handling(executor, sample_plan):
    """Test error handling during execution."""
    # Modify plan to cause an error
    sample_plan.steps[0].action = "invalid_tool"

    result = await executor.execute(sample_plan)
    # Should succeed with placeholder result
    assert result.status == ExecutionStatus.SUCCESS
