"""Permission and access control system for OpenCowork."""

import logging
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Callable, Dict, List, Optional, Set

import yaml

logger = logging.getLogger(__name__)


class AccessLevel(str, Enum):
    """Access levels for resources."""

    NONE = "none"
    """No access."""

    READ = "read"
    """Read-only access."""

    WRITE = "read_write"
    """Read and write access."""


@dataclass
class FolderPolicy:
    """Policy for folder access."""

    path: str
    """Folder path."""

    access: AccessLevel = AccessLevel.READ
    """Access level."""

    allow_delete: bool = False
    """Allow deletion of files in this folder."""

    require_confirmation: bool = False
    """Require user confirmation for operations."""


@dataclass
class ToolPolicy:
    """Policy for tool usage."""

    tool: str
    """Tool name."""

    enabled: bool = True
    """Whether tool is enabled."""

    require_confirmation: bool = False
    """Require user confirmation before execution."""

    rate_limit: int = 0
    """Calls per minute (0 = unlimited)."""

    parameters: Dict[str, str] = field(default_factory=dict)
    """Parameter constraints: {param: constraint}."""


class PermissionPolicy:
    """Complete permission policy configuration."""

    def __init__(
        self,
        folders: Optional[List[FolderPolicy]] = None,
        tools: Optional[List[ToolPolicy]] = None,
        max_tokens_per_task: int = 100000,
        max_execution_time_seconds: int = 3600,
        allow_network: bool = False,
    ):
        """Initialize permission policy.

        Args:
            folders: Folder access policies
            tools: Tool usage policies
            max_tokens_per_task: Max LLM tokens per task
            max_execution_time_seconds: Max execution time
            allow_network: Allow network access
        """
        self.folders = {p.path: p for p in (folders or [])}
        self.tools = {p.tool: p for p in (tools or [])}
        self.max_tokens_per_task = max_tokens_per_task
        self.max_execution_time_seconds = max_execution_time_seconds
        self.allow_network = allow_network

    @classmethod
    def from_yaml(cls, yaml_path: str) -> "PermissionPolicy":
        """Load policy from YAML file.

        Args:
            yaml_path: Path to YAML policy file

        Returns:
            PermissionPolicy instance

        Raises:
            FileNotFoundError: If file doesn't exist
            ValueError: If YAML is invalid
        """
        path = Path(yaml_path)
        if not path.exists():
            raise FileNotFoundError(f"Policy file not found: {yaml_path}")

        try:
            with open(path) as f:
                config = yaml.safe_load(f) or {}

            # Parse folder policies
            folders = []
            for folder_config in config.get("folders", []):
                folders.append(
                    FolderPolicy(
                        path=folder_config["path"],
                        access=AccessLevel(folder_config.get("access", "read")),
                        allow_delete=folder_config.get("allow_delete", False),
                        require_confirmation=folder_config.get(
                            "require_confirmation", False
                        ),
                    )
                )

            # Parse tool policies
            tools = []
            for tool_config in config.get("tools", {}):
                tool_name = tool_config
                tool_settings = config["tools"][tool_config]
                tools.append(
                    ToolPolicy(
                        tool=tool_name,
                        enabled=tool_settings.get("enabled", True),
                        require_confirmation=tool_settings.get(
                            "require_confirmation", False
                        ),
                        rate_limit=tool_settings.get("rate_limit", 0),
                        parameters=tool_settings.get("parameters", {}),
                    )
                )

            return cls(
                folders=folders,
                tools=tools,
                max_tokens_per_task=config.get("max_tokens_per_task", 100000),
                max_execution_time_seconds=config.get("max_execution_time_seconds", 3600),
                allow_network=config.get("allow_network", False),
            )

        except yaml.YAMLError as e:
            raise ValueError(f"Invalid YAML in policy file: {e}")

    def to_yaml(self, yaml_path: str) -> None:
        """Save policy to YAML file.

        Args:
            yaml_path: Path to save YAML file
        """
        config = {
            "folders": [
                {
                    "path": policy.path,
                    "access": policy.access.value,
                    "allow_delete": policy.allow_delete,
                    "require_confirmation": policy.require_confirmation,
                }
                for policy in self.folders.values()
            ],
            "tools": {
                policy.tool: {
                    "enabled": policy.enabled,
                    "require_confirmation": policy.require_confirmation,
                    "rate_limit": policy.rate_limit,
                    "parameters": policy.parameters,
                }
                for policy in self.tools.values()
            },
            "max_tokens_per_task": self.max_tokens_per_task,
            "max_execution_time_seconds": self.max_execution_time_seconds,
            "allow_network": self.allow_network,
        }

        path = Path(yaml_path)
        path.parent.mkdir(parents=True, exist_ok=True)

        with open(path, "w") as f:
            yaml.dump(config, f, default_flow_style=False)

        logger.info(f"Saved policy to {yaml_path}")


