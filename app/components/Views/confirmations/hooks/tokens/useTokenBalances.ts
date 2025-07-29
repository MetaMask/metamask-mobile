import { useMemo } from 'react';
import { useTokensWithBalance } from '../../../../UI/Bridge/hooks/useTokensWithBalance';
import { Hex } from '@metamask/utils';
import { useDeepMemo } from '../useDeepMemo';

export interface TokenBalanceRequest {
  chainId: Hex;
  address: Hex;
}

export function useTokenBalances(requests: TokenBalanceRequest[]) {
  const chainIds = useMemo(
    () => requests.map(({ chainId }) => chainId),
    [requests],
  );

  const tokens = useTokensWithBalance({ chainIds });

  const balances = useMemo(
    () =>
      requests.map(({ chainId, address }) => {
        const token = tokens.find(
          (t) =>
            t.chainId === chainId &&
            t.address.toLowerCase() === address.toLowerCase(),
        );

        return { balance: token?.balance, balanceFiat: token?.balanceFiat };
      }),
    [requests, tokens],
  );

  return useDeepMemo(() => balances, [balances]);
}
