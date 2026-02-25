import { useSelector } from 'react-redux';
import { useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { selectIsAuthenticatedCard } from '../../../../core/redux/slices/card';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import useIsBaanxLoginEnabled from './isBaanxLoginEnabled';
import useCardDetails from './useCardDetails';
import { useGetPriorityCardToken } from './useGetPriorityCardToken';
import useGetCardExternalWalletDetails from './useGetCardExternalWalletDetails';
import useGetDelegationSettings from './useGetDelegationSettings';
import useGetLatestAllowanceForPriorityToken from './useGetLatestAllowanceForPriorityToken';
import useGetUserKYCStatus from './useGetUserKYCStatus';
import { CardTokenAllowance, CardStateWarning } from '../types';
import { cardKeys } from '../queries';

/**
 * Hook to load card data.
 *
 * The hook has two modes when landing on the Card Home page:
 * 1. Authenticated mode: The user is authenticated and has a priority token -- everything should be fetched from the API.
 * 2. Unauthenticated mode: The user is not authenticated BUT is a Cardholder -- everything should be fetched on-chain.
 *
 * The isAuthenticated flag is used to determine the mode.
 *
 * @returns Object containing:
 * - priorityToken: The token with highest priority (first with balance)
 * - allTokens: All available tokens with allowances (for asset selection bottom sheet)
 * - cardDetails: Card details (status, type, etc.)
 * - isLoading: Combined loading state
 * - error: Combined error state
 * - isAuthenticated: Current authentication status
 * - isBaanxLoginEnabled: Whether Baanx login is enabled
 * - isCardholder: Whether user is a cardholder
 */
const useLoadCardData = () => {
  const isAuthenticated = useSelector(selectIsAuthenticatedCard);
  const isBaanxLoginEnabled = useIsBaanxLoginEnabled();
  const queryClient = useQueryClient();
  const selectedAddress = useSelector(selectSelectedInternalAccountByScope)(
    'eip155:0',
  )?.address;

  // Delegation settings (authenticated mode only)
  const {
    data: delegationSettings,
    isLoading: isLoadingDelegationSettings,
    error: delegationSettingsError,
  } = useGetDelegationSettings();

  // External wallet details (authenticated mode, depends on delegationSettings)
  const {
    data: externalWalletDetailsData,
    isLoading: isLoadingExternalWalletDetails,
    error: externalWalletDetailsError,
  } = useGetCardExternalWalletDetails(delegationSettings);

  // Priority token (authenticated: derived from external wallet, unauthenticated: on-chain query)
  const {
    priorityToken,
    allTokensWithAllowances,
    isLoading: isLoadingPriorityToken,
    error: priorityTokenError,
    warning: priorityTokenWarning,
  } = useGetPriorityCardToken(externalWalletDetailsData);

  // Latest allowance for priority token (authenticated mode only, for spending limit display)
  const {
    latestAllowance: priorityTokenLatestAllowance,
    isLoading: isLoadingLatestAllowance,
  } = useGetLatestAllowanceForPriorityToken(
    isAuthenticated ? priorityToken : null,
  );

  // User KYC status (authenticated mode only)
  const {
    kycStatus,
    isLoading: isLoadingKYCStatus,
    error: kycStatusError,
  } = useGetUserKYCStatus(isAuthenticated);

  // Update priority token with latest allowance if available
  const priorityTokenWithLatestAllowance = useMemo(() => {
    if (!priorityToken || !isAuthenticated) {
      return priorityToken;
    }

    return {
      ...priorityToken,
      totalAllowance: priorityTokenLatestAllowance || priorityToken.allowance,
    };
  }, [priorityToken, priorityTokenLatestAllowance, isAuthenticated]);

  // Card details
  const {
    cardDetails,
    isLoading: isLoadingCardDetails,
    error: cardDetailsError,
    warning: cardDetailsWarning,
    fetchCardDetails,
  } = useCardDetails();

  // Determine which tokens list to use based on authentication status
  const allTokens: CardTokenAllowance[] = useMemo(() => {
    if (isAuthenticated) {
      return externalWalletDetailsData?.mappedWalletDetails || [];
    }
    return allTokensWithAllowances || [];
  }, [externalWalletDetailsData, isAuthenticated, allTokensWithAllowances]);

  // Combined loading state
  const isLoading = useMemo(() => {
    const baseLoading =
      isLoadingPriorityToken ||
      isLoadingCardDetails ||
      isLoadingDelegationSettings;

    if (isAuthenticated) {
      return (
        baseLoading ||
        isLoadingExternalWalletDetails ||
        isLoadingLatestAllowance ||
        isLoadingKYCStatus
      );
    }
    return baseLoading;
  }, [
    isLoadingPriorityToken,
    isLoadingCardDetails,
    isLoadingDelegationSettings,
    isLoadingExternalWalletDetails,
    isLoadingLatestAllowance,
    isLoadingKYCStatus,
    isAuthenticated,
  ]);

  // Combined error state
  const error = useMemo(() => {
    const baseError = priorityTokenError;

    if (isAuthenticated) {
      return (
        baseError ||
        externalWalletDetailsError ||
        kycStatusError ||
        delegationSettingsError ||
        cardDetailsError
      );
    }
    return baseError || delegationSettingsError || cardDetailsError;
  }, [
    priorityTokenError,
    delegationSettingsError,
    externalWalletDetailsError,
    kycStatusError,
    isAuthenticated,
    cardDetailsError,
  ]);

  // Combined warning (only from priority token and card details)
  // Priority: NoCard warning always takes precedence
  const warning = useMemo(() => {
    if (cardDetailsWarning === CardStateWarning.NoCard) {
      return cardDetailsWarning;
    }
    return priorityTokenWarning || cardDetailsWarning;
  }, [priorityTokenWarning, cardDetailsWarning]);

  // Refresh all data via React Query.
  // Preserves the delegation-settings-first ordering for the authenticated path.
  const fetchAllData = useCallback(async () => {
    if (isAuthenticated) {
      // Refetch delegation settings first (root dependency for external wallet details)
      await queryClient.refetchQueries({
        queryKey: cardKeys.delegationSettings(),
      });
      // Then refetch all dependent queries in parallel
      await Promise.all([
        queryClient.refetchQueries({
          queryKey: cardKeys.externalWalletDetails(),
        }),
        queryClient.refetchQueries({ queryKey: cardKeys.cardDetails() }),
        queryClient.refetchQueries({ queryKey: cardKeys.kycStatus() }),
      ]);
    } else if (selectedAddress) {
      await queryClient.refetchQueries({
        queryKey: cardKeys.priorityTokenOnChain(selectedAddress),
      });
    }
  }, [queryClient, isAuthenticated, selectedAddress]);

  return {
    // Token data
    priorityToken: priorityTokenWithLatestAllowance,
    allTokens,
    // Card details
    cardDetails,
    // Delegation settings and external wallet details (authenticated mode only)
    delegationSettings: isAuthenticated ? delegationSettings : null,
    externalWalletDetailsData: isAuthenticated
      ? externalWalletDetailsData
      : null,
    // KYC status (authenticated mode only)
    kycStatus: isAuthenticated ? kycStatus : null,
    // State flags
    isLoading,
    error,
    warning,
    isAuthenticated,
    isBaanxLoginEnabled,
    // Fetch functions
    fetchAllData,
    fetchCardDetails,
  };
};

export default useLoadCardData;
