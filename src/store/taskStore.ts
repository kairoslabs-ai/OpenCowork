import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TaskStore, Task } from '../types';
import type { ExecutionStatus } from '../types';

/**
 * Task store - Manages all tasks and execution state
 */
export const useTaskStore = create<TaskStore>()(
  persist(
    (set) => ({
      tasks: [],
      currentTask: null,
      isExecuting: false,
      history: [],

      addTask: (task: Task) =>
        set((state) => ({
          tasks: [task, ...state.tasks],
          history: [task, ...state.history].slice(0, 100), // Keep last 100
        })),

      updateTask: (task: Task) =>
        set((state) => ({
          tasks: state.tasks.map((t) => (t.task_id === task.task_id ? task : t)),
          currentTask: state.currentTask?.task_id === task.task_id ? task : state.currentTask,
          history: state.history.map((t) => (t.task_id === task.task_id ? task : t)),
        })),

      deleteTask: (taskId: string) =>
        set((state) => ({
          tasks: state.tasks.filter((t) => t.task_id !== taskId),
          currentTask: state.currentTask?.task_id === taskId ? null : state.currentTask,
        })),

      setCurrentTask: (task: Task | null) =>
        set({ currentTask: task }),

      clearHistory: () =>
        set({ history: [] }),
    }),
    {
      name: 'task-store',
      version: 1,
    }
  )
);
