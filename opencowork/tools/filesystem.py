"""File system tools for OpenCowork."""

import logging
import os
import shutil
from pathlib import Path
from typing import Any, Dict, Optional

from opencowork.tools.base import BaseTool, ToolParameter, ToolSchema

logger = logging.getLogger(__name__)


class FileReadTool(BaseTool):
    """Read file contents."""

    def __init__(self):
        """Initialize file read tool."""
        super().__init__(
            name="file_read",
            description="Read contents of a file",
        )

    async def execute(
        self, path: str, start_line: Optional[int] = None, end_line: Optional[int] = None
    ) -> Dict[str, Any]:
        """Read file.

        Args:
            path: File path
            start_line: Optional start line (1-indexed)
            end_line: Optional end line (1-indexed)

        Returns:
            File contents and metadata
        """
        if not self._validate_args(["path"], path=path):
            return {"error": "Missing required arguments", "status": "failed"}

        try:
            file_path = Path(path).resolve()

            if not file_path.exists():
                return {"error": f"File not found: {path}", "status": "failed"}

            if not file_path.is_file():
                return {"error": f"Path is not a file: {path}", "status": "failed"}

            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()

            # Handle line range
            if start_line or end_line:
                lines = content.split("\n")
                start_idx = (start_line - 1) if start_line else 0
                end_idx = end_line if end_line else len(lines)
                content = "\n".join(lines[start_idx:end_idx])

            return {
                "status": "success",
                "path": str(file_path),
                "content": content,
                "size_bytes": len(content),
                "line_count": len(content.split("\n")),
            }

        except Exception as e:
            self.logger.error(f"Failed to read file: {str(e)}")
            return {"error": str(e), "status": "failed"}

    def get_schema(self) -> ToolSchema:
        """Get tool schema."""
        return ToolSchema(
            name=self.name,
            description=self.description,
            parameters=[
                ToolParameter(
                    name="path",
                    type="string",
                    description="Absolute or relative file path",
                    required=True,
                ),
                ToolParameter(
                    name="start_line",
                    type="integer",
                    description="Start reading from line N (optional)",
                    required=False,
                ),
                ToolParameter(
                    name="end_line",
                    type="integer",
                    description="Stop reading at line N (optional)",
                    required=False,
                ),
            ],
        )


class FileWriteTool(BaseTool):
    """Write or create a file."""

    def __init__(self):
        """Initialize file write tool."""
        super().__init__(
            name="file_write",
            description="Create or overwrite a file with content",
        )

    async def execute(
        self, path: str, content: str, mode: str = "write"
    ) -> Dict[str, Any]:
        """Write file.

        Args:
            path: File path
            content: Content to write
            mode: "write" (overwrite) or "append"

        Returns:
            Write result and metadata
        """
        if not self._validate_args(["path", "content"], path=path, content=content):
            return {"error": "Missing required arguments", "status": "failed"}

        try:
            file_path = Path(path).resolve()
            file_path.parent.mkdir(parents=True, exist_ok=True)

            write_mode = "a" if mode == "append" else "w"

            with open(file_path, write_mode, encoding="utf-8") as f:
                f.write(content)

            return {
                "status": "success",
                "path": str(file_path),
                "bytes_written": len(content.encode("utf-8")),
                "mode": mode,
            }

        except Exception as e:
            self.logger.error(f"Failed to write file: {str(e)}")
            return {"error": str(e), "status": "failed"}

    def get_schema(self) -> ToolSchema:
        """Get tool schema."""
        return ToolSchema(
            name=self.name,
            description=self.description,
            parameters=[
                ToolParameter(
                    name="path",
                    type="string",
                    description="File path",
                    required=True,
                ),
                ToolParameter(
                    name="content",
                    type="string",
                    description="Content to write",
                    required=True,
                ),
                ToolParameter(
                    name="mode",
                    type="string",
                    description="Write mode",
                    required=False,
                    enum=["write", "append"],
                    default="write",
                ),
            ],
        )


