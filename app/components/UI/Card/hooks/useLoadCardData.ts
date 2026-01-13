import { useSelector } from 'react-redux';
import { useMemo } from 'react';
import { selectIsAuthenticatedCard } from '../../../../core/redux/slices/card';
import useIsBaanxLoginEnabled from './isBaanxLoginEnabled';
import useCardDetails from './useCardDetails';
import { useGetPriorityCardToken } from './useGetPriorityCardToken';
import useGetCardExternalWalletDetails from './useGetCardExternalWalletDetails';
import useGetDelegationSettings from './useGetDelegationSettings';
import useGetLatestAllowanceForPriorityToken from './useGetLatestAllowanceForPriorityToken';
import useGetUserKYCStatus from './useGetUserKYCStatus';
import { CardTokenAllowance, CardWarning } from '../types';

/**
 * Hook to load card data.
 *
 * The hook has two modes when landing on the Card Home page:
 * 1. Authenticated mode: The user is authenticated and has a priority token -- everything should be fetched from the API.
 * 2. Unauthenticated mode: The user is not authenticated BUT is a Cardholder -- everything should be fetched on-chain.
 *
 * The isAuthenticated flag is used to determine the mode.
 *
 * The hook will return the following data:
 * Shared by both modes:
 * - Priority token (single token with highest priority)
 * - All available tokens with allowances (for asset selection)
 * - Asset Balance (via useAssetBalances hook - used separately)
 * - Open Swaps (via useOpenSwaps hook - used separately)
 * - Card Details (for card status, type, etc.)
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

  // Get delegation settings (only used in authenticated mode)
  const {
    data: delegationSettings,
    isLoading: isLoadingDelegationSettings,
    error: delegationSettingsError,
    fetchData: fetchDelegationSettings,
  } = useGetDelegationSettings();

  // Authenticated mode: Get all wallet details from API
  // Pass delegationSettings to avoid duplicate hook calls
  const {
    data: externalWalletDetailsData,
    isLoading: isLoadingExternalWalletDetails,
    error: externalWalletDetailsError,
    fetchData: fetchExternalWalletDetails,
  } = useGetCardExternalWalletDetails(delegationSettings);

  // Get priority token (works for both authenticated and unauthenticated)
  // Authenticated: uses externalWalletDetailsData
  // Unauthenticated: fetches allowances internally via sdk.getSupportedTokensAllowances()
  const {
    priorityToken,
    allTokensWithAllowances,
    isLoading: isLoadingPriorityToken,
    error: priorityTokenError,
    warning: priorityTokenWarning,
    fetchPriorityToken,
  } = useGetPriorityCardToken(externalWalletDetailsData);

  // Get latest allowance for priority token (authenticated mode only, for spending limit display)
  // This fetches the most recent approval amount from on-chain logs
  const {
    latestAllowance: priorityTokenLatestAllowance,
    isLoading: isLoadingLatestAllowance,
  } = useGetLatestAllowanceForPriorityToken(
    isAuthenticated ? priorityToken : null,
  );

  // Get user KYC status (authenticated mode only)
  const {
    kycStatus,
    isLoading: isLoadingKYCStatus,
    error: kycStatusError,
    fetchKYCStatus,
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

  // Get card details (only needed for unauthenticated mode)
  const {
    cardDetails,
    isLoading: isLoadingCardDetails,
    error: cardDetailsError,
    warning: cardDetailsWarning,
    fetchCardDetails,
    pollCardStatusUntilProvisioned,
    isLoadingPollCardStatusUntilProvisioned,
  } = useCardDetails();

  // Determine which tokens list to use based on authentication status
  const allTokens: CardTokenAllowance[] = useMemo(() => {
    if (isAuthenticated) {
      // Authenticated: Use API data (tokens user has delegated)
      return externalWalletDetailsData?.mappedWalletDetails || [];
    }
    // Unauthenticated: Use on-chain data from useGetPriorityCardToken
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
    // In unauthenticated mode, still check for delegation settings and card details errors
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
  // Priority: NoCard warning always takes precedence because the user must provision a card before delegating
  const warning = useMemo(() => {
    if (cardDetailsWarning === CardWarning.NoCard) {
      return cardDetailsWarning;
    }
    return priorityTokenWarning || cardDetailsWarning;
  }, [priorityTokenWarning, cardDetailsWarning]);

  // Manual fetch function to refresh all data
  // Note: fetchExternalWalletDetails depends on delegationSettings, so we must
  // ensure delegation settings is available first before fetching wallet details
  const fetchAllData = useMemo(
    () => async () => {
      if (isAuthenticated) {
        // First, fetch delegation settings (required for external wallet details)
        await fetchDelegationSettings();
        // Then fetch all other data in parallel
        await Promise.all([
          fetchPriorityToken(),
          fetchCardDetails(),
          fetchExternalWalletDetails(),
          fetchKYCStatus(),
        ]);
      } else {
        await Promise.all([fetchPriorityToken()]);
      }
    },
    [
      fetchPriorityToken,
      fetchCardDetails,
      isAuthenticated,
      fetchExternalWalletDetails,
      fetchKYCStatus,
      fetchDelegationSettings,
    ],
  );

  // Force refetch function that bypasses cache
  const refetchAllData = useMemo(
    () => async () => {
      if (isAuthenticated) {
        // First, refetch delegation settings (required for external wallet details)
        // fetchExternalWalletDetails reads delegation settings from a ref, so it must
        // run after delegation settings is available to avoid returning null.
        await fetchDelegationSettings();

        await Promise.all([
          fetchExternalWalletDetails(),
          fetchCardDetails(),
          fetchPriorityToken(),
          fetchKYCStatus(),
        ]);
      } else {
        await Promise.all([fetchPriorityToken()]);
      }
    },
    [
      isAuthenticated,
      fetchDelegationSettings,
      fetchExternalWalletDetails,
      fetchCardDetails,
      fetchPriorityToken,
      fetchKYCStatus,
    ],
  );

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
    refetchAllData,
    fetchPriorityToken,
    fetchCardDetails,
    // Card provisioning
    pollCardStatusUntilProvisioned,
    isLoadingPollCardStatusUntilProvisioned,
  };
};

export default useLoadCardData;
