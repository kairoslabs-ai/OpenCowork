"""Tools for running system commands with sandboxing."""

import logging
from typing import Any, Dict

from opencowork.sandbox.docker_runner import DockerSandbox, SandboxConfig
from opencowork.tools.base import BaseTool, ToolSchema

logger = logging.getLogger(__name__)


class RunCommandTool(BaseTool):
    """Execute shell commands in isolated sandbox."""

    def __init__(self, sandbox: DockerSandbox):
        """Initialize run command tool.

        Args:
            sandbox: Docker sandbox instance
        """
        self.sandbox = sandbox

    async def execute(
        self,
        command: str,
        working_dir: str = "/work",
        input_data: str = "",
        shell: str = "sh",
    ) -> Dict[str, Any]:
        """Execute command in sandbox.

        Args:
            command: Shell command to execute
            working_dir: Working directory
            input_data: Standard input
            shell: Shell type (sh, bash, etc.)

        Returns:
            Dict with returncode, stdout, stderr

        Raises:
            ValueError: If command is invalid
            TimeoutError: If execution exceeds timeout
            RuntimeError: If sandbox fails
        """
        if not command or not isinstance(command, str):
            raise ValueError("command must be a non-empty string")

        logger.info(f"Running command: {command}")

        try:
            returncode, stdout, stderr = await self.sandbox.run_command(
                command=command,
                working_dir=working_dir,
                input_data=input_data if input_data else None,
            )

            success = returncode == 0

            result = {
                "status": "success" if success else "failed",
                "returncode": returncode,
                "stdout": stdout,
                "stderr": stderr,
                "command": command,
            }

            if success:
                logger.info(f"Command succeeded: {command}")
            else:
                logger.warning(f"Command failed ({returncode}): {command}\n{stderr}")

            return result

        except TimeoutError as e:
            logger.error(f"Command timeout: {command}")
            raise

        except Exception as e:
            logger.error(f"Command execution error: {e}")
            raise RuntimeError(f"Failed to execute command: {e}")

    def get_schema(self) -> ToolSchema:
        """Get tool schema for LLM consumption."""
        return ToolSchema(
            name="run_command",
            description="Execute shell commands in isolated sandbox with resource limits",
            input_schema={
                "type": "object",
                "properties": {
                    "command": {
                        "type": "string",
                        "description": "Shell command to execute (e.g., 'ls -la' or 'python script.py')",
                    },
                    "working_dir": {
                        "type": "string",
                        "description": "Working directory for command execution (default: /work)",
                    },
                    "input_data": {
                        "type": "string",
                        "description": "Standard input to send to command",
                    },
                    "shell": {
                        "type": "string",
                        "description": "Shell interpreter (sh, bash, etc.)",
                        "default": "sh",
                    },
                },
                "required": ["command"],
            },
        )


class AskHumanTool(BaseTool):
    """Ask human for confirmation or input."""

    def __init__(self, confirm_handler=None):
        """Initialize ask human tool.

        Args:
            confirm_handler: Async callback to request user input
        """
        self.confirm_handler = confirm_handler

    async def execute(
        self,
        question: str,
        timeout_seconds: int = 300,
    ) -> Dict[str, Any]:
        """Ask human a question.

        Args:
            question: Question to ask
            timeout_seconds: Response timeout

        Returns:
            Dict with response

        Raises:
            ValueError: If question is invalid
            TimeoutError: If no response within timeout
            RuntimeError: If no handler available
        """
        if not question:
            raise ValueError("question must be non-empty")

        if not self.confirm_handler:
            raise RuntimeError(
                "No confirmation handler available. Cannot ask human."
            )

        logger.info(f"Asking human: {question}")

        try:
            response = self.confirm_handler(question)
            if hasattr(response, "__await__"):
                response = await response

            return {
                "status": "success",
                "question": question,
                "response": response,
            }

        except TimeoutError:
            logger.warning(f"Human response timeout for: {question}")
            raise

        except Exception as e:
            logger.error(f"Error asking human: {e}")
            raise RuntimeError(f"Failed to get user input: {e}")

    def get_schema(self) -> ToolSchema:
        """Get tool schema for LLM consumption."""
        return ToolSchema(
            name="ask_human",
            description="Ask human for confirmation, input, or decision",
            input_schema={
                "type": "object",
                "properties": {
                    "question": {
                        "type": "string",
                        "description": "Question or prompt for human",
                    },
                    "timeout_seconds": {
                        "type": "integer",
                        "description": "Maximum seconds to wait for response (default: 300)",
                    },
                },
                "required": ["question"],
            },
        )
