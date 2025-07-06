import { useCallback, useEffect, useState } from 'react';
import { useCardSDK } from '../sdk';
import { AllowanceState } from '../types';
import { ARBITRARY_ALLOWANCE } from '../constants';
import { ethers } from 'ethers';

/**
 * Hook to retrieve allowances for supported tokens.
 */
export const useGetAllowances = (address?: string, autoFetch = false) => {
  const { sdk } = useCardSDK();
  const [allowances, setAllowances] = useState<
    | {
        address: `0x${string}`;
        allowance: AllowanceState;
        amount: ethers.BigNumber;
      }[]
    | null
  >(null);
  const [isLoading, setIsLoading] = useState<boolean>(autoFetch);

  const fetchAllowances = useCallback(async () => {
    if (sdk && address) {
      setIsLoading(true);
      try {
        const supportedTokensAllowances =
          await sdk.getSupportedTokensAllowances(address);

        const mappedAllowances = supportedTokensAllowances.map((token) => {
          const allowance = token.usAllowance.isZero()
            ? token.globalAllowance
            : token.usAllowance;
          let allowanceState;

          if (allowance.isZero()) {
            allowanceState = AllowanceState.NotActivated;
          } else if (allowance.lt(ARBITRARY_ALLOWANCE)) {
            allowanceState = AllowanceState.Limited;
          } else {
            allowanceState = AllowanceState.Unlimited;
          }

          return {
            address: token.address,
            allowance: allowanceState,
            amount: allowance,
          };
        });

        setAllowances(mappedAllowances);
      } catch (error) {
        console.error('Error fetching priority token:', error);
      } finally {
        setIsLoading(false);
      }
    }
  }, [sdk, address]);

  // Automatically fetch location if autoFetch is true
  useEffect(() => {
    if (autoFetch) {
      fetchAllowances();
    }
  }, [autoFetch, fetchAllowances]);

  return { allowances, fetchAllowances, isLoading };
};
