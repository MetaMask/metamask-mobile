import type { OrderResult, OrderType } from '@metamask/perps-controller';
import {
  buildCopyTradeIntentOptions,
  type CopyTradeOrigin,
  type CreateCopyTradeIntentOptions,
} from '../../../../util/social/copyTradeIntent';
import { PROVIDER_CONFIG } from '../constants/perpsConfig';

const HYPERLIQUID_ARBITRUM_CAIP_CHAIN_ID = 'eip155:42161';

/**
 * Exchange order ids a copy-trade intent can be matched against.
 *
 * Scale orders expand into one exchange order per rung, so each child id is
 * returned. TWAP and chase return a strategy handle instead of an exchange
 * order id, and their fills carry other ids, so they return none.
 *
 * @param orderType - Type of the submitted order.
 * @param result - Result of the placement.
 * @returns Non-empty exchange order ids; empty when nothing can be matched.
 */
export const getCopyTradeOids = (
  orderType: OrderType,
  result: OrderResult | undefined,
): string[] => {
  if (!result || orderType === 'twap' || orderType === 'chase') {
    return [];
  }
  const ids =
    orderType === 'scale' ? (result.childOrderIds ?? []) : [result.orderId];
  return ids.filter(
    (id): id is string => typeof id === 'string' && id.length > 0,
  );
};

/**
 * Copy-trade intents for a perps order placed from a social post: one per
 * exchange order id, only for a Hyperliquid order on the post's market.
 *
 * @param params - Order and copy context.
 * @param params.copyTradeOrigin - Post being copied; none sends nothing.
 * @param params.asset - Market the order was placed on.
 * @param params.orderType - Type of the submitted order.
 * @param params.result - Result of the placement.
 * @param params.address - EVM address trading on Hyperliquid.
 * @param params.activeProvider - `PerpsController` active provider.
 * @returns The intents to send.
 */
export const buildPerpsCopyTradeIntents = ({
  copyTradeOrigin,
  asset,
  orderType,
  result,
  address,
  activeProvider,
}: {
  copyTradeOrigin: CopyTradeOrigin | undefined;
  asset: string;
  orderType: OrderType;
  result: OrderResult | undefined;
  address: string | undefined;
  activeProvider: string | undefined;
}): CreateCopyTradeIntentOptions[] => {
  if (!copyTradeOrigin || !address || copyTradeOrigin.asset !== asset) {
    return [];
  }
  const providerId =
    result?.providerId ??
    (activeProvider && activeProvider !== PROVIDER_CONFIG.AggregatedProvider
      ? activeProvider
      : PROVIDER_CONFIG.DefaultProvider);
  if (providerId !== 'hyperliquid') {
    return [];
  }
  const caip10 = `${HYPERLIQUID_ARBITRUM_CAIP_CHAIN_ID}:${address}`;
  return getCopyTradeOids(orderType, result).map((oid) =>
    buildCopyTradeIntentOptions(copyTradeOrigin, caip10, {
      product: 'perps',
      oid,
    }),
  );
};
