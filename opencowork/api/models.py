"""Request and response models for OpenCowork API."""

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from opencowork.core import ExecutionStatus, Plan, Step


class TaskRequest(BaseModel):
    """Request to create a new task."""

    goal: str = Field(..., description="Task goal or objective")
    description: Optional[str] = Field(None, description="Optional task description")


class StepResponse(BaseModel):
    """Step information in plan."""

    step: int
    action: str
    description: str
    arguments: Dict[str, Any]
    status: str = "pending"
    result: Optional[Any] = None
    error: Optional[str] = None


class PlanResponse(BaseModel):
    """Response containing a generated plan."""

    task_id: str
    goal: str
    steps: List[StepResponse]
    estimated_tokens: int
    estimated_duration_min: int
    created_at: str


class ExecutionStatusResponse(BaseModel):
    """Current execution status of a task."""

    task_id: str
    status: str
    current_step: int
    total_steps: int
    completed_steps: int
    failed_steps: int
    progress_percent: float
    elapsed_ms: float


class ExecutionResponse(BaseModel):
    """Final execution result of a task."""

    task_id: str
    status: str
    plan: PlanResponse
    steps_executed: List[StepResponse]
    errors: List[str]
    summary: str
    duration_ms: float
    completed_at: str


class ConfirmationRequest(BaseModel):
    """User response to a confirmation prompt."""

    task_id: str
    action: str
    confirmed: bool
    response: Optional[str] = None


class ConfirmationPrompt(BaseModel):
    """Confirmation needed from user."""

    task_id: str
    step_num: int
    action: str
    message: str
    options: List[str] = ["Yes", "No"]


class AuditEntry(BaseModel):
    """Audit log entry."""

    timestamp: str
    task_id: str
    action: str
    resource: str
    status: str
    details: Optional[Dict[str, Any]] = None


class AuditLogResponse(BaseModel):
    """Audit log response."""

    entries: List[AuditEntry]
    total: int


class PolicyResponse(BaseModel):
    """Permission policy response."""

    folders: List[Dict[str, Any]]
    tools: Dict[str, Dict[str, Any]]
    max_tokens_per_task: int
    max_execution_time_seconds: int
    allow_network: bool


class TaskHistoryItem(BaseModel):
    """Task history item."""

    task_id: str
    goal: str
    status: str
    created_at: str
    completed_at: Optional[str] = None
    duration_ms: Optional[float] = None


class TaskHistoryResponse(BaseModel):
    """Task history list response."""

    tasks: List[TaskHistoryItem]
    total: int
    limit: int
    offset: int


class ErrorResponse(BaseModel):
    """Error response."""

    error: str
    detail: Optional[str] = None
    status_code: int
