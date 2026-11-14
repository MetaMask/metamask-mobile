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
