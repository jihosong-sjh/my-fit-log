'use client';
import { useQuery } from '@tanstack/react-query';
import { useUser } from '@/components/auth-context';
import { api, ApiClientError, errorMessage } from './api';
export function useResource<T>(path: string | null) {
  const user = useUser();
  const query = useQuery<T>({
    queryKey: ['api', user?.id, path],
    queryFn: ({ signal }) => api<T>(path!, { signal }),
    enabled: !!path && !!user,
    staleTime: 10000,
    retry: (count, error) =>
      !(error instanceof ApiClientError && error.status < 500) && count < 1,
  });
  return {
    data: query.data,
    status:
      query.error instanceof ApiClientError ? query.error.status : undefined,
    error: query.error ? errorMessage(query.error) : '',
    loading: query.isPending,
    reload: () => query.refetch(),
  };
}
