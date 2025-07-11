import { useState, useEffect, useCallback } from 'react';

import Engine from '../../../../core/Engine';

export const useERC20TokenBalance = (
  contractAddress: string,
  userAddress: string,
  networkClientId: string,
) => {
  const [tokenBalance, setTokenBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchBalance = useCallback(
    async (token: string, user: string): Promise<void> => {
      Engine.context.AssetsContractController?.getERC20BalanceOf(
        token,
        user,
        networkClientId,
      )
        // BN versions mismatch here
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .then((balance: any) => setTokenBalance(balance?.toString()))
        .catch(() => setError(true))
        .finally(() => setLoading(false));
    },
    [networkClientId],
  );

  useEffect(() => {
    fetchBalance(contractAddress, userAddress);
  }, [contractAddress, fetchBalance, userAddress]);

  return { tokenBalance, loading, error };
};
