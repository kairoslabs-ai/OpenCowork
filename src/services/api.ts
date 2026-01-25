// OpenCowork API Client for Frontend

import type {
  TaskRequest,
  PlanResponse,
  ExecutionStatusResponse,
  ExecutionResponse,
  TaskHistoryResponse,
  AuditLogResponse,
  PolicyResponse,
  ConfirmationRequest,
  APIClientConfig,
  APIError,
} from "../types";

export class APIClient {
  private baseUrl: string;
  private timeout: number;
  private retryAttempts: number;
  private retryDelay: number;

  constructor(config: APIClientConfig) {
    this.baseUrl = config.baseUrl || "http://localhost:8000";
    this.timeout = config.timeout || 30000;
    this.retryAttempts = config.retryAttempts || 3;
    this.retryDelay = config.retryDelay || 1000;
  }

  /**
   * Make an HTTP request with retry logic
   */
  private async fetch<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.retryAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(url, {
          ...options,
          headers,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const error = new Error(`HTTP ${response.status}`) as APIError;
          error.status = response.status;
          error.statusText = response.statusText;
          throw error;
        }

        return (await response.json()) as T;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < this.retryAttempts - 1) {
          await this.delay(this.retryDelay * (attempt + 1));
        }
      }
    }

    throw (
      lastError || new Error("Failed to complete request after retries")
    );
  }

  /**
   * Delay utility for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // =========================================================================
  // Task Planning Endpoints
  // =========================================================================

  /**
   * Create a new task and generate an execution plan
   */
  async createPlan(request: TaskRequest): Promise<PlanResponse> {
    return this.fetch<PlanResponse>("/api/tasks/plan", {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  /**
   * Get the plan for an existing task
   */
  async getPlan(taskId: string): Promise<PlanResponse> {
    return this.fetch<PlanResponse>(`/api/tasks/${taskId}/plan`);
  }

  // =========================================================================
  // Task Execution Endpoints
  // =========================================================================

  /**
   * Start executing a task plan
   */
  async executeTask(taskId: string): Promise<ExecutionStatusResponse> {
    return this.fetch<ExecutionStatusResponse>(
      `/api/tasks/${taskId}/execute`,
      {
        method: "POST",
      }
    );
  }

  /**
   * Get current execution status
   */
  async getExecutionStatus(
    taskId: string
  ): Promise<ExecutionStatusResponse> {
    return this.fetch<ExecutionStatusResponse>(
      `/api/tasks/${taskId}/status`
    );
  }

  /**
   * Get final execution result
   */
  async getExecutionResult(taskId: string): Promise<ExecutionResponse> {
    return this.fetch<ExecutionResponse>(`/api/tasks/${taskId}/result`);
  }

  /**
   * Cancel a running task
   */
  async cancelTask(taskId: string): Promise<{ status: string }> {
    return this.fetch<{ status: string }>(
      `/api/tasks/${taskId}/cancel`,
      {
        method: "POST",
      }
    );
  }

  // =========================================================================
  // User Confirmation Endpoints
  // =========================================================================

  /**
   * Confirm or reject an action
   */
  async confirmAction(
    taskId: string,
    request: ConfirmationRequest
  ): Promise<{ confirmed: boolean }> {
    return this.fetch<{ confirmed: boolean }>(
      `/api/tasks/${taskId}/confirm`,
      {
        method: "POST",
        body: JSON.stringify(request),
      }
    );
  }

  // =========================================================================
  // Task History Endpoints
  // =========================================================================

  /**
   * List all tasks with pagination
   */
  async listTasks(
    limit: number = 20,
    offset: number = 0,
    status?: string
  ): Promise<TaskHistoryResponse> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });

    if (status) {
      params.append("status", status);
    }

    return this.fetch<TaskHistoryResponse>(
      `/api/tasks?${params.toString()}`
    );
  }

  /**
   * Get details for a specific task
   */
  async getTask(
    taskId: string
  ): Promise<{
    task_id: string;
    goal: string;
    description: string;
    status: string;
    created_at: string;
    started_at?: string | null;
    completed_at?: string | null;
    result?: string | null;
    error?: string | null;
    metadata: Record<string, unknown>;
  }> {
    return this.fetch(`/api/tasks/${taskId}`);
  }

  /**
   * Delete a task
   */
  async deleteTask(taskId: string): Promise<{ deleted: boolean }> {
    return this.fetch<{ deleted: boolean }>(
      `/api/tasks/${taskId}`,
      {
        method: "DELETE",
      }
    );
  }

  // =========================================================================
  // Audit Log Endpoints
  // =========================================================================

  /**
   * Get audit log entries
   */
  async getAuditLog(
    limit: number = 100,
    offset: number = 0,
    taskId?: string
  ): Promise<AuditLogResponse> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });

    if (taskId) {
      params.append("task_id", taskId);
    }

    return this.fetch<AuditLogResponse>(
      `/api/audit?${params.toString()}`
    );
  }

  // =========================================================================
  // Policy Endpoints
  // =========================================================================

  /**
   * Get current permission policy
   */
  async getPolicy(): Promise<PolicyResponse> {
    return this.fetch<PolicyResponse>("/api/policies");
  }

  /**
   * Update permission policy
   */
  async updatePolicy(policy: PolicyResponse): Promise<{ updated: boolean }> {
    return this.fetch<{ updated: boolean }>("/api/policies", {
      method: "PUT",
      body: JSON.stringify(policy),
    });
  }

  // =========================================================================
  // Health Check
  // =========================================================================

  /**
   * Check if server is healthy
   */
  async healthCheck(): Promise<{ status: string; version: string }> {
    return this.fetch<{ status: string; version: string }>("/health");
  }
}

/**
 * Create and return a configured API client instance
 */
export function createAPIClient(baseUrl?: string): APIClient {
  return new APIClient({
    baseUrl: baseUrl || "http://localhost:8000",
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000,
  });
}

/**
 * Default API client instance (singleton)
 */
export const apiClient = createAPIClient();
