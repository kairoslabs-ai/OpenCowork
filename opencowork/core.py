"""Core data models and types for OpenCowork."""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class ExecutionStatus(str, Enum):
    """Status of task execution."""

    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    TIMEOUT = "timeout"
    CANCELLED = "cancelled"
    PERMISSION_DENIED = "permission_denied"


class ToolPermission(str, Enum):
    """Permission levels for tools and folders."""

    DENY = "deny"
    READ = "read"
    READ_WRITE = "read_write"


class StepStatus(str, Enum):
    """Status of individual execution step."""

    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    SKIPPED = "skipped"


class Step(BaseModel):
    """Individual execution step in a plan."""

    step: int = Field(..., description="Step number (1-indexed)")
    action: str = Field(..., description="Tool/action name")
    description: str = Field(..., description="Human-readable step description")
    arguments: Dict[str, Any] = Field(default_factory=dict, description="Tool arguments")
    status: StepStatus = Field(default=StepStatus.PENDING, description="Current step status")
    error: Optional[str] = Field(None, description="Error message if failed")
    result: Optional[Any] = Field(None, description="Step execution result")
    duration_ms: float = Field(default=0, description="Execution time in milliseconds")
    timestamp: Optional[datetime] = Field(None, description="Execution timestamp")


class Plan(BaseModel):
    """Structured task plan."""

    goal: str = Field(..., description="User goal")
    steps: List[Step] = Field(default_factory=list, description="Execution steps")
    summary: Optional[str] = Field(None, description="Plan summary")
    estimated_duration_min: Optional[int] = Field(None, description="Estimated time in minutes")
    estimated_tokens: Optional[int] = Field(None, description="Estimated token usage")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ExecutionContext(BaseModel):
    """Context during task execution."""

    goal: str = Field(..., description="Original user goal")
    plan: Plan = Field(..., description="Current execution plan")
    current_step: int = Field(default=0, description="Current step index")
    observations: Dict[int, Any] = Field(default_factory=dict, description="Step results")
    errors: List[Dict[str, Any]] = Field(default_factory=list, description="Error records")
    user_prefs: Dict[str, Any] = Field(default_factory=dict, description="User preferences")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    task_id: str = Field(default_factory=lambda: "task_" + str(datetime.utcnow().timestamp()))


class ExecutionResult(BaseModel):
    """Result of task execution."""

    status: ExecutionStatus = Field(..., description="Execution status")
    plan: Plan = Field(..., description="Completed plan")
    context: ExecutionContext = Field(..., description="Final execution context")
    error: Optional[str] = Field(None, description="Error message if failed")
    summary: str = Field(default="", description="Execution summary")
    duration_ms: float = Field(default=0, description="Total execution time")
    started_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = Field(None, description="Completion timestamp")

    class Config:
        """Pydantic config."""

        json_encoders = {datetime: lambda v: v.isoformat()}


class Config(BaseModel):
    """OpenCowork configuration."""

    # Model settings
    model_provider: str = Field(default="openrouter", description="LLM provider")
    model_name: str = Field(default="meta-llama/llama-3.1-70b-instruct")
    api_key: Optional[str] = Field(None, description="API key for model provider")
    temperature: float = Field(default=0.3, description="Model temperature")
    max_tokens: int = Field(default=4096, description="Max output tokens")

    # Execution settings
    max_task_tokens: int = Field(default=100000, description="Max tokens per task")
    max_execution_time: int = Field(default=3600, description="Max execution time (seconds)")
    max_concurrent_tools: int = Field(default=3, description="Max concurrent tool calls")
    timeout_per_tool: int = Field(default=30, description="Timeout per tool (seconds)")

    # Security settings
    allowed_folders: List[str] = Field(
        default_factory=list, description="Folders agent can access"
    )
    sandbox_enabled: bool = Field(default=True, description="Enable Docker sandbox")
    require_confirmation: Dict[str, bool] = Field(
        default_factory=lambda: {"file_delete": True, "run_command": True},
        description="Tools requiring confirmation",
    )

    # Logging settings
    log_level: str = Field(default="INFO", description="Logging level")
    log_dir: str = Field(default="logs", description="Log directory")
    audit_enabled: bool = Field(default=True, description="Enable audit logging")

    class Config:
        """Pydantic config."""

        extra = "allow"
        case_sensitive = False


class ToolCall(BaseModel):
    """Record of a tool call for auditing."""

    timestamp: datetime = Field(default_factory=datetime.utcnow)
    task_id: str = Field(..., description="Associated task ID")
    step: int = Field(..., description="Step number")
    tool: str = Field(..., description="Tool name")
    arguments: Dict[str, Any] = Field(..., description="Tool arguments")
    status: str = Field(..., description="success or error")
    result_summary: Optional[str] = Field(None, description="Brief result summary")
    duration_ms: float = Field(default=0, description="Execution time")
    error_message: Optional[str] = Field(None, description="Error message if failed")
