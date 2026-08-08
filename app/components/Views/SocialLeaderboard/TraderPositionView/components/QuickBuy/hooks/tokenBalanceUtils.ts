import type { Hex } from '@metamask/utils';
import { toChecksumAddress } from '../../../../../../../util/address';
import { selectAccountsByChainId } from '../../../../../../../selectors/accountTrackerController';
import { selectTokensBalances } from '../../../../../../../selectors/tokenBalancesController';
import { selectTokenMarketData } from '../../../../../../../selectors/tokenRatesController';

export const isZeroHexBalance = (balance?: string): boolean =>
  !balance || balance === '0x0' || balance === '0x00';

export const hasNonZeroHexBalance = (balance?: string): balance is string =>
  !isZeroHexBalance(balance);

export type TokenBalances = ReturnType<typeof selectTokensBalances>;
export type AccountsByChainId = ReturnType<typeof selectAccountsByChainId>;

export const getAddressLookupKeys = (address?: string): Hex[] => {
  if (!address) {
    return [];
  }

  const keys = new Set<Hex>([address as Hex, address.toLowerCase() as Hex]);

  try {
    keys.add(toChecksumAddress(address) as Hex);
  } catch {
    // Ignore invalid addresses in tests or malformed candidate data.
  }

  return [...keys];
};

export const getCachedNativeBalance = (
  accountsByChainId: AccountsByChainId,
  chainId: Hex,
  accountAddress?: string,
): string | undefined => {
  for (const accountKey of getAddressLookupKeys(accountAddress)) {
    const balance = accountsByChainId?.[chainId]?.[accountKey]?.balance;
    if (balance) {
      return balance;
    }
  }

  return undefined;
};

export const getCachedErc20Balance = (
  tokenBalances: TokenBalances,
  accountAddress: string | undefined,
  chainId: Hex,
  tokenAddress: string,
): string | undefined => {
  for (const accountKey of getAddressLookupKeys(accountAddress)) {
    const chainBalances = tokenBalances?.[accountKey]?.[chainId];
    if (!chainBalances) {
      continue;
    }

    for (const tokenKey of getAddressLookupKeys(tokenAddress)) {
      const balance = chainBalances[tokenKey];
      if (balance) {
        return balance;
      }
    }
  }

  return undefined;
};

export const getTokenPrice = (
  tokenMarketData: ReturnType<typeof selectTokenMarketData>,
  chainId: Hex,
  tokenAddress: string,
): number | undefined => {
  for (const addressKey of getAddressLookupKeys(tokenAddress)) {
    const price = tokenMarketData?.[chainId]?.[addressKey]?.price;
    if (price !== undefined) {
      return price;
    }
  }

  return undefined;
};
