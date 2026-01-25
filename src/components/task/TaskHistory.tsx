import React, { useState, useMemo } from 'react';
import type { Task } from '../../types';

interface TaskHistoryProps {
  tasks: Task[];
  onTaskSelect?: (task: Task) => void;
  onTaskDelete?: (taskId: string) => Promise<void>;
  isLoading?: boolean;
}

type SortField = 'date' | 'status' | 'goal';
type SortOrder = 'asc' | 'desc';

/**
 * TaskHistory Component - Displays list of tasks with filtering and sorting
 */
export const TaskHistory: React.FC<TaskHistoryProps> = ({
  tasks,
  onTaskSelect,
  onTaskDelete,
  isLoading = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);

  // Filter and sort tasks
  const filteredTasks = useMemo(() => {
    let result = [...tasks];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (task) =>
          task.goal.toLowerCase().includes(query) ||
          task.task_id.toLowerCase().includes(query)
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      result = result.filter((task) => task.status === statusFilter);
    }

    // Sort
    result.sort((a, b) => {
      let aVal: unknown;
      let bVal: unknown;

      if (sortField === 'date') {
        aVal = new Date(a.created_at).getTime();
        bVal = new Date(b.created_at).getTime();
      } else if (sortField === 'status') {
        aVal = a.status;
        bVal = b.status;
      } else if (sortField === 'goal') {
        aVal = a.goal.toLowerCase();
        bVal = b.goal.toLowerCase();
      }

      if (aVal === bVal) return 0;
      const isGreater = aVal! > bVal!;
      return sortOrder === 'asc' ? (isGreater ? 1 : -1) : isGreater ? -1 : 1;
    });

    return result;
  }, [tasks, searchQuery, statusFilter, sortField, sortOrder]);

  // Get status badge color
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'executing':
      case 'planning':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Handle task deletion
  const handleDelete = async (taskId: string) => {
    if (!onTaskDelete || isLoading) return;

    setDeletingTaskId(taskId);
    try {
      await onTaskDelete(taskId);
    } finally {
      setDeletingTaskId(null);
    }
  };

  // Unique statuses for filter
  const uniqueStatuses = Array.from(new Set(tasks.map((t) => t.status)));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="border-b pb-4">
        <h2 className="text-2xl font-bold text-gray-900">Task History</h2>
        <p className="text-sm text-gray-500 mt-1">{filteredTasks.length} task(s)</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 p-4 bg-gray-50 rounded-lg">
        {/* Search */}
        <div>
          <input
            type="text"
            placeholder="Search by goal or task ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        {/* Status Filter */}
        {uniqueStatuses.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              {uniqueStatuses.map((status) => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Sort */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as SortField)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="date">Date Created</option>
              <option value="status">Status</option>
              <option value="goal">Goal</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Order</label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as SortOrder)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-2">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No tasks found</p>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div
              key={task.task_id}
              className="border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer group"
              onClick={() => onTaskSelect?.(task)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-grow">
                  {/* Goal */}
                  <h3 className="font-semibold text-gray-900 line-clamp-2">{task.goal}</h3>

                  {/* Metadata */}
                  <div className="mt-2 flex flex-wrap gap-3 text-sm">
                    {/* Task ID */}
                    <span className="text-gray-500">ID: {task.task_id.substring(0, 8)}...</span>

                    {/* Date */}
                    <span className="text-gray-500">
                      {new Date(task.created_at).toLocaleDateString()}
                    </span>

                    {/* Status Badge */}
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(task.status)}`}>
                      {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="ml-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {onTaskDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(task.task_id);
                      }}
                      disabled={deletingTaskId === task.task_id || isLoading}
                      className="px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                    >
                      {deletingTaskId === task.task_id ? 'Deleting...' : 'Delete'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TaskHistory;
