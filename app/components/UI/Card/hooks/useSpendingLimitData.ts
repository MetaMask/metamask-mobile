import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useCardSDK } from '../sdk';
import useGetDelegationSettings from './useGetDelegationSettings';
import { CardFundingToken, DelegationSettingsResponse } from '../types';
import { selectIsCardAuthenticated } from '../../../../selectors/cardController';
import { buildDelegationTokenList } from '../util/buildTokenList';

interface UseSpendingLimitDataReturn {
  availableTokens: CardFundingToken[];
  delegationSettings: DelegationSettingsResponse | null;
  isLoading: boolean;
  error: Error | null;
  fetchData: () => Promise<void>;
}

/**
 * Hook to fetch and prepare data needed for the SpendingLimit screen.
 * Builds the list of available tokens for delegation from delegation settings.
 * Uses the shared buildDelegationTokenList utility.
 */
const useSpendingLimitData = (): UseSpendingLimitDataReturn => {
  const { sdk } = useCardSDK();
  const isAuthenticated = useSelector(selectIsCardAuthenticated);

  const {
    data: delegationSettings,
    isLoading: isLoadingDelegationSettings,
    error: delegationSettingsError,
    fetchData: fetchDelegationSettings,
  } = useGetDelegationSettings();

  const availableTokens = useMemo<CardFundingToken[]>(
    () =>
      buildDelegationTokenList({
        delegationSettings,
        getSupportedTokensByChainId: sdk
          ? (chainId) =>
              sdk.getSupportedTokensByChainId(chainId) as {
                address?: string;
                symbol?: string;
                name?: string;
              }[]
          : undefined,
      }),
    [sdk, delegationSettings],
  );

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) return;
    await fetchDelegationSettings();
  }, [isAuthenticated, fetchDelegationSettings]);

  return {
    availableTokens,
    delegationSettings,
    isLoading: isLoadingDelegationSettings,
    error: delegationSettingsError,
    fetchData,
  };
};

export default useSpendingLimitData;
