import { useState, useEffect, useCallback, useRef } from 'react';

interface UseQueryOptions {
  enabled?: boolean;
  refetchInterval?: number;
  staleTime?: number;
  retryCount?: number;
}

interface UseQueryState<T> {
  data: T | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

/**
 * useQuery - Simple data fetching hook (lightweight TanStack Query alternative)
 */
export function useQuery<T>(
  queryKey: string[],
  queryFn: () => Promise<T>,
  options: UseQueryOptions = {}
): UseQueryState<T> & {
  refetch: () => Promise<void>;
  isFetching: boolean;
} {
  const [state, setState] = useState<UseQueryState<T>>({
    data: null,
    isLoading: false,
    isError: false,
    error: null,
  });
  const [isFetching, setIsFetching] = useState(false);

  const stateRef = useRef<UseQueryState<T>>(state);
  const lastFetchTimeRef = useRef<number>(0);
  const retryCountRef = useRef(0);

  const {
    enabled = true,
    refetchInterval = 0,
    staleTime = 1000 * 60 * 5, // 5 minutes
    retryCount = 3,
  } = options;

  // Execute query
  const execute = useCallback(async () => {
    // Check if data is still fresh
    const now = Date.now();
    if (lastFetchTimeRef.current && now - lastFetchTimeRef.current < staleTime) {
      return;
    }

    setIsFetching(true);

    try {
      const data = await queryFn();
      setState({
        data,
        isLoading: false,
        isError: false,
        error: null,
      });
      stateRef.current = { data, isLoading: false, isError: false, error: null };
      lastFetchTimeRef.current = now;
      retryCountRef.current = 0;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Query failed');

      // Retry on error
      if (retryCountRef.current < retryCount) {
        retryCountRef.current += 1;
        setTimeout(() => execute(), Math.pow(2, retryCountRef.current) * 1000);
      } else {
        setState({
          data: null,
          isLoading: false,
          isError: true,
          error,
        });
        stateRef.current = { data: null, isLoading: false, isError: true, error };
      }
    } finally {
      setIsFetching(false);
    }
  }, [queryFn, staleTime, retryCount]);

  // Initial fetch
  useEffect(() => {
    if (enabled) {
      setState((prev) => ({ ...prev, isLoading: true }));
      execute();
    }
  }, [enabled, execute]);

  // Refetch interval
  useEffect(() => {
    if (!refetchInterval || !enabled) return;

    const interval = setInterval(() => {
      execute();
    }, refetchInterval);

    return () => clearInterval(interval);
  }, [refetchInterval, enabled, execute]);

  return {
    ...state,
    isFetching,
    refetch: execute,
  };
}