class PermissionManager:
    """Manages access control and permissions."""

    def __init__(
        self,
        policy: Optional[PermissionPolicy] = None,
        confirm_handler: Optional[Callable[[str], bool]] = None,
    ):
        """Initialize permission manager.

        Args:
            policy: Permission policy (default: allow all)
            confirm_handler: Async callback for user confirmation
        """
        self.policy = policy or PermissionPolicy()
        self.confirm_handler = confirm_handler
        self._audit_log: List[Dict] = []

    def can_read_file(self, file_path: str) -> bool:
        """Check if file can be read.

        Args:
            file_path: Path to file

        Returns:
            True if readable
        """
        access = self._get_access_level(file_path)
        return access in (AccessLevel.READ, AccessLevel.WRITE)

    def can_write_file(self, file_path: str) -> bool:
        """Check if file can be written.

        Args:
            file_path: Path to file

        Returns:
            True if writable
        """
        access = self._get_access_level(file_path)
        return access == AccessLevel.WRITE

    def can_delete_file(self, file_path: str) -> bool:
        """Check if file can be deleted.

        Args:
            file_path: Path to file

        Returns:
            True if deletable
        """
        policy = self._get_folder_policy(file_path)
        if not policy:
            return False

        return policy.access == AccessLevel.WRITE and policy.allow_delete

    def can_use_tool(self, tool_name: str) -> bool:
        """Check if tool is enabled.

        Args:
            tool_name: Name of tool

        Returns:
            True if tool is enabled
        """
        policy = self.policy.tools.get(tool_name)
        if not policy:
            return True  # Unknown tools are allowed by default

        return policy.enabled

    def requires_confirmation(self, action: str, resource: str) -> bool:
        """Check if action requires user confirmation.

        Args:
            action: Type of action (read, write, delete, etc.)
            resource: File path or tool name

        Returns:
            True if confirmation required
        """
        # Check folder policy for file operations
        if action in ("write", "delete"):
            policy = self._get_folder_policy(resource)
            if policy:
                return policy.require_confirmation

        # Check tool policy
        if action == "tool_use":
            tool_policy = self.policy.tools.get(resource)
            if tool_policy:
                return tool_policy.require_confirmation

        return False

    async def request_confirmation(self, message: str) -> bool:
        """Request user confirmation.

        Args:
            message: Confirmation prompt message

        Returns:
            True if confirmed

        Raises:
            RuntimeError: If no confirmation handler available
        """
        if not self.confirm_handler:
            logger.warning(f"No confirmation handler available: {message}")
            return False

        # Call confirmation handler
        # If handler is async, await it; otherwise just call it
        result = self.confirm_handler(message)
        if hasattr(result, "__await__"):
            return await result

        return result

    def log_action(
        self,
        action: str,
        resource: str,
        status: str,
        details: Optional[Dict] = None,
    ) -> None:
        """Log an action for audit trail.

        Args:
            action: Type of action
            resource: Resource affected
            status: Status (allowed, denied, confirmed)
            details: Additional details
        """
        entry = {
            "action": action,
            "resource": resource,
            "status": status,
            "details": details or {},
        }
        self._audit_log.append(entry)
        logger.info(f"Audit: {action} {resource} -> {status}")

    def get_audit_log(self) -> List[Dict]:
        """Get audit log entries.

        Returns:
            List of audit log entries
        """
        return self._audit_log.copy()

    def _get_access_level(self, file_path: str) -> AccessLevel:
        """Get access level for file path.

        Args:
            file_path: Path to file

        Returns:
            Access level
        """
        policy = self._get_folder_policy(file_path)
        return policy.access if policy else AccessLevel.NONE

    def _get_folder_policy(self, file_path: str) -> Optional[FolderPolicy]:
        """Get applicable folder policy for file path.

        Args:
            file_path: Path to file

        Returns:
            Applicable policy or None
        """
        file_path = str(Path(file_path).resolve())

        # Find longest matching policy path
        best_match = None
        for policy_path, policy in self.policy.folders.items():
            policy_path_resolved = str(Path(policy_path).resolve())

            # Check if file is under policy path
            try:
                Path(file_path).relative_to(policy_path_resolved)
                if not best_match or len(policy_path_resolved) > len(
                    best_match[0]
                ):
                    best_match = (policy_path_resolved, policy)
            except ValueError:
                # Not under this path
                continue

        return best_match[1] if best_match else None
