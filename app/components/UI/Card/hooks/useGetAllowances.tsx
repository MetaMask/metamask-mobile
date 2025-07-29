import { useCallback, useEffect, useState } from 'react';
import { useCardSDK } from '../sdk';
import { CardTokenAllowance, AllowanceState } from '../types';
import { ARBITRARY_ALLOWANCE } from '../constants';
import { useSelector } from 'react-redux';
import { selectChainId } from '../../../../selectors/networkController';

/**
 * Hook to retrieve allowances for supported tokens.
 */
export const useGetAllowances = (address?: string, autoFetch = false) => {
  const { sdk } = useCardSDK();
  const [allowances, setAllowances] = useState<CardTokenAllowance[] | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState<boolean>(autoFetch);
  const chainId = useSelector(selectChainId);

  const fetchAllowances = useCallback(async () => {
    if (sdk && address) {
      setIsLoading(true);
      try {
        const supportedTokensAllowances =
          await sdk.getSupportedTokensAllowances(address);
        const supportedTokens = sdk.supportedTokens;

        const mappedAllowances = supportedTokensAllowances.map((token) => {
          const tokenInfo = supportedTokens.find(
            (supportedToken) => supportedToken.address === token.address,
          );
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

          if (!tokenInfo) {
            return null;
          }

          return {
            allowanceState,
            address: token.address,
            tag: allowanceState,
            isStaked: false,
            decimals: tokenInfo.decimals ?? null,
            name: tokenInfo.name ?? null,
            symbol: tokenInfo.symbol ?? null,
            allowance,
            chainId,
          };
        });

        const filteredAllowances = mappedAllowances.filter(
          Boolean,
        ) as CardTokenAllowance[];

        setAllowances(filteredAllowances);
      } catch (error) {
        console.error('Error fetching allowances:', error);
      } finally {
        setIsLoading(false);
      }
    }
  }, [sdk, address, chainId]);

  useEffect(() => {
    if (autoFetch) {
      fetchAllowances();
    }
  }, [autoFetch, fetchAllowances]);

  return { allowances, fetchAllowances, isLoading };
};
