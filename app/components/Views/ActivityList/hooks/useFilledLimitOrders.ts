import { useSelector } from 'react-redux';
import type { CaipChainId } from '@metamask/utils';
import { selectBridgeLimitOrderTabEnabledFlag } from '../../../../selectors/bridge/featureFlags';
import { useNetworkTier } from '../../../../hooks/useNetworkTier';
import { useLimitOrders } from '../../../UI/Bridge/hooks/useLimitOrders';
import { LimitOrderState } from '../../../UI/Bridge/api/limitOrders/getLimitOrders/types';

const FILLED_LIMIT_ORDER_STATES = [LimitOrderState.Filled];

interface UseFilledLimitOrdersParams {
  walletAddress: string;
  chainId?: CaipChainId;
  enabled: boolean;
}

/**
 * Filled swap limit orders for the Activity list. Limit order fills are not
 * part of the accounts API feed, so they come from the limit orders API.
 *
 * Offline (network tier `NONE`) the query does not fetch and cached orders
 * are shown as-is.
 *
 * @param params - Hook params.
 * @param params.walletAddress - EVM address whose orders to fetch.
 * @param params.chainId - Restricts orders to one source chain.
 * @param params.enabled - Whether the Limit orders filter is active.
 * @returns The `useLimitOrders` result for filled orders.
 */
export function useFilledLimitOrders({
  walletAddress,
  chainId,
  enabled,
}: UseFilledLimitOrdersParams) {
  const isLimitOrdersEnabled = useSelector(
    selectBridgeLimitOrderTabEnabledFlag,
  );
  const networkTier = useNetworkTier();

  return useLimitOrders({
    walletAddress: walletAddress || undefined,
    states: FILLED_LIMIT_ORDER_STATES,
    chainId,
    enabled: enabled && isLimitOrdersEnabled && networkTier !== 'NONE',
  });
}
