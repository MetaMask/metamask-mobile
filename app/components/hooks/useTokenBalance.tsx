import { useState, useEffect, Dispatch, SetStateAction } from 'react';
import Engine from '../../core/Engine';
import { BN } from '@metamask/assets-controllers';

/**
 * Hook to handle the balance of ERC20 tokens
 * @property requestedTokenAddress Token contract address
 * @property userCurrentAddress Public address which holds the token
 * @returns Array that consists of `[balance, loading, error]`
 */

const useTokenBalance = (
  requestedTokenAddress: string,
  userCurrentAddress: string,
): [BN | null, boolean, boolean] => {
  // This hook should be only used with ERC20 tokens
  const [tokenBalance, setTokenBalance]: [
    BN | null,
    Dispatch<SetStateAction<BN | null>>,
  ] = useState<BN | null>(null);
  const [loading, setLoading]: [boolean, Dispatch<SetStateAction<boolean>>] =
    useState<boolean>(true);
  const [error, setError]: [boolean, Dispatch<SetStateAction<boolean>>] =
    useState<boolean>(false);
  const { TokenBalancesController }: any = Engine.context;

  const fetchBalance = async (
    tokenAddress: string,
    userAddress: string,
  ): Promise<void> => {
    TokenBalancesController.getERC20BalanceOf(tokenAddress, userAddress)
      .then((balance: BN) => setTokenBalance(balance))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchBalance(requestedTokenAddress, userCurrentAddress);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedTokenAddress, userCurrentAddress]);

  return [tokenBalance, loading, error];
};

export default useTokenBalance;
