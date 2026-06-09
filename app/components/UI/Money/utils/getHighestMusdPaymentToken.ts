import BigNumber from 'bignumber.js';
import { Hex } from '@metamask/utils';
import { MUSD_TOKEN_ADDRESS_BY_CHAIN } from '../../Earn/constants/musd';

export interface MusdPaymentToken {
  address: Hex;
  chainId: Hex;
}

/**
 * Picks the mUSD token on the chain where the user holds the largest mUSD
 * balance, to pre-select as the payment token when adding mUSD from the Money
 * account surfaces. Returns undefined when the user holds no mUSD on any
 * supported chain.
 *
 * @param tokenBalanceByChain - Per-chain mUSD token balances (decimal strings),
 * as returned by `useMusdBalance`.
 */
export const getHighestMusdPaymentToken = (
  tokenBalanceByChain: Record<Hex, string>,
): MusdPaymentToken | undefined => {
  let bestChainId: Hex | undefined;
  let bestBalance = new BigNumber(0);

  for (const [chainId, balance] of Object.entries(tokenBalanceByChain)) {
    const value = new BigNumber(balance);
    if (value.isNaN() || !value.isGreaterThan(bestBalance)) {
      continue;
    }
    bestBalance = value;
    bestChainId = chainId as Hex;
  }

  if (!bestChainId) {
    return undefined;
  }

  const address = MUSD_TOKEN_ADDRESS_BY_CHAIN[bestChainId];
  if (!address) {
    return undefined;
  }

  return { address, chainId: bestChainId };
};
