import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';
import { selectAccountsByChainId } from '../../../../selectors/accountTrackerController';
import { toFormattedAddress } from '../../../../util/address';

interface AccountData {
  balance: string;
}

type AccountsByChainId = Record<Hex, Record<string, AccountData>>;

export const useAccountNativeBalance = (chainId: Hex, address: string) => {
  const accountsByChainId = useSelector(selectAccountsByChainId);

  // Create a normalized version of accountsByChainId with formatted addresses
  const normalizedAccountsByChainId = useMemo(() => {
    if (!accountsByChainId) return {} as AccountsByChainId;
    return Object.entries(accountsByChainId).reduce<AccountsByChainId>(
      (acc, [chainIdKey, accounts]) => {
        acc[chainIdKey as Hex] = Object.entries(accounts).reduce<
          Record<string, AccountData>
        >((chainAcc, [acctAddress, acctData]) => {
          chainAcc[toFormattedAddress(acctAddress)] = acctData;
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

  const formattedAddress = toFormattedAddress(address);

  const rawAccountBalance =
    normalizedAccountsByChainId[chainId]?.[formattedAddress]?.balance ?? '0x0';

  return {
    balanceWeiInHex: rawAccountBalance,
  };
};
