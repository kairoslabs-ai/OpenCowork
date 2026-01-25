import React, { useMemo, useEffect, useState } from 'react';
import { Progress } from '../common/Progress';
import { LogViewer } from './LogViewer';
import type { ExecutionLog } from '../../types';

interface ExecutionMonitorProps {
  taskId: string;
  status: 'not_started' | 'planning' | 'executing' | 'completed' | 'failed' | 'cancelled';
  logs?: ExecutionLog[];
  currentStep?: number;
  totalSteps?: number;
  error?: string | null;
  onStatusChange?: (status: string) => void;
}

interface StatusConfig {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
}

const STATUS_CONFIG: Record<string, StatusConfig> = {
  not_started: { label: 'Not Started', color: 'text-gray-700', bgColor: 'bg-gray-100', icon: '◯' },
  planning: { label: 'Planning', color: 'text-blue-700', bgColor: 'bg-blue-100', icon: '⟳' },
  executing: { label: 'Executing', color: 'text-yellow-700', bgColor: 'bg-yellow-100', icon: '⟳' },
  completed: { label: 'Completed', color: 'text-green-700', bgColor: 'bg-green-100', icon: '✓' },
  failed: { label: 'Failed', color: 'text-red-700', bgColor: 'bg-red-100', icon: '✕' },
  cancelled: { label: 'Cancelled', color: 'text-gray-700', bgColor: 'bg-gray-100', icon: '⊗' },
};

/**
 * ExecutionMonitor Component - Shows real-time task execution progress
 */
export const ExecutionMonitor: React.FC<ExecutionMonitorProps> = ({
  taskId,
  status,
  logs = [],
  currentStep = 0,
  totalSteps = 0,
  error,
  onStatusChange,
}) => {
  const [elapsedTime, setElapsedTime] = useState(0);

  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.not_started;

  // Update status callback
  useEffect(() => {
    onStatusChange?.(status);
  }, [status, onStatusChange]);

  // Track elapsed time for running tasks
  useEffect(() => {
    if (status === 'executing' || status === 'planning') {
      const interval = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [status]);

  // Format elapsed time
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };

  // Group logs by level
  const logsByLevel = useMemo(() => {
    return {
      info: logs.filter((log) => log.level === 'info'),
      warning: logs.filter((log) => log.level === 'warning'),
      error: logs.filter((log) => log.level === 'error'),
    };
  }, [logs]);

  const hasErrors = logsByLevel.error.length > 0 || !!error;
  const hasWarnings = logsByLevel.warning.length > 0;
  const isRunning = status === 'executing' || status === 'planning';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Execution Monitor</h2>
            <p className="text-sm text-gray-500 mt-1">Task ID: {taskId}</p>
          </div>
          <div className="text-right">
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-semibold ${statusConfig.bgColor} ${statusConfig.color}`}>
              <span className={isRunning ? 'animate-spin' : ''}>{statusConfig.icon}</span>
              <span>{statusConfig.label}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Status Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {/* Status */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
          <p className="text-lg font-semibold text-gray-900">{statusConfig.label}</p>
        </div>

        {/* Elapsed Time */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <label className="block text-xs font-medium text-gray-600 mb-1">Elapsed Time</label>
          <p className="text-lg font-semibold text-gray-900">{formatTime(elapsedTime)}</p>
        </div>

        {/* Progress */}
        {totalSteps > 0 && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <label className="block text-xs font-medium text-gray-600 mb-1">Progress</label>
            <p className="text-lg font-semibold text-gray-900">
              {currentStep}/{totalSteps}
            </p>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {totalSteps > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">Steps Completed</label>
            <span className="text-sm text-gray-600">{Math.round((currentStep / totalSteps) * 100)}%</span>
          </div>
          <Progress current={currentStep} total={totalSteps} />
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 text-red-600 font-bold text-xl">✕</div>
            <div className="flex-grow">
              <h3 className="font-semibold text-red-900">Execution Error</h3>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Logs */}
      {logs.length > 0 ? (
        <LogViewer
          logs={logs}
          isLoading={isRunning}
          title="Execution Logs"
          maxHeight="500px"
          autoscroll={true}
        />
      ) : (
        <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-8">
          <div className="text-center text-gray-500">
            {isRunning ? (
              <>
                <div className="animate-spin-slow mb-2 text-2xl">⟳</div>
                <p>Waiting for logs...</p>
              </>
            ) : status === 'not_started' ? (
              <>
                <div className="mb-2 text-2xl">◯</div>
                <p>Task not started yet</p>
              </>
            ) : (
              <>
                <div className="mb-2 text-2xl">✓</div>
                <p>No logs available</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Status Timeline */}
      {logs.length > 0 && (
        <div className="space-y-3 pt-4 border-t">
          <h3 className="text-sm font-semibold text-gray-900">Summary</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-gray-600 text-xs font-medium">Info Logs</p>
              <p className="text-lg font-bold text-blue-600">{logsByLevel.info.length}</p>
            </div>
            <div className="bg-yellow-50 p-3 rounded-lg">
              <p className="text-gray-600 text-xs font-medium">Warnings</p>
              <p className="text-lg font-bold text-yellow-600">{logsByLevel.warning.length}</p>
            </div>
            <div className="bg-red-50 p-3 rounded-lg">
              <p className="text-gray-600 text-xs font-medium">Errors</p>
              <p className="text-lg font-bold text-red-600">{logsByLevel.error.length}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExecutionMonitor;
