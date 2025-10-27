import { useSelector } from 'react-redux';
import { useMemo } from 'react';
import { selectIsAuthenticatedCard } from '../../../../core/redux/slices/card';
import useIsBaanxLoginEnabled from './isBaanxLoginEnabled';
import useCardDetails from './useCardDetails';
import { useGetPriorityCardToken } from './useGetPriorityCardToken';
import { useIsCardholder } from './useIsCardholder';
import useGetCardExternalWalletDetails from './useGetCardExternalWalletDetails';
import { CardTokenAllowance } from '../types';
import Logger from '../../../../util/Logger';

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
 * - Asset Balance (via useAssetBalance hook - used separately)
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
  const isCardholder = useIsCardholder();

  // Authenticated mode: Get all wallet details from API
  const {
    data: externalWalletDetailsData,
    isLoading: isLoadingExternalWalletDetails,
    error: externalWalletDetailsError,
    fetchData: fetchExternalWalletDetails,
  } = useGetCardExternalWalletDetails();

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

  Logger.log('allTokens', allTokens);

  // Combined loading state
  const isLoading = useMemo(() => {
    const baseLoading = isLoadingPriorityToken || isLoadingCardDetails;

    if (isAuthenticated) {
      return baseLoading || isLoadingExternalWalletDetails;
    }
    return baseLoading; // Unauthenticated loading is handled by useGetPriorityCardToken
  }, [
    isLoadingPriorityToken,
    isLoadingCardDetails,
    isLoadingExternalWalletDetails,
    isAuthenticated,
  ]);

  // Combined error state
  const error = useMemo(() => {
    const baseError = priorityTokenError || cardDetailsError;

    if (isAuthenticated) {
      return baseError || externalWalletDetailsError;
    }
    return baseError; // Unauthenticated errors are handled by useGetPriorityCardToken
  }, [
    priorityTokenError,
    cardDetailsError,
    externalWalletDetailsError,
    isAuthenticated,
  ]);

  // Combined warning (only from priority token and card details)
  const warning = useMemo(
    () => priorityTokenWarning || cardDetailsWarning,
    [priorityTokenWarning, cardDetailsWarning],
  );

  // Manual fetch function to refresh all data
  const fetchAllData = useMemo(
    () => async () => {
      if (isAuthenticated) {
        await Promise.all([
          fetchPriorityToken(),
          fetchCardDetails(),
          fetchExternalWalletDetails(),
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
    ],
  );

  return {
    // Token data
    priorityToken,
    allTokens,
    // Card details
    cardDetails,
    // State flags
    isLoading,
    error,
    warning,
    isAuthenticated,
    isBaanxLoginEnabled,
    isCardholder,
    // Fetch functions
    fetchAllData,
    fetchPriorityToken,
    fetchCardDetails,
    // Card provisioning
    pollCardStatusUntilProvisioned,
    isLoadingPollCardStatusUntilProvisioned,
  };
};

export default useLoadCardData;
