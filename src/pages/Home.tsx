import React, { useState } from 'react';
import { TaskCreate, PlanReview, ExecutionMonitor } from '../components/task';
import { useTask } from '../hooks/useTask';
import { useUIStore } from '../store/uiStore';
import type { TaskRequest, Plan } from '../types';

/**
 * Home Page - Main interface for task creation and execution
 */
export const HomePage: React.FC = () => {
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [executionLogs, setExecutionLogs] = useState<any[]>([]);

  const { task, status, createTask, executeTask, isLoading, error } = useTask();
  const { addToast } = useUIStore();

  // Handle task creation
  const handleTaskCreate = async (request: TaskRequest) => {
    try {
      const createdTask = await createTask(request);
      addToast({
        id: Date.now().toString(),
        type: 'success',
        message: `Task created successfully! ID: ${createdTask.task_id}`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create task';
      addToast({
        id: Date.now().toString(),
        type: 'error',
        message,
      });
    }
  };

  // Handle plan approval
  const handlePlanApprove = async (plan: Plan) => {
    if (!task) return;

    try {
      await executeTask(task.task_id);
      setCurrentPlan(null);
      addToast({
        id: Date.now().toString(),
        type: 'success',
        message: 'Plan approved! Execution started.',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to execute task';
      addToast({
        id: Date.now().toString(),
        type: 'error',
        message,
      });
    }
  };

  // Handle plan rejection
  const handlePlanReject = async (plan: Plan, reason?: string) => {
    addToast({
      id: Date.now().toString(),
      type: 'warning',
      message: `Plan rejected${reason ? ': ' + reason : ''}`,
    });
    setCurrentPlan(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900">OpenCowork</h1>
          <p className="text-gray-600 mt-2">Create, plan, and execute your tasks with AI assistance</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Task Creation */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6">
              <TaskCreate onSubmit={handleTaskCreate} isLoading={isLoading} />
            </div>
          </div>

          {/* Right Column - Plan & Execution */}
          <div className="lg:col-span-2 space-y-8">
            {/* Error Alert */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="text-red-900 font-semibold mb-1">Error</h3>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* Plan Review */}
            {currentPlan && (
              <div className="bg-white rounded-lg shadow p-6">
                <PlanReview
                  plan={currentPlan}
                  isLoading={isLoading}
                  onApprove={handlePlanApprove}
                  onReject={handlePlanReject}
                  onClose={() => setCurrentPlan(null)}
                />
              </div>
            )}

            {/* Execution Monitor */}
            {task && (
              <div className="bg-white rounded-lg shadow p-6">
                <ExecutionMonitor
                  taskId={task.task_id}
                  status={status}
                  logs={executionLogs}
                  error={error}
                />
              </div>
            )}

            {/* Empty State */}
            {!task && !currentPlan && !error && (
              <div className="bg-white rounded-lg shadow p-12">
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
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                  <h3 className="mt-2 text-lg font-medium text-gray-900">Get started</h3>
                  <p className="mt-1 text-gray-500">Create a task on the left to get started</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
