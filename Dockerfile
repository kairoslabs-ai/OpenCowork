# Dockerfile for OpenCowork backend

FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Poetry
RUN curl -sSL https://install.python-poetry.org | python3 -

# Copy project files
COPY pyproject.toml poetry.lock* ./
COPY opencowork/ ./opencowork/

# Install dependencies
RUN /root/.local/bin/poetry install --no-dev

# Create non-root user
RUN useradd -m -u 1000 opencowork && chown -R opencowork:opencowork /app
USER opencowork

# Expose API port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Start the application
CMD ["/root/.local/bin/poetry", "run", "python", "-m", "opencowork.api"]
