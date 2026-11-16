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
  /** Minimum formatted in the user's selected currency. */
  formattedMinAmountInSelectedCurrency: string | undefined;
  /** Whether the minimum cannot be validated with the available rates. */
  hasError: boolean;
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
 * Without the rates required to validate the minimum, the hook returns an
 * error so the order can fail closed.
 */
export const useLimitOrderMinAmount = ({
  sourceToken,
  sourceAmount,
}: UseLimitOrderMinAmountParams): UseLimitOrderMinAmountResult => {
  const minAmountUsd = getLimitOrderMinAmountUsd(sourceToken?.chainId);

  return useOrderMinAmount({ minAmountUsd, sourceAmount, sourceToken });
};
