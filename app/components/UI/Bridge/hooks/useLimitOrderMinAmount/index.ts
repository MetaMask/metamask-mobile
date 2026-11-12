import type { BridgeToken } from '../../types';
import { getLimitOrderMinAmountUsd } from '../../utils/limitOrders/getLimitOrderMinAmountUsd';
import { useOrderMinAmount } from '../useOrderMinAmount';

interface UseLimitOrderMinAmountParams {
  sourceToken?: BridgeToken;
  sourceAmount?: string;
}

interface UseLimitOrderMinAmountResult {
  /**
   * USD value the source amount has to reach on the source token's chain, or
   * `undefined` when no minimum is configured for it.
   */
  minAmountUsd: number | undefined;
  /**
   * Whether the source amount is worth less than {@link minAmountUsd}.
   */
  isBelowMinAmount: boolean;
}

/**
 * Checks the limit order source amount against the minimum USD value
 * configured for its chain.
 *
 * The amount is valued at the live market rate, which is what the API checks
 * the minimum against when the order is created.
 *
 * Without a USD price for the source token the amount cannot be checked, so it
 * is not reported as below the minimum; the missing price banner blocks the
 * order in that case instead.
 */
export const useLimitOrderMinAmount = ({
  sourceToken,
  sourceAmount,
}: UseLimitOrderMinAmountParams): UseLimitOrderMinAmountResult => {
  const minAmountUsd = getLimitOrderMinAmountUsd(sourceToken?.chainId);

  return useOrderMinAmount({ minAmountUsd, sourceAmount, sourceToken });
};
