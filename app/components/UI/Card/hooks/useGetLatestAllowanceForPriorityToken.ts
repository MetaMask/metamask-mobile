import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCardSDK } from '../sdk';
import { CardTokenAllowance, AllowanceState } from '../types';
import Logger from '../../../../util/Logger';
import { ethers } from 'ethers';
import {
  caipChainIdToNetwork,
  SPENDING_LIMIT_UNSUPPORTED_TOKENS,
} from '../constants';
import { isNonEvmChainId } from '../../../../core/Multichain/utils';
import { dashboardKeys } from '../queries';

/**
 * Determines whether fetching the latest allowance is applicable for the given token.
 * Returns false when the fetch should be skipped.
 */
const isAllowanceFetchApplicable = (
  token: CardTokenAllowance | null | undefined,
): token is CardTokenAllowance => {
  if (!token) return false;
  if (token.allowanceState !== AllowanceState.Limited) return false;
  if (
    token.symbol &&
    SPENDING_LIMIT_UNSUPPORTED_TOKENS.includes(token.symbol.toUpperCase())
  )
    return false;
  if (token.caipChainId && isNonEvmChainId(token.caipChainId)) return false;

  const tokenAddress = token.stagingTokenAddress || token.address;
  if (!tokenAddress || !ethers.utils.isAddress(tokenAddress)) return false;
  if (!token.delegationContract || !token.walletAddress || !token.decimals)
    return false;

  return true;
};

/**
 * Hook to get the latest allowance from approval logs for the priority token.
 * Only needed in authenticated mode when allowanceState is Limited,
 * to display the spending limit progress bar with the correct total allowance.
 *
 * @param priorityToken - The priority token to fetch the latest allowance for
 * @returns Object containing latest allowance, loading state, error, and refetch function
 */
const useGetLatestAllowanceForPriorityToken = (
  priorityToken: CardTokenAllowance | null | undefined,
) => {
  const { sdk } = useCardSDK();

  const applicable = isAllowanceFetchApplicable(priorityToken);

  // Extract values only when applicable (type guard ensures priorityToken is non-null)
  const tokenAddress = applicable
    ? priorityToken.stagingTokenAddress || priorityToken.address || ''
    : '';
  const delegationContract = applicable
    ? priorityToken.delegationContract || ''
    : '';
  const walletAddress = applicable ? priorityToken.walletAddress || '' : '';
  const caipChainId = applicable
    ? priorityToken.caipChainId
    : ('' as `${string}:${string}`);
  const decimals = applicable ? priorityToken.decimals || 0 : 0;

  const { data, isLoading, error, refetch } = useQuery<string | null>({
    queryKey: dashboardKeys.latestAllowance(
      tokenAddress,
      delegationContract,
      walletAddress,
      caipChainId,
      decimals,
    ),
    queryFn: async () => {
      if (!sdk || !applicable) return null;

      const cardNetwork = caipChainIdToNetwork[caipChainId];

      try {
        const rawLatestAllowance = await sdk.getLatestAllowanceFromLogs(
          walletAddress,
          tokenAddress,
          delegationContract,
          cardNetwork ?? 'linea',
        );

        if (rawLatestAllowance) {
          return ethers.utils.formatUnits(rawLatestAllowance, decimals);
        }
        return null;
      } catch (err) {
        const normalizedError =
          err instanceof Error ? err : new Error(String(err));
        Logger.error(
          normalizedError,
          'useGetLatestAllowanceForPriorityToken: Failed to fetch latest allowance',
        );
        throw normalizedError;
      }
    },
    enabled: applicable && !!sdk,
    staleTime: 60_000,
  });

  const refetchAllowance = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return {
    latestAllowance: data ?? null,
    isLoading,
    error: error as Error | null,
    refetch: refetchAllowance,
  };
};

export default useGetLatestAllowanceForPriorityToken;
