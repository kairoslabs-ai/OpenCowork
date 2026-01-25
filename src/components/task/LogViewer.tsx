import React, { useState, useRef, useEffect } from 'react';
import type { ExecutionLog } from '../../types';

interface LogViewerProps {
  logs: ExecutionLog[];
  isLoading?: boolean;
  title?: string;
  maxHeight?: string;
  onClear?: () => void;
  autoscroll?: boolean;
}

type LogLevel = 'all' | 'info' | 'warning' | 'error';

/**
 * LogViewer Component - Displays execution logs with filtering and formatting
 */
export const LogViewer: React.FC<LogViewerProps> = ({
  logs,
  isLoading = false,
  title = 'Execution Logs',
  maxHeight = '400px',
  onClear,
  autoscroll = true,
}) => {
  const [logLevel, setLogLevel] = useState<LogLevel>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Filter logs
  const filteredLogs = React.useMemo(() => {
    return logs.filter((log) => {
      const levelMatch = logLevel === 'all' || log.level === logLevel;
      const searchMatch = searchQuery === '' || log.message.toLowerCase().includes(searchQuery.toLowerCase());
      return levelMatch && searchMatch;
    });
  }, [logs, logLevel, searchQuery]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoscroll && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [filteredLogs, autoscroll]);

  const getLogColor = (level: string): string => {
    switch (level) {
      case 'error':
        return 'text-red-600';
      case 'warning':
        return 'text-yellow-600';
      case 'info':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  const getLevelBadgeColor = (level: string): string => {
    switch (level) {
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'info':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const logCounts = {
    all: logs.length,
    info: logs.filter((l) => l.level === 'info').length,
    warning: logs.filter((l) => l.level === 'warning').length,
    error: logs.filter((l) => l.level === 'error').length,
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      {title && (
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {onClear && (
            <button
              onClick={onClear}
              disabled={isLoading || logs.length === 0}
              className="text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col gap-3">
        {/* Log Level Filter */}
        <div className="flex gap-2 flex-wrap">
          {(['all', 'info', 'warning', 'error'] as const).map((level) => (
            <button
              key={level}
              onClick={() => setLogLevel(level)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                logLevel === level
                  ? 'bg-primary text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {level.charAt(0).toUpperCase() + level.slice(1)} ({logCounts[level]})
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search logs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
        />
      </div>

      {/* Log Container */}
      <div
        ref={scrollContainerRef}
        style={{ maxHeight }}
        className="bg-gray-900 text-gray-100 p-3 rounded-lg overflow-y-auto font-mono text-sm space-y-1"
      >
        {filteredLogs.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-gray-500">
            {logs.length === 0 ? 'No logs yet' : 'No matching logs'}
          </div>
        ) : (
          filteredLogs.map((log, index) => (
            <div key={index} className="flex gap-2 items-start hover:bg-gray-800 px-2 py-1 rounded transition-colors">
              {/* Timestamp */}
              <span className="flex-shrink-0 text-gray-500 w-32">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>

              {/* Level Badge */}
              <span
                className={`flex-shrink-0 px-2 py-0.5 rounded text-xs font-semibold w-16 text-center ${getLevelBadgeColor(log.level)}`}
              >
                {log.level.toUpperCase()}
              </span>

              {/* Message */}
              <span className={`flex-grow ${getLogColor(log.level)} break-words`}>{log.message}</span>
            </div>
          ))
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex gap-2 items-center text-gray-400">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" />
            <span className="text-sm">Waiting for logs...</span>
          </div>
        )}
      </div>

      {/* Summary */}
      {filteredLogs.length > 0 && (
        <div className="text-sm text-gray-600">
          Showing {filteredLogs.length} of {logs.length} log(s)
        </div>
      )}
    </div>
  );
};

export default LogViewer;
