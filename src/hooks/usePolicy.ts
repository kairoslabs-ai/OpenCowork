import { useState, useCallback, useEffect } from 'react';
import { apiClient } from '../services/api';
import type { Policy } from '../types';

/**
 * usePolicy - Manages policy loading and enforcement
 */
export function usePolicy() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [activePolicyId, setActivePolicyId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load all policies
  const loadPolicies = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await apiClient.loadPolicies();
      setPolicies(data);

      // Set first policy as active if none selected
      if (data.length > 0 && !activePolicyId) {
        setActivePolicyId(data[0].name);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load policies';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [activePolicyId]);

  // Get active policy
  const getActivePolicy = useCallback((): Policy | null => {
    return policies.find((p) => p.name === activePolicyId) || null;
  }, [policies, activePolicyId]);

  // Check if action is allowed by active policy
  const isActionAllowed = useCallback(
    (action: string, resource: string): boolean => {
      const activePolicy = getActivePolicy();
      if (!activePolicy) return false;

      const rule = activePolicy.rules.find(
        (r) => r.action === action && r.resource === resource
      );

      return rule ? rule.allow : false;
    },
    [getActivePolicy]
  );

  // Load policies on mount
  useEffect(() => {
    loadPolicies();
  }, []);

  return {
    policies,
    activePolicyId,
    activePolicy: getActivePolicy(),
    setActivePolicyId,
    isActionAllowed,
    loadPolicies,
    isLoading,
    error,
  };
}
