import type { OrderResult, OrderType } from '@metamask/perps-controller';
import {
  buildCopyTradeIntentOptions,
  type CopyTradeOrigin,
  type CreateCopyTradeIntentOptions,
} from '../../../../util/social/copyTradeIntent';
import { PROVIDER_CONFIG } from '../constants/perpsConfig';
import { orderTypeHasExchangeOrderId } from './perpsPostTradeShare';

const HYPERLIQUID_ARBITRUM_CAIP_CHAIN_ID = 'eip155:42161';

/**
 * Exchange order id a copy-trade intent can be matched against.
 *
 * Advanced multi-order strategies are not supported by the copy-trade flow.
 * TWAP and chase return a strategy handle instead of an exchange order id,
 * while scale returns multiple child order ids.
 *
 * @param orderType - Type of the submitted order.
 * @param result - Result of the placement.
 * @returns The exchange order id, or undefined when it cannot be matched.
 */
export const getCopyTradeOid = (
  orderType: OrderType,
  result: OrderResult | undefined,
): string | undefined => {
  if (!result || !orderTypeHasExchangeOrderId(orderType)) {
    return undefined;
  }
  return typeof result.orderId === 'string' && result.orderId.length > 0
    ? result.orderId
    : undefined;
};

/**
 * Copy-trade intent for a perps order placed from a social post, only for a
 * Hyperliquid order on the post's market.
 *
 * @param params - Order and copy context.
 * @param params.copyTradeOrigin - Post being copied; none sends nothing.
 * @param params.asset - Market the order was placed on.
 * @param params.orderType - Type of the submitted order.
 * @param params.result - Result of the placement.
 * @param params.address - EVM address trading on Hyperliquid.
 * @param params.activeProvider - `PerpsController` active provider.
 * @returns The intent to send, or undefined when the order is unsupported.
 */
export const buildPerpsCopyTradeIntent = ({
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
}): CreateCopyTradeIntentOptions | undefined => {
  if (!copyTradeOrigin || !address || copyTradeOrigin.asset !== asset) {
    return undefined;
  }
  const providerId =
    result?.providerId ??
    (activeProvider && activeProvider !== PROVIDER_CONFIG.AggregatedProvider
      ? activeProvider
      : PROVIDER_CONFIG.DefaultProvider);
  if (providerId !== 'hyperliquid') {
    return undefined;
  }
  const oid = getCopyTradeOid(orderType, result);
  if (!oid) {
    return undefined;
  }
  const caip10 = `${HYPERLIQUID_ARBITRUM_CAIP_CHAIN_ID}:${address}`;
  return buildCopyTradeIntentOptions(copyTradeOrigin, caip10, {
    product: 'perps',
    oid,
  });
};
