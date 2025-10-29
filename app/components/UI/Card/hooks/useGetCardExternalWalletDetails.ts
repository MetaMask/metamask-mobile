import { useCallback } from 'react';
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
 * Maps a CardExternalWalletDetail to CardTokenAllowance format
 * @param cardExternalWalletDetail - External wallet detail from API
 * @returns Mapped CardTokenAllowance or null if invalid
 */
export const mapCardExternalWalletDetailToCardTokenAllowance = (
  cardExternalWalletsDetail: (CardExternalWalletDetail | undefined)[],
  totalAllowances: {
    address: string;
    allowance: string | undefined;
  }[],
): (CardTokenAllowance | null)[] =>
  cardExternalWalletsDetail.map((cardExternalWalletDetail) => {
    if (!cardExternalWalletDetail) {
      return null;
    }

    const allowanceFloat = parseFloat(
      cardExternalWalletDetail.allowance || '0',
    );
    const balanceFloat = parseFloat(cardExternalWalletDetail.balance || '0');

    const allowanceState =
      allowanceFloat === 0
        ? AllowanceState.NotEnabled
        : allowanceFloat < ARBITRARY_ALLOWANCE
          ? AllowanceState.Limited
          : AllowanceState.Enabled;
    const availableBalance = Math.min(balanceFloat, allowanceFloat);

    // Find totalAllowance by matching the token address
    // Use stagingTokenAddress if available (for staging environment), otherwise use regular address
    const tokenAddressToMatch =
      cardExternalWalletDetail.stagingTokenAddress ||
      cardExternalWalletDetail.tokenDetails.address;

    const totalAllowance = totalAllowances.find(
      (ta) => ta.address.toLowerCase() === tokenAddressToMatch?.toLowerCase(),
    );

    return {
      address: cardExternalWalletDetail.tokenDetails.address ?? '',
      decimals: cardExternalWalletDetail.tokenDetails.decimals ?? 0,
      symbol: cardExternalWalletDetail.tokenDetails.symbol ?? '',
      name: cardExternalWalletDetail.tokenDetails.name ?? '',
      walletAddress: cardExternalWalletDetail.walletAddress,
      caipChainId: cardExternalWalletDetail.caipChainId,
      allowanceState,
      totalAllowance,
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

  const fetchCardExternalWalletDetails = useCallback(async () => {
    if (!sdk || !isAuthenticated || !delegationSettings) {
      return null;
    }

    try {
      const cardExternalWalletDetails = await sdk.getCardExternalWalletDetails(
        delegationSettings.networks,
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

      // Filter to only get EVM tokens for Linea (exclude Solana and other non-EVM chains)
      // The balance scanner contract only works with EVM addresses
      const lineaEvmTokens = cardExternalWalletDetails.filter(
        (detail) =>
          detail.caipChainId === sdk.lineaChainId &&
          detail.tokenDetails.address,
      );

      const totalAllowances = await sdk.getTotalAllowance(lineaEvmTokens);
      const mappedWalletDetails =
        mapCardExternalWalletDetailToCardTokenAllowance(
          cardExternalWalletDetails,
          totalAllowances,
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
  }, [sdk, isAuthenticated, delegationSettings]);

  return useWrapWithCache(
    'card-external-wallet-details',
    fetchCardExternalWalletDetails,
    { cacheDuration: 60 * 1000 }, // 60 seconds cache (matches authenticated mode in useGetPriorityCardToken)
  );
};

export default useGetCardExternalWalletDetails;
