"""Base class for all tools."""

import json
import logging
from abc import ABC, abstractmethod
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class ToolParameter(BaseModel):
    """Parameter definition for a tool."""

    name: str = Field(..., description="Parameter name")
    type: str = Field(..., description="Parameter type (string, integer, boolean, etc.)")
    description: str = Field(..., description="Parameter description")
    required: bool = Field(default=True, description="Whether parameter is required")
    enum: Optional[list] = Field(None, description="Allowed values for enum types")
    default: Optional[Any] = Field(None, description="Default value")


class ToolSchema(BaseModel):
    """JSON Schema for a tool."""

    name: str = Field(..., description="Tool name")
    description: str = Field(..., description="Tool description")
    parameters: list[ToolParameter] = Field(default_factory=list, description="Tool parameters")

    def to_json_schema(self) -> Dict[str, Any]:
        """Convert to JSON schema format."""
        properties = {}
        required = []

        for param in self.parameters:
            prop = {
                "type": param.type,
                "description": param.description,
            }

            if param.enum:
                prop["enum"] = param.enum

            if param.default is not None:
                prop["default"] = param.default

            properties[param.name] = prop

            if param.required:
                required.append(param.name)

        return {
            "name": self.name,
            "description": self.description,
            "input_schema": {
                "type": "object",
                "properties": properties,
                "required": required,
            },
        }


class BaseTool(ABC):
    """Base class for all tools."""

    def __init__(self, name: str, description: str):
        """Initialize tool.

        Args:
            name: Tool name
            description: Tool description
        """
        self.name = name
        self.description = description
        self.logger = logging.getLogger(f"opencowork.tools.{name}")

    @abstractmethod
    async def execute(self, **kwargs: Any) -> Dict[str, Any]:
        """Execute the tool.

        Args:
            **kwargs: Tool-specific arguments

        Returns:
            Tool result dictionary
        """
        pass

    @abstractmethod
    def get_schema(self) -> ToolSchema:
        """Get the tool's JSON schema.

        Returns:
            ToolSchema object
        """
        pass

    def _validate_args(self, required_args: list[str], **kwargs: Any) -> bool:
        """Validate that required arguments are provided.

        Args:
            required_args: List of required argument names
            **kwargs: Provided arguments

        Returns:
            True if valid, False otherwise
        """
        for arg in required_args:
            if arg not in kwargs:
                self.logger.error(f"Missing required argument: {arg}")
                return False

        return True
