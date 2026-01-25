import React, { useState } from 'react';
import { PlanReview, ExecutionMonitor, LogViewer, ConfirmationDialog } from '../components/task';
import { Button } from '../components/common/Button';
import { useTask } from '../hooks/useTask';
import type { Task, Plan } from '../types';

interface TaskDetailProps {
  task: Task | null;
  onBack?: () => void;
}

/**
 * TaskDetail Page - Shows detailed task information, plan, and execution
 */
export const TaskDetailPage: React.FC<TaskDetailProps> = ({ task, onBack }) => {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const { executeTask, cancelTask, isLoading, error } = useTask();

  if (!task) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900">No task selected</h3>
          <Button onClick={onBack} className="mt-4">
            Go back
          </Button>
        </div>
      </div>
    );
  }

  const handleExecute = async () => {
    try {
      await executeTask(task.task_id);
    } catch (err) {
      console.error('Failed to execute task:', err);
    }
  };

  const handleCancel = async () => {
    try {
      await cancelTask(task.task_id);
      setShowCancelDialog(false);
    } catch (err) {
      console.error('Failed to cancel task:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              {onBack && (
                <button onClick={onBack} className="text-primary hover:text-primary-dark mb-2">
                  ← Back to history
                </button>
              )}
              <h1 className="text-3xl font-bold text-gray-900 mt-2">Task Details</h1>
              <p className="text-gray-600 mt-1">ID: {task.task_id}</p>
            </div>

            {/* Status Badge */}
            <div className="text-right">
              <span className={`inline-block px-4 py-2 rounded-full font-semibold ${
                task.status === 'completed'
                  ? 'bg-green-100 text-green-800'
                  : task.status === 'executing' || task.status === 'planning'
                    ? 'bg-blue-100 text-blue-800'
                    : task.status === 'failed'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-800'
              }`}>
                {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Task Information */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Task Information</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Goal</label>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded">{task.goal}</p>
                </div>

                {task.metadata && Object.keys(task.metadata).length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Metadata</label>
                    <pre className="text-sm bg-gray-50 p-3 rounded overflow-x-auto">
                      {JSON.stringify(task.metadata, null, 2)}
                    </pre>
                  </div>
                )}

                <div className="pt-4 border-t flex gap-3">
                  {task.status === 'not_started' && (
                    <Button variant="primary" onClick={handleExecute} disabled={isLoading}>
                      Start Task
                    </Button>
                  )}

                  {(task.status === 'executing' || task.status === 'planning') && (
                    <Button
                      variant="danger"
                      onClick={() => setShowCancelDialog(true)}
                      disabled={isLoading}
                    >
                      Cancel Task
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Plan Review */}
            {plan && (
              <div className="bg-white rounded-lg shadow p-6">
                <PlanReview
                  plan={plan}
                  isLoading={isLoading}
                  onApprove={handleExecute}
                  onClose={() => setPlan(null)}
                />
              </div>
            )}

            {/* Execution Monitor */}
            <div className="bg-white rounded-lg shadow p-6">
              <ExecutionMonitor
                taskId={task.task_id}
                status={task.status}
                logs={logs}
                error={error}
              />
            </div>

            {/* Logs */}
            {logs.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <LogViewer logs={logs} onClear={() => setLogs([])} />
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Task Stats */}
            <div className="bg-white rounded-lg shadow p-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Task Info</h3>

              <div>
                <label className="block text-sm font-medium text-gray-600">Created</label>
                <p className="text-gray-900">{new Date(task.created_at).toLocaleString()}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600">Status</label>
                <p className="text-gray-900 capitalize">{task.status}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showCancelDialog}
        title="Cancel Task?"
        message="Are you sure you want to cancel this task? This action cannot be undone."
        confirmText="Cancel Task"
        cancelText="Keep Task"
        variant="danger"
        onConfirm={handleCancel}
        onCancel={() => setShowCancelDialog(false)}
        isLoading={isLoading}
      />
    </div>
  );
};

export default TaskDetailPage;
