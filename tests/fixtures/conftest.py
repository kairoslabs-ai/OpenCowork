"""Test fixtures."""

import pytest

from opencowork.agent import Executor, Planner
from opencowork.core import Config, Plan, Step


@pytest.fixture
def config():
    """Create a test configuration."""
    return Config(
        model_provider="openrouter",
        model_name="meta-llama/llama-3.1-70b-instruct",
        max_task_tokens=50000,
        sandbox_enabled=False,  # Disable for testing
    )


@pytest.fixture
def planner(config):
    """Create a test planner."""
    return Planner(
        model_provider=config.model_provider,
        model_name=config.model_name,
    )


@pytest.fixture
def executor(config):
    """Create a test executor."""
    return Executor(
        max_execution_time=config.max_execution_time,
        timeout_per_tool=30,
    )


@pytest.fixture
def sample_plan():
    """Create a sample plan for testing."""
    return Plan(
        goal="Test task",
        steps=[
            Step(
                step=1,
                action="ask_human",
                description="Confirm goal",
                arguments={"question": "Proceed?"},
            ),
        ],
    )
