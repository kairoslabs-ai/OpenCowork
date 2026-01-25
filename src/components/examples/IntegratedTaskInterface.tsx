import React from 'react';
import { TaskCreate, PlanReview, ExecutionMonitor } from '../../components/task';
import { useTask } from '../../hooks/useTask';
import { useUIStore } from '../../store/uiStore';
import type { TaskRequest, Plan } from '../../types';

/**
 * IntegratedTaskInterface - Example of fully integrated component
 * Shows how to use useTask hook with all task components
 */
export const IntegratedTaskInterface: React.FC = () => {
  const [currentPlan, setCurrentPlan] = React.useState<Plan | null>(null);
  const [executionLogs, setExecutionLogs] = React.useState<any[]>([]);

  // Use the task hook for all operations
  const { task, status, createTask, executeTask, cancelTask, isLoading, error } = useTask();
  const { addToast } = useUIStore();

  // Handle task creation
  const handleTaskCreate = async (request: TaskRequest) => {
    try {
      // The useTask hook handles the API call
      const createdTask = await createTask(request);
      
      // Show success notification
      addToast({
        id: Date.now().toString(),
        type: 'success',
        message: `Task created! ID: ${createdTask.task_id}`,
      });

      // Optionally fetch plan from API
      // const plan = await apiClient.getPlan(createdTask.task_id);
      // setCurrentPlan(plan);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create task';
      addToast({
        id: Date.now().toString(),
        type: 'error',
        message,
      });
    }
  };

  // Handle plan approval and execution
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

      // TODO: Subscribe to WebSocket for real-time logs
      // useWebSocket(task.task_id) would handle this
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
    <div className="space-y-8">
      {/* Task Creation */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Create Task</h2>
        <TaskCreate onSubmit={handleTaskCreate} isLoading={isLoading} />
      </section>

      {/* Plan Review */}
      {currentPlan && (
        <section className="bg-white rounded-lg shadow p-6">
          <PlanReview
            plan={currentPlan}
            isLoading={isLoading}
            onApprove={handlePlanApprove}
            onReject={handlePlanReject}
            onClose={() => setCurrentPlan(null)}
          />
        </section>
      )}

      {/* Execution Monitoring */}
      {task && (
        <section className="bg-white rounded-lg shadow p-6">
          <ExecutionMonitor
            taskId={task.task_id}
            status={status}
            logs={executionLogs}
            error={error}
          />
        </section>
      )}
    </div>
  );
};

export default IntegratedTaskInterface;
