"""Docker-based sandbox for command execution."""

import asyncio
import json
import logging
import subprocess
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)


@dataclass
class SandboxConfig:
    """Configuration for Docker sandbox."""

    image: str = "python:3.11-slim"
    """Docker image to use for sandbox."""

    timeout_seconds: int = 60
    """Command execution timeout."""

    memory_mb: int = 512
    """Memory limit in MB."""

    cpu_shares: int = 512
    """CPU shares (relative)."""

    mounts: Dict[str, Dict[str, str]] = field(default_factory=dict)
    """Mount mapping: {host_path: {mode: "ro"/"rw"}}."""

    environment: Dict[str, str] = field(default_factory=dict)
    """Environment variables to set."""

    network: str = "none"
    """Network mode: "none", "bridge", etc."""

    remove_after: bool = True
    """Remove container after execution."""


class DockerSandbox:
    """Execute commands in isolated Docker containers."""

    def __init__(self, config: Optional[SandboxConfig] = None):
        """Initialize Docker sandbox.

        Args:
            config: Sandbox configuration
        """
        self.config = config or SandboxConfig()
        self._verify_docker()

    def _verify_docker(self) -> None:
        """Verify Docker is available and responsive."""
        try:
            result = subprocess.run(
                ["docker", "version"],
                capture_output=True,
                timeout=5,
            )
            if result.returncode != 0:
                raise RuntimeError("Docker is not available")
            logger.info("Docker verified")
        except (FileNotFoundError, subprocess.TimeoutExpired) as e:
            raise RuntimeError(f"Docker verification failed: {e}")

    async def run_command(
        self,
        command: str,
        working_dir: str = "/work",
        input_data: Optional[str] = None,
    ) -> Tuple[int, str, str]:
        """Run command in sandbox.

        Args:
            command: Shell command to execute
            working_dir: Working directory in container
            input_data: Stdin data if any

        Returns:
            Tuple of (returncode, stdout, stderr)

        Raises:
            TimeoutError: If execution exceeds timeout
            RuntimeError: If Docker execution fails
        """
        container_id = str(uuid.uuid4())[:12]

        try:
            # Build Docker run command
            docker_cmd = self._build_docker_command(container_id, working_dir)

            logger.debug(f"Running in sandbox: {command}")

            # Execute with timeout
            try:
                result = await asyncio.wait_for(
                    self._execute_docker(docker_cmd, command, input_data),
                    timeout=self.config.timeout_seconds,
                )
                return result
            except asyncio.TimeoutError:
                logger.error(f"Command timed out after {self.config.timeout_seconds}s")
                raise TimeoutError(
                    f"Command exceeded {self.config.timeout_seconds}s timeout"
                )

        finally:
            # Clean up container
            if self.config.remove_after:
                await self._cleanup_container(container_id)

    def _build_docker_command(self, container_id: str, working_dir: str) -> List[str]:
        """Build docker run command."""
        cmd = [
            "docker",
            "run",
            "--name",
            container_id,
            "--rm",
            f"--memory={self.config.memory_mb}m",
            f"--cpus={self.config.cpu_shares / 1024}",
            f"--network={self.config.network}",
            f"--workdir={working_dir}",
        ]

        # Add mounts
        for host_path, mount_config in self.config.mounts.items():
            mode = mount_config.get("mode", "ro")
            cmd.extend(["-v", f"{host_path}:{working_dir}/{Path(host_path).name}:{mode}"])

        # Add environment variables
        for key, value in self.config.environment.items():
            cmd.extend(["-e", f"{key}={value}"])

        # Add image
        cmd.append(self.config.image)

        return cmd

    async def _execute_docker(
        self,
        docker_cmd: List[str],
        command: str,
        input_data: Optional[str],
    ) -> Tuple[int, str, str]:
        """Execute docker command and capture output."""
        # Add shell command
        full_cmd = docker_cmd + ["sh", "-c", command]

        try:
            process = await asyncio.create_subprocess_exec(
                *full_cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                stdin=asyncio.subprocess.PIPE if input_data else None,
            )

            stdout, stderr = await process.communicate(
                input=input_data.encode() if input_data else None
            )

            return (
                process.returncode,
                stdout.decode(errors="replace"),
                stderr.decode(errors="replace"),
            )

        except Exception as e:
            logger.error(f"Docker execution error: {e}")
            raise RuntimeError(f"Docker execution failed: {e}")

    async def _cleanup_container(self, container_id: str) -> None:
        """Clean up container if still running."""
        try:
            subprocess.run(
                ["docker", "rm", "-f", container_id],
                capture_output=True,
                timeout=5,
            )
            logger.debug(f"Cleaned up container {container_id}")
        except Exception as e:
            logger.warning(f"Failed to cleanup container {container_id}: {e}")

    async def health_check(self) -> bool:
        """Check if sandbox is healthy."""
        try:
            returncode, _, _ = await self.run_command("echo healthy")
            return returncode == 0
        except Exception:
            return False
