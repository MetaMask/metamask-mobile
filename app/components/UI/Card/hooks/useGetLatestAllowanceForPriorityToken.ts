import { useCallback, useEffect, useState } from 'react';
import { useCardSDK } from '../sdk';
import { CardTokenAllowance, AllowanceState } from '../types';
import Logger from '../../../../util/Logger';
import { ethers } from 'ethers';

/**
 * Hook to get the latest allowance from approval logs for the priority token.
 * This is only needed in authenticated mode when the allowance state is Limited,
 * to display the spending limit progress bar with the correct total allowance.
 * The latest allowance represents the most recent approval amount the user set,
 * which is used as the "total" for calculating spending progress.
 *
 * Optimization: Only fetches from logs when allowanceState === Limited.
 * For Enabled (unlimited) or NotEnabled states, this fetch is skipped as it's not needed.
 *
 * @param priorityToken - The priority token to fetch the latest allowance for
 * @returns Object containing:
 * - latestAllowance: The latest approval amount from logs (human-readable string)
 * - isLoading: Loading state
 * - error: Error object if any
 * - refetch: Function to manually trigger fetch
 */
const useGetLatestAllowanceForPriorityToken = (
  priorityToken: CardTokenAllowance | null | undefined,
) => {
  const { sdk } = useCardSDK();
  const [latestAllowance, setLatestAllowance] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchLatestAllowance = useCallback(async () => {
    if (!sdk || !priorityToken) {
      return;
    }

    // Only fetch for Limited allowance state
    // Unlimited (Enabled) and NotEnabled states don't need totalAllowance from logs
    if (priorityToken.allowanceState !== AllowanceState.Limited) {
      return;
    }

    // Only fetch for Linea EVM tokens
    if (priorityToken.caipChainId !== sdk.lineaChainId) {
      return;
    }

    const tokenAddress =
      priorityToken.stagingTokenAddress || priorityToken.address;

    if (!tokenAddress || !ethers.utils.isAddress(tokenAddress)) {
      return;
    }

    if (
      !priorityToken.delegationContract ||
      !priorityToken.walletAddress ||
      !priorityToken.decimals
    ) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Convert current allowance (human-readable) to wei for comparison
      const currentAllowanceWei = ethers.utils
        .parseUnits(priorityToken.allowance || '0', priorityToken.decimals)
        .toString();

      const rawLatestAllowance = await sdk.getLatestAllowanceFromLogs(
        priorityToken.walletAddress,
        tokenAddress,
        priorityToken.delegationContract,
        currentAllowanceWei, // Pass current allowance for comparison
      );

      if (rawLatestAllowance) {
        // Convert from wei to human-readable using token decimals
        const formatted = ethers.utils.formatUnits(
          rawLatestAllowance,
          priorityToken.decimals,
        );
        setLatestAllowance(formatted);
      } else {
        setLatestAllowance(null);
      }
    } catch (err) {
      const normalizedError =
        err instanceof Error ? err : new Error(String(err));
      Logger.error(
        normalizedError,
        'useGetLatestAllowanceForPriorityToken: Failed to fetch latest allowance',
      );
      setError(normalizedError);
      setLatestAllowance(null);
    } finally {
      setIsLoading(false);
    }
  }, [sdk, priorityToken]);

  useEffect(() => {
    fetchLatestAllowance();
  }, [fetchLatestAllowance]);

  return {
    latestAllowance,
    isLoading,
    error,
    refetch: fetchLatestAllowance,
  };
};

export default useGetLatestAllowanceForPriorityToken;
