"""OpenCowork API server implementation with integrated endpoints."""

import logging
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.gzip import GZipMiddleware

from opencowork.agent.executor import Executor
from opencowork.agent.planner import Planner
from opencowork.api import models
from opencowork.api.session import TaskSessionManager
from opencowork.core import ExecutionStatus
from opencowork.sandbox.permissions import PermissionManager

logger = logging.getLogger(__name__)


class OpenCoworkAPI:
    """OpenCowork API server with integrated endpoints."""

    def __init__(
        self,
        session_storage: Optional[Path] = None,
        permission_policy_path: Optional[Path] = None,
    ):
        """Initialize API.

        Args:
            session_storage: Path to store task sessions
            permission_policy_path: Path to permission policy file
        """
        self.session_manager = TaskSessionManager(session_storage)
        self.planner = Planner()
        self.executor = Executor()
        self.permission_manager = PermissionManager()

        # Load permission policy if exists
        if permission_policy_path and permission_policy_path.exists():
            self.permission_manager.load_policy(str(permission_policy_path))

        self._running_tasks = set()
        self._websocket_connections = {}

    async def create_plan(self, request: models.TaskRequest) -> models.PlanResponse:
        """Create a plan from a goal.

        Args:
            request: Task request

        Returns:
            Plan response
        """
        # Create session
        session = self.session_manager.create_session(
            goal=request.goal,
            description=request.description or "",
        )

        logger.info(f"Creating plan for task {session.task_id}: {request.goal}")

        try:
            # Use planner to create plan (await async call)
            plan = await self.planner.plan(goal=request.goal)

            # Store plan in session
            self.session_manager.update_session(session.task_id, plan=plan)

            return models.PlanResponse(
                task_id=session.task_id,
                goal=request.goal,
                steps=[
                    models.StepResponse(
                        step=step.step,
                        action=step.action,
                        description=step.description,
                        arguments=step.arguments,
                        status=step.status.value,
                        result=step.result,
                        error=step.error,
                    )
                    for step in plan.steps
                ],
                estimated_tokens=plan.estimated_tokens or 0,
                estimated_duration_min=plan.estimated_duration_min or 0,
                created_at=plan.created_at.isoformat(),
            )
        except Exception as e:
            logger.error(f"Failed to create plan: {e}")
            self.session_manager.update_session(
                session.task_id,
                error=str(e),
                status=ExecutionStatus.FAILED,
            )
            raise HTTPException(status_code=400, detail=str(e))

    async def get_plan(self, task_id: str) -> models.PlanResponse:
        """Get plan for a task.

        Args:
            task_id: Task ID

        Returns:
            Plan details

        Raises:
            HTTPException: If task not found
        """
        session = self.session_manager.get_session(task_id)
        if not session:
            raise HTTPException(status_code=404, detail="Task not found")

        if not session.plan:
            raise HTTPException(status_code=400, detail="No plan created yet")

        return models.PlanResponse(
            task_id=task_id,
            goal=session.goal,
            steps=[
                models.StepResponse(
                    step=step.step,
                    action=step.action,
                    description=step.description,
                    arguments=step.arguments,
                    status=step.status.value,
                    result=step.result,
                    error=step.error,
                )
                for step in session.plan.steps
            ],
            estimated_tokens=session.plan.estimated_tokens or 0,
            estimated_duration_min=session.plan.estimated_duration_min or 0,
            created_at=session.plan.created_at.isoformat(),
        )

    async def execute_task(self, task_id: str) -> models.ExecutionStatusResponse:
        """Start executing a task plan.

        Args:
            task_id: Task ID

        Returns:
            Execution status
        """
        session = self.session_manager.get_session(task_id)
        if not session:
            raise HTTPException(status_code=404, detail="Task not found")

        if not session.plan:
            raise HTTPException(status_code=400, detail="No plan to execute")

        if session.status != ExecutionStatus.PENDING:
            raise HTTPException(status_code=400, detail="Task already started")

        logger.info(f"Starting execution for task: {task_id}")

        # Mark task as running
        self._running_tasks.add(task_id)
        self.session_manager.update_session(
            task_id,
            status=ExecutionStatus.RUNNING,
        )

        return models.ExecutionStatusResponse(
            task_id=task_id,
            status=ExecutionStatus.RUNNING.value,
        )

    async def get_execution_status(self, task_id: str) -> models.ExecutionStatusResponse:
        """Get current execution status.

        Args:
            task_id: Task ID

        Returns:
            Execution status
        """
        session = self.session_manager.get_session(task_id)
        if not session:
            raise HTTPException(status_code=404, detail="Task not found")

        return models.ExecutionStatusResponse(
            task_id=task_id,
            status=session.status.value,
        )

    async def get_execution_result(self, task_id: str) -> models.ExecutionResponse:
        """Get final execution result.

        Args:
            task_id: Task ID

        Returns:
            Execution result
        """
        session = self.session_manager.get_session(task_id)
        if not session:
            raise HTTPException(status_code=404, detail="Task not found")

        if session.status == ExecutionStatus.PENDING:
            raise HTTPException(
                status_code=400, detail="Task has not been executed yet"
            )

        if session.status == ExecutionStatus.RUNNING:
            raise HTTPException(status_code=400, detail="Task still running")

        return models.ExecutionResponse(
            task_id=task_id,
            status=session.status.value,
            result=session.result or "",
            error=session.error or None,
        )

    async def cancel_execution(self, task_id: str) -> dict:
        """Cancel a running task.

        Args:
            task_id: Task ID

        Returns:
            Cancellation status
        """
        session = self.session_manager.get_session(task_id)
        if not session:
            raise HTTPException(status_code=404, detail="Task not found")

        if session.status != ExecutionStatus.RUNNING:
            raise HTTPException(status_code=400, detail="Task is not running")

        logger.info(f"Cancelling task: {task_id}")

        self._running_tasks.discard(task_id)
        self.session_manager.update_session(
            task_id,
            status=ExecutionStatus.CANCELLED,
        )

        return {"status": "cancelled"}

    async def confirm_action(
        self, task_id: str, request: models.ConfirmationRequest
    ) -> dict:
        """Confirm a user action.

        Args:
            task_id: Task ID
            request: Confirmation request

        Returns:
            Confirmation status
        """
        session = self.session_manager.get_session(task_id)
        if not session:
            raise HTTPException(status_code=404, detail="Task not found")

        logger.info(
            f"Action confirmed for task {task_id}: {request.action} -> {request.confirmed}"
        )

        # Store confirmation in metadata
        if "confirmations" not in session.metadata:
            session.metadata["confirmations"] = {}

        session.metadata["confirmations"][request.action] = request.confirmed

        return {"confirmed": request.confirmed}

    async def list_tasks(
        self,
        limit: int = 20,
        offset: int = 0,
        status: Optional[str] = None,
    ) -> models.TaskHistoryResponse:
        """List all tasks.

        Args:
            limit: Maximum tasks to return
            offset: Offset for pagination
            status: Optional status filter

        Returns:
            Task history response
        """
        sessions, total = self.session_manager.list_sessions(limit, offset)

        # Filter by status if provided
        if status:
            sessions = [s for s in sessions if s.status.value == status]
            total = len(sessions)

        tasks = [
            {
                "task_id": s.task_id,
                "goal": s.goal,
                "status": s.status.value,
                "created_at": s.created_at.isoformat(),
                "completed_at": s.completed_at.isoformat() if s.completed_at else None,
            }
            for s in sessions
        ]

        return models.TaskHistoryResponse(tasks=tasks, total=total)

    async def get_task(self, task_id: str) -> dict:
        """Get task details.

        Args:
            task_id: Task ID

        Returns:
            Task details
        """
        session = self.session_manager.get_session(task_id)
        if not session:
            raise HTTPException(status_code=404, detail="Task not found")

        return {
            "task_id": session.task_id,
            "goal": session.goal,
            "description": session.description,
            "status": session.status.value,
            "created_at": session.created_at.isoformat(),
            "started_at": session.started_at.isoformat() if session.started_at else None,
            "completed_at": (
                session.completed_at.isoformat() if session.completed_at else None
            ),
            "result": session.result,
            "error": session.error,
            "metadata": session.metadata,
        }

    async def delete_task(self, task_id: str) -> dict:
        """Delete a task.

        Args:
            task_id: Task ID

        Returns:
            Deletion status
        """
        deleted = self.session_manager.delete_session(task_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Task not found")

        self._running_tasks.discard(task_id)
        return {"deleted": True}

    async def get_audit_log(
        self,
        limit: int = 100,
        offset: int = 0,
        task_id: Optional[str] = None,
    ) -> models.AuditLogResponse:
        """Get audit log.

        Args:
            limit: Max entries
            offset: Offset
            task_id: Optional filter

        Returns:
            Audit log entries
        """
        # TODO: Integrate with permission manager audit log
        return models.AuditLogResponse(entries=[], total=0)

    async def get_policy(self) -> models.PolicyResponse:
        """Get current policy.

        Returns:
            Current policy
        """
        policy = self.permission_manager.policy
        return models.PolicyResponse(
            folders=[],  # TODO: Extract from policy
            tools={},  # TODO: Extract from policy
            max_tokens_per_task=100000,
            max_execution_time_seconds=3600,
            allow_network=False,
        )

    async def update_policy(self, request: models.PolicyResponse) -> dict:
        """Update policy.

        Args:
            request: New policy

        Returns:
            Update status
        """
        logger.info("Updating permission policy")
        # TODO: Validate and update policy
        return {"updated": True}


def create_app(api: Optional[OpenCoworkAPI] = None) -> FastAPI:
    """Create FastAPI application.

    Args:
        api: Optional OpenCoworkAPI instance

    Returns:
        FastAPI app
    """
    if api is None:
        api = OpenCoworkAPI()

    app = FastAPI(
        title="OpenCowork API",
        description="API for OpenCowork agentic workspace",
        version="0.1.0a",
    )

    # Add CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Add GZIP compression
    app.add_middleware(GZipMiddleware, minimum_size=1000)

    # Health check
    @app.get("/health")
    async def health():
        """Health check endpoint."""
        return {"status": "ok", "version": "0.1.0a"}

    # Task Planning Endpoints

    @app.post("/api/tasks/plan", response_model=models.PlanResponse)
    async def create_plan(request: models.TaskRequest) -> models.PlanResponse:
        """Create a plan from a goal."""
        return await api.create_plan(request)

    @app.get("/api/tasks/{task_id}/plan", response_model=models.PlanResponse)
    async def get_plan(task_id: str) -> models.PlanResponse:
        """Get plan for a task."""
        return await api.get_plan(task_id)

    # Task Execution Endpoints

    @app.post("/api/tasks/{task_id}/execute", response_model=models.ExecutionStatusResponse)
    async def execute_task(task_id: str) -> models.ExecutionStatusResponse:
        """Start executing a task."""
        return await api.execute_task(task_id)

    @app.get("/api/tasks/{task_id}/status", response_model=models.ExecutionStatusResponse)
    async def get_execution_status(task_id: str) -> models.ExecutionStatusResponse:
        """Get execution status."""
        return await api.get_execution_status(task_id)

    @app.get("/api/tasks/{task_id}/result", response_model=models.ExecutionResponse)
    async def get_execution_result(task_id: str) -> models.ExecutionResponse:
        """Get execution result."""
        return await api.get_execution_result(task_id)

    @app.post("/api/tasks/{task_id}/cancel")
    async def cancel_execution(task_id: str) -> dict:
        """Cancel execution."""
        return await api.cancel_execution(task_id)

    # User Confirmation Endpoints

    @app.post("/api/tasks/{task_id}/confirm")
    async def confirm_action(
        task_id: str, request: models.ConfirmationRequest
    ) -> dict:
        """Confirm action."""
        return await api.confirm_action(task_id, request)

    # Task History Endpoints

    @app.get("/api/tasks", response_model=models.TaskHistoryResponse)
    async def list_tasks(
        limit: int = 20, offset: int = 0, status: Optional[str] = None
    ) -> models.TaskHistoryResponse:
        """List tasks."""
        return await api.list_tasks(limit, offset, status)

    @app.get("/api/tasks/{task_id}")
    async def get_task(task_id: str) -> dict:
        """Get task details."""
        return await api.get_task(task_id)

    @app.delete("/api/tasks/{task_id}")
    async def delete_task(task_id: str) -> dict:
        """Delete task."""
        return await api.delete_task(task_id)

    # Audit Log Endpoints

    @app.get("/api/audit", response_model=models.AuditLogResponse)
    async def get_audit_log(
        limit: int = 100, offset: int = 0, task_id: Optional[str] = None
    ) -> models.AuditLogResponse:
        """Get audit log."""
        return await api.get_audit_log(limit, offset, task_id)

    # Permission/Policy Endpoints

    @app.get("/api/policies", response_model=models.PolicyResponse)
    async def get_policy() -> models.PolicyResponse:
        """Get policy."""
        return await api.get_policy()

    @app.put("/api/policies")
    async def update_policy(request: models.PolicyResponse) -> dict:
        """Update policy."""
        return await api.update_policy(request)

    # WebSocket Endpoint

    @app.websocket("/ws/tasks/{task_id}")
    async def websocket_endpoint(websocket: WebSocket, task_id: str):
        """WebSocket endpoint for real-time updates."""
        await websocket.accept()
        api._websocket_connections[task_id] = websocket

        try:
            while True:
                # Receive messages from client
                data = await websocket.receive_json()
                logger.debug(f"WebSocket message from {task_id}: {data}")

                # Echo back for now
                await websocket.send_json({"type": "pong", "data": data})
        except WebSocketDisconnect:
            logger.info(f"WebSocket client disconnected: {task_id}")
            api._websocket_connections.pop(task_id, None)

    return app


if __name__ == "__main__":
    import uvicorn

    app = create_app()
    uvicorn.run(app, host="0.0.0.0", port=8000)
