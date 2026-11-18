import type { BridgeToken } from '../../types';
import { getRecurringOrderMinAmountUsd } from '../../utils/recurringOrders';
import {
  useOrderMinAmount,
  type UseOrderMinAmountResult,
} from '../useOrderMinAmount';

interface UseRecurringOrderMinAmountParams {
  sourceToken?: BridgeToken;
  sourceAmount?: string;
}

/**
 * Checks the Recurring Order source amount against the minimum USD value
 * configured for its chain.
 */
export function useRecurringOrderMinAmount({
  sourceToken,
  sourceAmount,
}: UseRecurringOrderMinAmountParams): UseOrderMinAmountResult {
  const minAmountUsd = getRecurringOrderMinAmountUsd(sourceToken?.chainId);

  return useOrderMinAmount({ minAmountUsd, sourceAmount, sourceToken });
}
