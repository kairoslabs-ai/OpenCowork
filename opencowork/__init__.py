"""OpenCowork: Open-source agentic workspace for autonomous multi-step task execution."""

__version__ = "0.1.0a0"
__author__ = "OpenCowork Contributors"
__license__ = "MIT"

from opencowork.agent import Executor, Planner
from opencowork.core import Config, ExecutionContext, ExecutionResult, Plan, Step

__all__ = [
    "Planner",
    "Executor",
    "ExecutionContext",
    "ExecutionResult",
    "Plan",
    "Step",
    "Config",
]