class FileListTool(BaseTool):
    """List files in a directory."""

    def __init__(self):
        """Initialize file list tool."""
        super().__init__(
            name="file_list",
            description="List files and directories in a folder",
        )

    async def execute(
        self, path: str = ".", pattern: Optional[str] = None
    ) -> Dict[str, Any]:
        """List directory contents.

        Args:
            path: Directory path
            pattern: Optional glob pattern to filter

        Returns:
            Directory listing
        """
        try:
            dir_path = Path(path).resolve()

            if not dir_path.exists():
                return {"error": f"Directory not found: {path}", "status": "failed"}

            if not dir_path.is_dir():
                return {"error": f"Path is not a directory: {path}", "status": "failed"}

            items = []

            for item in sorted(dir_path.iterdir()):
                try:
                    size = item.stat().st_size if item.is_file() else None
                    items.append(
                        {
                            "name": item.name,
                            "type": "directory" if item.is_dir() else "file",
                            "size_bytes": size,
                            "path": str(item),
                        }
                    )
                except Exception as e:
                    self.logger.warning(f"Could not stat {item}: {str(e)}")

            return {
                "status": "success",
                "path": str(dir_path),
                "items": items,
                "count": len(items),
            }

        except Exception as e:
            self.logger.error(f"Failed to list directory: {str(e)}")
            return {"error": str(e), "status": "failed"}

    def get_schema(self) -> ToolSchema:
        """Get tool schema."""
        return ToolSchema(
            name=self.name,
            description=self.description,
            parameters=[
                ToolParameter(
                    name="path",
                    type="string",
                    description="Directory path",
                    required=False,
                    default=".",
                ),
                ToolParameter(
                    name="pattern",
                    type="string",
                    description="Glob pattern to filter files (optional)",
                    required=False,
                ),
            ],
        )


class FileMoveTool(BaseTool):
    """Move or rename a file."""

    def __init__(self):
        """Initialize file move tool."""
        super().__init__(
            name="file_move",
            description="Move or rename a file",
        )

    async def execute(self, source: str, destination: str) -> Dict[str, Any]:
        """Move file.

        Args:
            source: Source path
            destination: Destination path

        Returns:
            Move result
        """
        if not self._validate_args(["source", "destination"], source=source, destination=destination):
            return {"error": "Missing required arguments", "status": "failed"}

        try:
            src_path = Path(source).resolve()
            dst_path = Path(destination).resolve()

            if not src_path.exists():
                return {"error": f"Source not found: {source}", "status": "failed"}

            dst_path.parent.mkdir(parents=True, exist_ok=True)
            shutil.move(str(src_path), str(dst_path))

            return {
                "status": "success",
                "source": str(src_path),
                "destination": str(dst_path),
            }

        except Exception as e:
            self.logger.error(f"Failed to move file: {str(e)}")
            return {"error": str(e), "status": "failed"}

    def get_schema(self) -> ToolSchema:
        """Get tool schema."""
        return ToolSchema(
            name=self.name,
            description=self.description,
            parameters=[
                ToolParameter(
                    name="source",
                    type="string",
                    description="Source file path",
                    required=True,
                ),
                ToolParameter(
                    name="destination",
                    type="string",
                    description="Destination file path",
                    required=True,
                ),
            ],
        )


class FileDeleteTool(BaseTool):
    """Delete a file."""

    def __init__(self, require_confirmation: bool = True):
        """Initialize file delete tool.

        Args:
            require_confirmation: Whether to require user confirmation
        """
        super().__init__(
            name="file_delete",
            description="Delete a file",
        )
        self.require_confirmation = require_confirmation

    async def execute(self, path: str) -> Dict[str, Any]:
        """Delete file.

        Args:
            path: File path

        Returns:
            Delete result
        """
        if not self._validate_args(["path"], path=path):
            return {"error": "Missing required arguments", "status": "failed"}

        try:
            file_path = Path(path).resolve()

            if not file_path.exists():
                return {"error": f"File not found: {path}", "status": "failed"}

            if not file_path.is_file():
                return {"error": f"Path is not a file: {path}", "status": "failed"}

            # TODO: Implement confirmation mechanism
            file_path.unlink()

            return {
                "status": "success",
                "path": str(file_path),
                "message": f"Deleted {file_path.name}",
            }

        except Exception as e:
            self.logger.error(f"Failed to delete file: {str(e)}")
            return {"error": str(e), "status": "failed"}

    def get_schema(self) -> ToolSchema:
        """Get tool schema."""
        return ToolSchema(
            name=self.name,
            description=self.description,
            parameters=[
                ToolParameter(
                    name="path",
                    type="string",
                    description="File path to delete",
                    required=True,
                ),
            ],
        )


