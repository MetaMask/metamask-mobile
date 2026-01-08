import { useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useCardSDK } from '../sdk';
import { selectIsAuthenticatedCard } from '../../../../core/redux/slices/card';
import {
  CardExternalWalletDetail,
  CardTokenAllowance,
  AllowanceState,
  DelegationSettingsResponse,
} from '../types';
import Logger from '../../../../util/Logger';
import { isZero } from '../../../../util/lodash';
import { ARBITRARY_ALLOWANCE } from '../constants';
import { useWrapWithCache } from './useWrapWithCache';

/**
 * Determines the allowance state based on the allowance value
 * @param allowanceFloat - Parsed allowance value
 * @returns AllowanceState enum value
 */
const determineAllowanceState = (allowanceFloat: number): AllowanceState => {
  if (allowanceFloat === 0) {
    return AllowanceState.NotEnabled;
  }
  if (allowanceFloat < ARBITRARY_ALLOWANCE) {
    return AllowanceState.Limited;
  }
  return AllowanceState.Enabled;
};

/**
 * Maps a CardExternalWalletDetail to CardTokenAllowance format
 * @param cardExternalWalletDetail - External wallet detail from API
 * @returns Mapped CardTokenAllowance or null if invalid
 */
const mapCardExternalWalletDetailToCardTokenAllowance = (
  cardExternalWalletsDetail: (CardExternalWalletDetail | undefined)[],
): (CardTokenAllowance | null)[] =>
  cardExternalWalletsDetail.map((cardExternalWalletDetail) => {
    if (!cardExternalWalletDetail) {
      return null;
    }

    const allowanceFloat = parseFloat(
      cardExternalWalletDetail.allowance || '0',
    );
    const balanceFloat = parseFloat(cardExternalWalletDetail.balance || '0');

    const allowanceState = determineAllowanceState(allowanceFloat);
    const availableBalance = Math.min(balanceFloat, allowanceFloat);

    return {
      address: cardExternalWalletDetail.tokenDetails.address ?? '',
      decimals: cardExternalWalletDetail.tokenDetails.decimals ?? 0,
      symbol: cardExternalWalletDetail.tokenDetails.symbol ?? '',
      name: cardExternalWalletDetail.tokenDetails.name ?? '',
      walletAddress: cardExternalWalletDetail.walletAddress,
      caipChainId: cardExternalWalletDetail.caipChainId,
      allowanceState,
      allowance: allowanceFloat.toString(),
      availableBalance: availableBalance.toString(),
      delegationContract: cardExternalWalletDetail.delegationContractAddress,
      stagingTokenAddress: cardExternalWalletDetail.stagingTokenAddress ?? null, // Pass through staging token address
      priority: cardExternalWalletDetail.priority, // Preserve priority from API
      isStaked: false,
    } as CardTokenAllowance;
  });

/**
 * Hook to fetch external wallet details from the Card API (authenticated mode)
 *
 * This hook fetches all external wallet details for the authenticated user,
 * including balances, allowances, and token information.
 *
 * @param delegationSettings - Delegation settings containing network configurations
 * @returns Object containing:
 * - walletDetails: Array of CardExternalWalletDetail objects
 * - mappedWalletDetails: Array of CardTokenAllowance objects (mapped format)
 * - priorityWalletDetail: The wallet detail with highest priority (first with balance)
 * - isLoading: Loading state
 * - error: Error object if any
 * - fetch: Function to manually trigger fetch
 */
const useGetCardExternalWalletDetails = (
  delegationSettings: DelegationSettingsResponse | null,
) => {
  const { sdk } = useCardSDK();
  const isAuthenticated = useSelector(selectIsAuthenticatedCard);

  // Use a ref to always access the latest delegation settings value
  // This avoids stale closure issues when fetchCardExternalWalletDetails is called
  // after fetchDelegationSettings completes but before the next render
  const delegationSettingsRef = useRef(delegationSettings);
  delegationSettingsRef.current = delegationSettings;

  const fetchCardExternalWalletDetails = useCallback(async () => {
    // Read from ref to get the latest value (avoids stale closure)
    const currentDelegationSettings = delegationSettingsRef.current;
    if (!sdk || !isAuthenticated || !currentDelegationSettings) {
      return null;
    }

    try {
      const cardExternalWalletDetails = await sdk.getCardExternalWalletDetails(
        currentDelegationSettings.networks,
      );

      if (!cardExternalWalletDetails?.length) {
        return {
          walletDetails: [],
          mappedWalletDetails: [],
          priorityWalletDetail: null,
        };
      }

      let cardExternalWalletDetailsWithPriority = cardExternalWalletDetails[0];

      // Find the first wallet detail with a non-zero balance if there are multiple
      // If there's only one WalletExternalDetail, use the first one
      if (cardExternalWalletDetails.length > 1) {
        const detailWithBalance = cardExternalWalletDetails.find((detail) => {
          if (
            isNaN(parseFloat(detail.balance)) ||
            isZero(detail.balance) ||
            detail.balance === '0.0'
          ) {
            return false;
          }
          return true;
        });

        if (detailWithBalance) {
          cardExternalWalletDetailsWithPriority = detailWithBalance;
        }
      }

      const mappedWalletDetails =
        mapCardExternalWalletDetailToCardTokenAllowance(
          cardExternalWalletDetails,
        ).filter(Boolean) as CardTokenAllowance[];

      // Get priority wallet detail
      const priorityWalletDetail = mappedWalletDetails.find(
        (mpw) =>
          mpw.address?.toLowerCase() ===
          cardExternalWalletDetailsWithPriority.tokenDetails.address?.toLowerCase(),
      );

      return {
        walletDetails: cardExternalWalletDetails,
        mappedWalletDetails,
        priorityWalletDetail,
      };
    } catch (err) {
      const normalizedError =
        err instanceof Error ? err : new Error(String(err));
      Logger.error(
        normalizedError,
        'useGetCardExternalWalletDetails: Failed to fetch external wallet details',
      );
      throw normalizedError;
    }
    // Note: delegationSettings is accessed via ref, not closure, so it's not in dependencies
  }, [sdk, isAuthenticated]);

  // Note: Auto-fetch is disabled to prevent duplicate API calls.
  // CardHome orchestrates all data fetching via fetchAllData() to ensure
  // a single source of truth for when data is loaded.
  return useWrapWithCache(
    'card-external-wallet-details',
    fetchCardExternalWalletDetails,
    {
      cacheDuration: 60 * 1000, // 60 seconds cache (matches authenticated mode in useGetPriorityCardToken)
      fetchOnMount: false,
    },
  );
};

export default useGetCardExternalWalletDetails;
