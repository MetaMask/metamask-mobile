import type { QueryClient } from '@tanstack/react-query';
import { createProjectLogger } from '@metamask/utils';
import Engine from '../../../../core/Engine';
import {
  RECURRING_ORDERS_BY_ASSET_QUERY_KEY,
  RECURRING_ORDERS_QUERY_KEY,
} from '../queries/recurringOrders';

const log = createProjectLogger('bridge-recurring-api-cache-invalidation');

const RECURRING_ORDER_QUERY_INVALIDATIONS = [
  {
    queryKey: RECURRING_ORDERS_QUERY_KEY,
    refetchType: 'none',
  },
  {
    queryKey: RECURRING_ORDERS_BY_ASSET_QUERY_KEY,
    refetchType: 'active',
  },
] as const;

export async function invalidateRecurringOrderQueries(
  queryClient: QueryClient,
): Promise<void> {
  await Promise.all(
    RECURRING_ORDER_QUERY_INVALIDATIONS.map(async ({ queryKey }) => {
      try {
        await Engine.controllerMessenger.call(
          'RecurringOrdersDataService:invalidateQueries',
          { queryKey: [queryKey] },
        );
      } catch (error) {
        log('Recurring-order service cache invalidation failed', error);
      }
    }),
  );

  await Promise.all(
    RECURRING_ORDER_QUERY_INVALIDATIONS.map(
      async ({ queryKey, refetchType }) => {
        try {
          await queryClient.invalidateQueries({
            queryKey: [queryKey],
            refetchType,
          });
        } catch (error) {
          log('Recurring-order UI cache invalidation failed', error);
        }
      },
    ),
  );
}
