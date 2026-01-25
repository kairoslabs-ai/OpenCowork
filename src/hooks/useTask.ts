import { useState, useCallback } from 'react';
import { useTaskStore } from '../store/taskStore';
import { apiClient } from '../services/api';
import type { TaskRequest, UseTaskReturn } from '../types';

/**
 * useTask - Manages task creation, execution, and status
 */
export function useTask(): UseTaskReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const taskStore = useTaskStore();
  const currentTask = taskStore.currentTask;
  const status = currentTask?.status || 'not_started';

  const createTask = useCallback(
    async (request: TaskRequest) => {
      setIsLoading(true);
      setError(null);

      try {
        const plan = await apiClient.createPlan(request);

        // Create task object from plan response
        const task = {
          task_id: plan.task_id,
          goal: plan.goal,
          description: request.description || '',
          status: 'not_started' as const,
          created_at: new Date().toISOString(),
          metadata: {},
        };

        taskStore.addTask(task);
        taskStore.setCurrentTask(task);

        return task;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create task';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [taskStore]
  );

  const executeTask = useCallback(
    async (taskId: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await apiClient.executeTask(taskId);

        // Update task status
        if (currentTask && currentTask.task_id === taskId) {
          const updated = { ...currentTask, status: response.status };
          taskStore.updateTask(updated);
          taskStore.setCurrentTask(updated);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to execute task';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [currentTask, taskStore]
  );

  const cancelTask = useCallback(
    async (taskId: string) => {
      setIsLoading(true);
      setError(null);

      try {
        await apiClient.cancelTask(taskId);

        // Update task status
        if (currentTask && currentTask.task_id === taskId) {
          const updated = { ...currentTask, status: 'cancelled' as const };
          taskStore.updateTask(updated);
          taskStore.setCurrentTask(updated);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to cancel task';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [currentTask, taskStore]
  );

  return {
    task: currentTask || null,
    status,
    createTask,
    executeTask,
    cancelTask,
    isLoading,
    error,
  };
}
