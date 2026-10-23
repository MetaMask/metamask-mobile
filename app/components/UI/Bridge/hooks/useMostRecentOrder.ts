import type { CaipAssetType } from '@metamask/utils';
import type { LimitOrder } from '../api/limitOrders/getLimitOrders/types';
import type { RecurringOrder } from '../api/recurringOrders.types';
import { OPEN_LIMIT_ORDER_STATES } from '../constants/limitOrders';
import { BridgeTabKey } from '../Views/BridgeView/BridgeView.constants';
import { useLatestOpenRecurringOrderForAsset } from './useLatestOpenRecurringOrderForAsset';
import { useLimitOrders } from './useLimitOrders';

export type MostRecentOrder =
  | {
      type: BridgeTabKey.Limit;
      order: LimitOrder;
    }
  | {
      type: BridgeTabKey.Recurring;
      order: RecurringOrder;
    };

interface UseMostRecentOrderParams {
  walletAddress?: string;
  assetId?: CaipAssetType | null;
  isLimitOrderEnabled: boolean;
  isRecurringOrderEnabled: boolean;
}

function getMostRecentOrder(
  limitOrder: LimitOrder | undefined,
  recurringOrder: RecurringOrder | undefined,
): MostRecentOrder | undefined {
  if (!limitOrder) {
    return recurringOrder
      ? { type: BridgeTabKey.Recurring, order: recurringOrder }
      : undefined;
  }

  if (!recurringOrder) {
    return { type: BridgeTabKey.Limit, order: limitOrder };
  }

  return Date.parse(limitOrder.timingData.createdAt) >=
    Date.parse(recurringOrder.createdAt)
    ? { type: BridgeTabKey.Limit, order: limitOrder }
    : { type: BridgeTabKey.Recurring, order: recurringOrder };
}

/**
 * Returns the newest open limit or recurring order involving an asset.
 */
export function useMostRecentOrder({
  walletAddress,
  assetId,
  isLimitOrderEnabled,
  isRecurringOrderEnabled,
}: UseMostRecentOrderParams) {
  const isLimitOrderLookupEnabled = isLimitOrderEnabled && Boolean(assetId);
  const recurringOrderQuery = useLatestOpenRecurringOrderForAsset({
    walletAddress,
    assetId,
    enabled: isRecurringOrderEnabled,
  });
  const limitOrdersQuery = useLimitOrders({
    walletAddress,
    assetId: assetId ?? undefined,
    states: OPEN_LIMIT_ORDER_STATES,
    limit: 1,
    enabled: isLimitOrderLookupEnabled,
  });
  const isLoading =
    recurringOrderQuery.isLoading ||
    (isLimitOrderLookupEnabled && limitOrdersQuery.isLoading);
  const limitOrder =
    isLimitOrderLookupEnabled && !limitOrdersQuery.isError
      ? limitOrdersQuery.orders[0]
      : undefined;

  return {
    mostRecentOrder: isLoading
      ? undefined
      : getMostRecentOrder(limitOrder, recurringOrderQuery.order),
    isLoading,
    isError:
      recurringOrderQuery.isError ||
      (isLimitOrderLookupEnabled && limitOrdersQuery.isError),
  };
}
