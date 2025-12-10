import React, { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseApiReturn<T> extends UseApiState<T> {
  execute: (...args: any[]) => Promise<T | null>;
  reset: () => void;
}

export function useApi<T>(
  apiFunction: (...args: any[]) => Promise<{ success: boolean; data?: T; message?: string }>
): UseApiReturn<T> {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });
  const { toast } = useToast();

  const execute = useCallback(
    async (...args: any[]): Promise<T | null> => {
      setState(prev => ({ ...prev, loading: true, error: null }));

      try {
        const response = await apiFunction(...args);

        if (response.success && response.data) {
          setState({
            data: response.data,
            loading: false,
            error: null,
          });
          return response.data;
        } else {
          const errorMessage = response.message || 'Operation failed';
          setState({
            data: null,
            loading: false,
            error: errorMessage,
          });
          
          toast({
            title: 'Error',
            description: errorMessage,
            variant: 'destructive',
          });
          return null;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        setState({
          data: null,
          loading: false,
          error: errorMessage,
        });

        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
        return null;
      }
    },
    [apiFunction, toast]
  );

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
    });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
}

// Specialized hook for data fetching
export function useApiQuery<T>(
  apiFunction: () => Promise<{ success: boolean; data?: T; message?: string }>,
  options?: {
    immediate?: boolean;
    onSuccess?: (data: T) => void;
    onError?: (error: string) => void;
  }
): UseApiReturn<T> {
  const api = useApi(apiFunction);

  // Auto-execute on mount if immediate is true
  React.useEffect(() => {
    if (options?.immediate) {
      api.execute().then(data => {
        if (data && options?.onSuccess) {
          options.onSuccess(data);
        }
      }).catch(error => {
        if (options?.onError) {
          options.onError(error.message);
        }
      });
    }
  }, []);

  return api;
}