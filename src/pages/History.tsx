import React, { useState } from 'react';
import { TaskHistory } from '../components/task';
import { useTaskStore } from '../store/taskStore';
import { useUIStore } from '../store/uiStore';
import type { Task } from '../types';

interface HistoryPageProps {
  onTaskSelect?: (task: Task) => void;
}

/**
 * History Page - Shows task history with filtering and sorting
 */
export const HistoryPage: React.FC<HistoryPageProps> = ({ onTaskSelect }) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const taskStore = useTaskStore();
  const { addToast } = useUIStore();

  // Handle task deletion
  const handleTaskDelete = async (taskId: string) => {
    setIsDeleting(true);

    try {
      taskStore.deleteTask(taskId);
      addToast({
        id: Date.now().toString(),
        type: 'success',
        message: 'Task deleted successfully',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete task';
      addToast({
        id: Date.now().toString(),
        type: 'error',
        message,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle task selection
  const handleTaskSelect = (task: Task) => {
    taskStore.setCurrentTask(task);
    onTaskSelect?.(task);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900">Task History</h1>
          <p className="text-gray-600 mt-2">View and manage your task history</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow">
          <TaskHistory
            tasks={taskStore.history}
            onTaskSelect={handleTaskSelect}
            onTaskDelete={handleTaskDelete}
            isLoading={isDeleting}
          />
        </div>

        {/* Empty State */}
        {taskStore.history.length === 0 && (
          <div className="mt-8 bg-white rounded-lg shadow p-12">
            <div className="text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h3 className="mt-2 text-lg font-medium text-gray-900">No tasks yet</h3>
              <p className="mt-1 text-gray-500">Create a task to see it in your history</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryPage;
