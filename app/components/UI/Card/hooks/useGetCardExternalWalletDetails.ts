import { useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { cardKeys } from '../queries';

const determineAllowanceState = (allowanceFloat: number): AllowanceState => {
  if (allowanceFloat === 0) {
    return AllowanceState.NotEnabled;
  }
  if (allowanceFloat < ARBITRARY_ALLOWANCE) {
    return AllowanceState.Limited;
  }
  return AllowanceState.Enabled;
};

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
      stagingTokenAddress: cardExternalWalletDetail.stagingTokenAddress ?? null,
      priority: cardExternalWalletDetail.priority,
      isStaked: false,
    } as CardTokenAllowance;
  });

/**
 * Hook to fetch external wallet details from the Card API (authenticated mode).
 *
 * @param delegationSettings - Delegation settings containing network configurations
 * @returns Object containing wallet details data, loading state, error, and fetch function
 */
const useGetCardExternalWalletDetails = (
  delegationSettings: DelegationSettingsResponse | null,
) => {
  const { sdk } = useCardSDK();
  const isAuthenticated = useSelector(selectIsAuthenticatedCard);

  // Use a ref to always access the latest delegation settings value.
  // This avoids stale closure issues when the queryFn runs after
  // delegationSettings was updated but before the next render.
  const delegationSettingsRef = useRef(delegationSettings);
  delegationSettingsRef.current = delegationSettings;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: cardKeys.externalWalletDetails(),
    queryFn: async () => {
      const currentDelegationSettings = delegationSettingsRef.current;
      if (!currentDelegationSettings) {
        return null;
      }

      if (!sdk) throw new Error('SDK not initialized');

      try {
        const cardExternalWalletDetails =
          await sdk.getCardExternalWalletDetails(
            currentDelegationSettings.networks,
          );

        if (!cardExternalWalletDetails?.length) {
          return {
            walletDetails: [] as CardExternalWalletDetail[],
            mappedWalletDetails: [] as CardTokenAllowance[],
            priorityWalletDetail: undefined as CardTokenAllowance | undefined,
          };
        }

        let cardExternalWalletDetailsWithPriority =
          cardExternalWalletDetails[0];

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
    },
    enabled: isAuthenticated && !!sdk && !!delegationSettings,
    staleTime: 60_000,
  });

  const fetchData = useCallback(async () => {
    const result = await refetch();
    return result.data ?? null;
  }, [refetch]);

  return {
    data: data ?? null,
    isLoading,
    error: error as Error | null,
    fetchData,
  };
};

export default useGetCardExternalWalletDetails;
