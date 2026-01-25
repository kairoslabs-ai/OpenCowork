"""Task storage and session management for OpenCowork API."""

import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional

from opencowork.core import ExecutionStatus, Plan


class TaskSession:
    """In-memory task session."""

    def __init__(
        self,
        task_id: str,
        goal: str,
        description: str = "",
    ):
        """Initialize task session.

        Args:
            task_id: Unique task ID
            goal: User's goal
            description: Task description
        """
        self.task_id = task_id
        self.goal = goal
        self.description = description
        self.created_at = datetime.utcnow()
        self.started_at: Optional[datetime] = None
        self.completed_at: Optional[datetime] = None
        self.plan: Optional[Plan] = None
        self.status: ExecutionStatus = ExecutionStatus.NOT_STARTED
        self.result: Optional[str] = None
        self.error: Optional[str] = None
        self.metadata: Dict = {}

    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return {
            "task_id": self.task_id,
            "goal": self.goal,
            "description": self.description,
            "created_at": self.created_at.isoformat(),
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "plan": self.plan.model_dump() if self.plan else None,
            "status": self.status.value,
            "result": self.result,
            "error": self.error,
            "metadata": self.metadata,
        }


class TaskSessionManager:
    """Manages task sessions in memory and optionally on disk."""

    def __init__(self, storage_path: Optional[Path] = None):
        """Initialize task session manager.

        Args:
            storage_path: Optional path to store session data
        """
        self.storage_path = storage_path
        self._sessions: Dict[str, TaskSession] = {}

        # Create storage directory if needed
        if storage_path:
            storage_path.parent.mkdir(parents=True, exist_ok=True)
            self._load_sessions()

    def create_session(
        self,
        goal: str,
        description: str = "",
    ) -> TaskSession:
        """Create new task session.

        Args:
            goal: User's goal
            description: Task description

        Returns:
            TaskSession: New task session
        """
        task_id = str(uuid.uuid4())
        session = TaskSession(task_id, goal, description)
        self._sessions[task_id] = session

        if self.storage_path:
            self._save_session(session)

        return session

    def get_session(self, task_id: str) -> Optional[TaskSession]:
        """Get task session by ID.

        Args:
            task_id: Task ID

        Returns:
            TaskSession or None if not found
        """
        return self._sessions.get(task_id)

    def update_session(self, task_id: str, **kwargs) -> Optional[TaskSession]:
        """Update task session.

        Args:
            task_id: Task ID
            **kwargs: Fields to update

        Returns:
            Updated TaskSession or None if not found
        """
        session = self._sessions.get(task_id)
        if not session:
            return None

        for key, value in kwargs.items():
            if hasattr(session, key):
                setattr(session, key, value)

        if self.storage_path:
            self._save_session(session)

        return session

    def list_sessions(
        self, limit: int = 20, offset: int = 0
    ) -> tuple[list[TaskSession], int]:
        """List all sessions.

        Args:
            limit: Maximum number of sessions to return
            offset: Number of sessions to skip

        Returns:
            Tuple of (sessions, total_count)
        """
        sessions = list(self._sessions.values())
        # Sort by created_at descending
        sessions.sort(key=lambda s: s.created_at, reverse=True)

        total = len(sessions)
        paginated = sessions[offset : offset + limit]

        return paginated, total

    def delete_session(self, task_id: str) -> bool:
        """Delete task session.

        Args:
            task_id: Task ID

        Returns:
            True if deleted, False if not found
        """
        if task_id not in self._sessions:
            return False

        del self._sessions[task_id]

        if self.storage_path:
            session_file = self.storage_path / f"{task_id}.json"
            if session_file.exists():
                session_file.unlink()

        return True

    def _save_session(self, session: TaskSession) -> None:
        """Save session to disk.

        Args:
            session: TaskSession to save
        """
        if not self.storage_path:
            return

        session_file = self.storage_path / f"{session.task_id}.json"
        with open(session_file, "w") as f:
            json.dump(session.to_dict(), f, indent=2)

    def _load_sessions(self) -> None:
        """Load sessions from disk."""
        if not self.storage_path or not self.storage_path.exists():
            return

        for session_file in self.storage_path.glob("*.json"):
            try:
                with open(session_file) as f:
                    data = json.load(f)
                    # Reconstruct session from data
                    session = TaskSession(
                        data["task_id"],
                        data["goal"],
                        data.get("description", ""),
                    )
                    session.created_at = datetime.fromisoformat(data["created_at"])
                    if data.get("started_at"):
                        session.started_at = datetime.fromisoformat(data["started_at"])
                    if data.get("completed_at"):
                        session.completed_at = datetime.fromisoformat(
                            data["completed_at"]
                        )
                    session.status = ExecutionStatus(data["status"])
                    session.result = data.get("result")
                    session.error = data.get("error")
                    session.metadata = data.get("metadata", {})
                    self._sessions[session.task_id] = session
            except Exception as e:
                print(f"Error loading session from {session_file}: {e}")
