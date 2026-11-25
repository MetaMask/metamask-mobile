import { EthScope } from '@metamask/keyring-api';
import type { CaipChainId } from '@metamask/utils';

/**
 * Per-chain Recurring Order settings, keyed by CAIP-2 chain ID, with `*` as
 * the fallback for chains without an entry of their own.
 */
export const RECURRING_ORDERS_CHAIN_CONFIG: Partial<
  Record<
    CaipChainId | '*',
    {
      minAmountUSD: number;
    }
  >
> = {
  [EthScope.Mainnet]: {
    minAmountUSD: 100,
  },
  '*': {
    minAmountUSD: 10,
  },
};

export const RECURRING_ORDERS_REFETCH_INTERVAL = 20 * 1000;

export const RECURRING_ORDERS_CONSTRAINED_REFETCH_INTERVAL = 60 * 1000;

export const RECURRING_ORDER_DEFAULT_PRICE_TOLERANCE = '3';
