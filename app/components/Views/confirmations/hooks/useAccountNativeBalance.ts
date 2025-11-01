import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';
import { selectAccountsByChainId } from '../../../../selectors/accountTrackerController';

interface AccountData {
  balance: string;
}

type AccountsByChainId = Record<Hex, Record<string, AccountData>>;

export const useAccountNativeBalance = (
  chainId: Hex,
  address: string,
): { balanceWeiInHex: Hex } => {
  const accountsByChainId = useSelector(selectAccountsByChainId);

  // Create a normalized version of accountsByChainId with lowercase addresses
  const normalizedAccountsByChainId = useMemo(() => {
    if (!accountsByChainId) return {} as AccountsByChainId;
    return Object.entries(accountsByChainId).reduce<AccountsByChainId>(
      (acc, [chainIdKey, accounts]) => {
        acc[chainIdKey as Hex] = Object.entries(accounts).reduce<
          Record<string, AccountData>
        >((chainAcc, [acctAddress, acctData]) => {
          chainAcc[acctAddress.toLowerCase()] = acctData;
          return chainAcc;
        }, {});
        return acc;
      },
      {} as AccountsByChainId,
    );
  }, [accountsByChainId]);

  if (!chainId || !address) {
    return {
      balanceWeiInHex: '0x0',
    };
  }

  const lowercaseAddress = address.toLowerCase();

  const rawAccountBalance =
    normalizedAccountsByChainId[chainId]?.[lowercaseAddress]?.balance ?? '0x0';

  return {
    balanceWeiInHex: rawAccountBalance as Hex,
  };
};
