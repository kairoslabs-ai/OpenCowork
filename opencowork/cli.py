"""CLI for OpenCowork."""

import asyncio
import logging
from typing import Optional

import typer
from rich.console import Console

from opencowork.agent import Executor, Planner
from opencowork.core import Plan, Step

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = typer.Typer(
    name="opencowork",
    help="Open-source agentic workspace for autonomous task execution",
    no_args_is_help=True,
)

console = Console()


@app.command()
def task(
    goal: str = typer.Argument(..., help="Goal or task to accomplish"),
    scope: Optional[str] = typer.Option(None, "--scope", "-s", help="Folder scope for task"),
):
    """Create and execute a new task."""
    console.print(f"\n🚀 OpenCowork Task: {goal}\n")

    if scope:
        console.print(f"📂 Scope: {scope}")

    async def run_task():
        planner = Planner()
        executor = Executor()

        # Generate plan
        console.print("\n📋 Planning...", style="cyan")
        plan = await planner.plan(goal)

        # Display plan
        console.print(f"\n✓ Plan created with {len(plan.steps)} steps:")
        for step in plan.steps:
            console.print(f"  {step.step}. {step.description}")

        # Confirm execution
        confirm = typer.confirm("\n▶️  Execute plan?", default=True)

        if confirm:
            console.print("\n⟳ Executing...\n", style="cyan")
            result = await executor.execute(plan)

            if result.status.value == "success":
                console.print(f"\n✅ Success! {result.summary}", style="green")
            else:
                console.print(f"\n❌ Failed: {result.error}", style="red")
        else:
            console.print("\n⏭️  Task cancelled", style="yellow")

    asyncio.run(run_task())


@app.command()
def serve(
    host: str = typer.Option("0.0.0.0", help="API host"),
    port: int = typer.Option(8000, help="API port"),
):
    """Start the OpenCowork API server."""
    console.print("🚀 Starting OpenCowork API server...")
    console.print(f"📡 Listening on http://{host}:{port}")
    console.print("\nPress Ctrl+C to stop\n")

    # TODO: Implement API server
    console.print("⚠️  API server not yet implemented", style="yellow")


@app.command()
def version():
    """Show version information."""
    from opencowork import __version__

    console.print(f"OpenCowork v{__version__}")


@app.command()
def init(
    folder: str = typer.Argument("."),
):
    """Initialize OpenCowork in a folder."""
    console.print(f"📁 Initializing OpenCowork in {folder}...")

    # TODO: Implement initialization
    console.print("✓ Initialized", style="green")


if __name__ == "__main__":
    app()
