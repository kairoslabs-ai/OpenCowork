import { useState, useCallback } from 'react';
import { useTaskStore } from '../store/taskStore';
import { apiClient } from '../services/api';
import type { TaskRequest } from '../types';

/**
 * useTask - Manages task creation, execution, and status
 */
export function useTask() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const taskStore = useTaskStore();
  const currentTask = taskStore.currentTask;
  const status = currentTask?.status || 'not_started';

  const getTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.listTasks(100, 0);
      const tasks = response.tasks.map((t: any) => ({
        task_id: t.task_id,
        goal: t.goal,
        description: t.description || '',
        status: t.status as any,
        created_at: t.created_at,
        metadata: {},
      }));
      return tasks;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load tasks';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

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

  const confirmTask = useCallback(
    async (taskId: string, confirmed: boolean) => {
      setIsLoading(true);
      setError(null);

      try {
        await apiClient.confirmAction(taskId, {
          task_id: taskId,
          action: 'confirm',
          confirmed: confirmed,
        });

        // Update task or fetch fresh status
        if (currentTask && currentTask.task_id === taskId) {
          // Re-fetch task status after confirmation
          const tasks = await getTasks();
          const updated = tasks?.find((t: any) => t.task_id === taskId);
          if (updated) {
            taskStore.updateTask(updated);
            taskStore.setCurrentTask(updated);
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to confirm task';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [currentTask, taskStore, getTasks]
  );

  return {
    task: currentTask || null,
    status,
    createTask,
    executeTask,
    cancelTask,
    confirmTask,
    getTasks,
    isLoading,
    error,
  };
}
