"""Default configuration for OpenCowork."""

from opencowork.core import Config

# Default configuration
DEFAULT_CONFIG = Config(
    # Model settings
    model_provider="openrouter",
    model_name="meta-llama/llama-3.1-70b-instruct",
    temperature=0.3,
    max_tokens=4096,
    # Execution settings
    max_task_tokens=100000,
    max_execution_time=3600,
    max_concurrent_tools=3,
    timeout_per_tool=30,
    # Security settings
    sandbox_enabled=True,
    require_confirmation={"file_delete": True, "run_command": True},
    # Logging settings
    log_level="INFO",
    log_dir="logs",
    audit_enabled=True,
)
