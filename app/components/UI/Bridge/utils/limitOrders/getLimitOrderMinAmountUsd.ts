import { formatChainIdToCaip } from '@metamask/bridge-controller';
import type { CaipChainId, Hex } from '@metamask/utils';
import { LIMIT_ORDERS_CHAIN_CONFIG } from '../../constants/limitOrders';

/**
 * Resolves the USD value the source amount of a limit order has to reach on
 * the given chain.
 *
 * @param chainId - Chain the order is placed on, hex or CAIP-2.
 * @returns The chain's own minimum, else the wildcard one, or `undefined` when
 * neither is configured.
 */
export const getLimitOrderMinAmountUsd = (
  chainId: Hex | CaipChainId | undefined,
): number | undefined => {
  const chainConfig = chainId
    ? LIMIT_ORDERS_CHAIN_CONFIG[formatChainIdToCaip(chainId)]
    : undefined;

  return (chainConfig ?? LIMIT_ORDERS_CHAIN_CONFIG['*'])?.minAmountUSD;
};
