import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useApp } from '@/contexts/AppContext';
import { createApiClient } from '@/lib/api';
import type { ApiEnvelope, Server } from '@/types/api';

interface ServerQueryResult {
  server: Server | null;
  suspended: boolean;
}

export function useServerDetails(id: string | undefined) {
  const { instanceUrl, authToken } = useApp();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const queryClient = useQueryClient();

  const version = useMemo(() => Date.now().toString(), []);

  const apiClient =
    instanceUrl && authToken ? createApiClient(instanceUrl, authToken) : null;

  const { data, isLoading, error, refetch } = useQuery<ServerQueryResult, Error>({
    queryKey: ['server-detail', id, instanceUrl, authToken, version],
    queryFn: async (): Promise<ServerQueryResult> => {
      if (!apiClient || !id) {
        throw new Error('API client not initialized');
      }

      try {
        const response = await apiClient.get<ApiEnvelope<Server>>(
          `/api/user/servers/${id}`
        );

        if (response.data?.error_code === 'SERVER_SUSPENDED') {
          return { server: null, suspended: true };
        }

        if (response.status !== 200 || !response.data?.success || !response.data?.data) {
          throw new Error(response.data?.error_message || 'Failed to fetch server');
        }

        return { server: response.data.data, suspended: false };
      } catch (err: any) {
        if (
          err?.response?.data?.error_code === 'SERVER_SUSPENDED' ||
          err?.response?.status === 403
        ) {
          return { server: null, suspended: true };
        }
        queryClient.setQueryData(
          ['server-detail', id, instanceUrl, authToken, version],
          null
        );
        throw err;
      }
    },
    enabled: !!apiClient && !!id,
    retry: false,
    staleTime: 0,
    gcTime: 0,
  });

  useEffect(() => {
    if (instanceUrl && authToken && id) {
      refetch();
    }
  }, [instanceUrl, authToken, id, refetch]);

  useEffect(() => {
    if (instanceUrl && authToken && id) {
      intervalRef.current = setInterval(async () => {
        await refetch();
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [instanceUrl, authToken, id, refetch]);

  const manualRefetch = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return {
    server: data?.server ?? null,
    suspended: data?.suspended ?? false,
    isLoading: isLoading && !data,
    error: error ?? null,
    refetch: manualRefetch,
  };
}