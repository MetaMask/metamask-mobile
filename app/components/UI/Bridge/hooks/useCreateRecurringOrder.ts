import { useMutation, useQueryClient } from '@tanstack/react-query';
import { recurringOrdersApiClient } from '../api/recurringOrders.client';
import type {
  CreateRecurringOrderRequest,
  CreateRecurringOrderResponse,
} from '../api/recurringOrders.types';
import { invalidateRecurringOrderQueries } from './invalidateRecurringOrderQueries';

export function useCreateRecurringOrder() {
  const queryClient = useQueryClient();
  const mutation = useMutation<
    CreateRecurringOrderResponse,
    Error,
    CreateRecurringOrderRequest
  >({
    mutationFn: (request) =>
      recurringOrdersApiClient.createRecurringOrder(request),
    onSuccess: async () => {
      await invalidateRecurringOrderQueries(queryClient, {
        refetchOrderLists: true,
      });
    },
  });

  return {
    createRecurringOrder: mutation.mutateAsync,
    isSubmitting: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}
