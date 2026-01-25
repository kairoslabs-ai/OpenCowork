"""FastAPI application for OpenCowork."""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="OpenCowork API",
    description="Open-source agentic workspace API",
    version="0.1.0a0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "version": "0.1.0a0"}


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Welcome to OpenCowork API",
        "docs": "/docs",
        "version": "0.1.0a0",
    }


# TODO: Add routes for:
# - POST /tasks - Create task
# - GET /tasks/{id} - Get task status
# - POST /tasks/{id}/execute - Execute task
# - GET /tasks/{id}/logs - Get task logs
# - WebSocket for real-time updates

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