class TextSearchTool(BaseTool):
    """Search for text in files."""

    def __init__(self):
        """Initialize text search tool."""
        super().__init__(
            name="text_search",
            description="Search for text in files",
        )

    async def execute(self, directory: str, pattern: str, recursive: bool = True) -> Dict[str, Any]:
        """Search for text.

        Args:
            directory: Directory to search in
            pattern: Text pattern to search for
            recursive: Search recursively in subdirectories

        Returns:
            Search results
        """
        if not self._validate_args(["directory", "pattern"], directory=directory, pattern=pattern):
            return {"error": "Missing required arguments", "status": "failed"}

        try:
            search_dir = Path(directory).resolve()

            if not search_dir.exists():
                return {"error": f"Directory not found: {directory}", "status": "failed"}

            results = []

            for file_path in search_dir.rglob("*") if recursive else search_dir.glob("*"):
                if not file_path.is_file():
                    continue

                try:
                    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                        for line_num, line in enumerate(f, 1):
                            if pattern.lower() in line.lower():
                                results.append(
                                    {
                                        "file": str(file_path),
                                        "line": line_num,
                                        "content": line.rstrip(),
                                    }
                                )
                except Exception as e:
                    self.logger.warning(f"Could not search {file_path}: {str(e)}")

            return {
                "status": "success",
                "pattern": pattern,
                "directory": str(search_dir),
                "results": results,
                "count": len(results),
            }

        except Exception as e:
            self.logger.error(f"Failed to search: {str(e)}")
            return {"error": str(e), "status": "failed"}

    def get_schema(self) -> ToolSchema:
        """Get tool schema."""
        return ToolSchema(
            name=self.name,
            description=self.description,
            parameters=[
                ToolParameter(
                    name="directory",
                    type="string",
                    description="Directory to search",
                    required=True,
                ),
                ToolParameter(
                    name="pattern",
                    type="string",
                    description="Text pattern to search for",
                    required=True,
                ),
                ToolParameter(
                    name="recursive",
                    type="boolean",
                    description="Search recursively",
                    required=False,
                    default=True,
                ),
            ],
        )


class TextReplaceTool(BaseTool):
    """Replace text in files."""

    def __init__(self, require_confirmation: bool = True):
        """Initialize text replace tool.

        Args:
            require_confirmation: Whether to require user confirmation
        """
        super().__init__(
            name="text_replace",
            description="Replace text in a file",
        )
        self.require_confirmation = require_confirmation

    async def execute(self, path: str, old_text: str, new_text: str) -> Dict[str, Any]:
        """Replace text in file.

        Args:
            path: File path
            old_text: Text to find
            new_text: Replacement text

        Returns:
            Replace result
        """
        if not self._validate_args(
            ["path", "old_text", "new_text"], path=path, old_text=old_text, new_text=new_text
        ):
            return {"error": "Missing required arguments", "status": "failed"}

        try:
            file_path = Path(path).resolve()

            if not file_path.exists():
                return {"error": f"File not found: {path}", "status": "failed"}

            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()

            if old_text not in content:
                return {"error": f"Pattern not found in file", "status": "failed"}

            new_content = content.replace(old_text, new_text)

            with open(file_path, "w", encoding="utf-8") as f:
                f.write(new_content)

            occurrences = content.count(old_text)

            return {
                "status": "success",
                "path": str(file_path),
                "occurrences_replaced": occurrences,
            }

        except Exception as e:
            self.logger.error(f"Failed to replace text: {str(e)}")
            return {"error": str(e), "status": "failed"}

    def get_schema(self) -> ToolSchema:
        """Get tool schema."""
        return ToolSchema(
            name=self.name,
            description=self.description,
            parameters=[
                ToolParameter(
                    name="path",
                    type="string",
                    description="File path",
                    required=True,
                ),
                ToolParameter(
                    name="old_text",
                    type="string",
                    description="Text to find",
                    required=True,
                ),
                ToolParameter(
                    name="new_text",
                    type="string",
                    description="Replacement text",
                    required=True,
                ),
            ],
        )


# Tool registry
FILESYSTEM_TOOLS = {
    "file_read": FileReadTool,
    "file_write": FileWriteTool,
    "file_list": FileListTool,
    "file_move": FileMoveTool,
    "file_delete": FileDeleteTool,
    "text_search": TextSearchTool,
    "text_replace": TextReplaceTool,
}
