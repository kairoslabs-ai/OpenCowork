# OpenCowork

> **Open-source agentic workspace for autonomous multi-step task execution**

An open-source, self-hosted alternative to Claude Cowork. Plan and execute complex multi-step tasks on local files, folders, and tools with strong safety boundaries and human-in-the-loop control.

## Features

✅ **Autonomous Task Planning** — Goal → structured execution plan  
✅ **Multi-Step Execution** — Run complex workflows automatically  
✅ **Sandboxed Execution** — Docker-based isolation for safety  
✅ **Permission Model** — Fine-grained access control with audit logs  
✅ **Desktop UI** — Intuitive task management and monitoring  
✅ **Model-Agnostic** — Works with local (Ollama) or cloud LLMs  
✅ **Open Source** — MIT license, full transparency  

## Quick Start

### Prerequisites

- Python 3.11+
- Docker (for sandboxing)
- Node.js 18+ (for desktop UI)

### Installation

```bash
# Clone the repository
git clone https://github.com/kairoslabs-ai/opencowork.git
cd opencowork

# Setup Python environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install poetry
poetry install

# Start development server
python -m opencowork serve
```

### First Task

```bash
opencowork task "Organize my downloads by file type"
```

## Project Structure

```
opencowork/
├── opencowork/          # Main package
│   ├── agent/          # Planner & Executor
│   ├── tools/          # Tool implementations
│   ├── sandbox/        # Docker isolation
│   ├── api/            # FastAPI backend
│   └── core.py         # Core types
├── ui/                 # Tauri desktop app
├── tests/              # Test suite
├── docs/               # Documentation
└── policies/           # Permission configs
```

## Architecture

```
┌─────────────────────────────┐
│   Desktop UI (Tauri)        │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  Agent Orchestrator         │
│  (Planner + Executor)       │
└────────┬────────────────────┘
         │
    ┌────┴────────┐
    │             │
    ▼             ▼
┌─────────┐  ┌──────────┐
│ Tools   │  │ Sandbox  │
│ Layer   │  │ (Docker) │
└─────────┘  └──────────┘
```

## Development Status

🚀 **Phase 0 (Setup)** — Repository structure & CI/CD  
⏳ **Phase 1 (Core Agent)** — Planner, Executor, Tools  
⏳ **Phase 2 (Sandbox)** — Docker isolation & permissions  
⏳ **Phase 3 (UI)** — Desktop application  
⏳ **Phase 4 (Polish)** — Testing & release  

**Target Release**: March 2026 (v0.1-alpha)

## Contributing

We welcome contributions! See [CONTRIBUTING.md](docs/CONTRIBUTING.md) for guidelines.

## Documentation

- [Architecture Guide](docs/ARCHITECTURE.md)
- [API Reference](docs/API.md)
- [Security Model](docs/SAFETY.md)
- [Implementation Plan](IMPLEMENTATION_PLAN.md)

## License

MIT License — see [LICENSE](LICENSE)

## Status

**Current Version**: 0.1.0-alpha  
**Last Updated**: January 25, 2026

---

Built with ❤️ for the open-source AI community.
