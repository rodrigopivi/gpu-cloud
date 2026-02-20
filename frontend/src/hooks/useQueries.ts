import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiKeys, workers, queue, metrics } from '../api';

// API Keys
export function useApiKeys() {
  return useQuery({
    queryKey: ['apiKeys'],
    queryFn: apiKeys.list,
  });
}

export function useCreateApiKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, rateLimitPerMinute }: { name: string; rateLimitPerMinute?: number }) =>
      apiKeys.create(name, rateLimitPerMinute),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apiKeys'] });
    },
  });
}

export function useRevokeApiKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: apiKeys.revoke,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apiKeys'] });
    },
  });
}

export function useApiKeyUsage(id: string, limit?: number) {
  return useQuery({
    queryKey: ['apiKeyUsage', id, limit],
    queryFn: () => apiKeys.getUsage(id, limit),
    enabled: !!id,
  });
}

// Workers
export function useWorkers() {
  return useQuery({
    queryKey: ['workers'],
    queryFn: workers.list,
    refetchInterval: 5000,
  });
}

export function useAddWorker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: workers.add,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers'] });
    },
  });
}

export function useRemoveWorker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: workers.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers'] });
    },
  });
}

// Queue
export function useQueueStatus() {
  return useQuery({
    queryKey: ['queue'],
    queryFn: queue.getStatus,
    refetchInterval: 3000,
  });
}

// Metrics
export function useMetrics(range?: string) {
  return useQuery({
    queryKey: ['metrics', range],
    queryFn: () => metrics.getMetrics(range),
    refetchInterval: 10000,
  });
}

export function useUsageOverview() {
  return useQuery({
    queryKey: ['usage'],
    queryFn: metrics.getUsage,
    refetchInterval: 30000,
  });
}
