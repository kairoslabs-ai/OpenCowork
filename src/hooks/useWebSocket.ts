import { useEffect, useState, useCallback, useRef } from 'react';
import { useAPIStore } from '../store/apiStore';
import type { WebSocketEvent, WebSocketStatus } from '../types';

/**
 * useWebSocket - Manages WebSocket connection and real-time updates
 */
export function useWebSocket(taskId?: string) {
  const [status, setStatus] = useState<WebSocketStatus>('disconnected');
  const [data, setData] = useState<WebSocketEvent | null>(null);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const apiStore = useAPIStore();

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current) return; // Already connected

    try {
      const wsUrl = apiStore.baseUrl.replace(/^http/, 'ws');
      const url = taskId ? `${wsUrl}/ws?task_id=${taskId}` : `${wsUrl}/ws`;

      const ws = new WebSocket(url);

      ws.onopen = () => {
        setStatus('connected');
        setError(null);
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          setData(message);
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };

      ws.onerror = (event) => {
        const message = 'WebSocket error occurred';
        setError(message);
        setStatus('error');
        console.error(message, event);
      };

      ws.onclose = () => {
        setStatus('disconnected');
        wsRef.current = null;

        // Attempt reconnect with exponential backoff
        if (reconnectAttemptsRef.current < 5) {
          const delay = Math.pow(2, reconnectAttemptsRef.current) * 1000;
          reconnectAttemptsRef.current += 1;

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };

      wsRef.current = ws;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect to WebSocket';
      setError(message);
      setStatus('error');
    }
  }, [taskId, apiStore.baseUrl]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setStatus('disconnected');
    setData(null);
  }, []);

  // Send message through WebSocket
  const send = useCallback((message: Record<string, unknown>) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      throw new Error('WebSocket is not connected');
    }
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    status,
    data,
    error,
    connect,
    disconnect,
    send,
    isConnected: status === 'connected',
  };
}
