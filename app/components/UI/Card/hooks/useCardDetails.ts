import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCardSDK } from '../sdk';
import {
  CardDetailsResponse,
  CardError,
  CardErrorType,
  CardStatus,
  CardStateWarning,
} from '../types';
import { dashboardKeys } from '../queries';

interface CardDetailsResult {
  cardDetails: CardDetailsResponse | null;
  warning: CardStateWarning | null;
}

const useCardDetails = () => {
  const { sdk } = useCardSDK();

  const {
    data: cardDetailsData,
    isLoading,
    error,
    refetch,
  } = useQuery<CardDetailsResult | null>({
    queryKey: dashboardKeys.cardDetails(),
    queryFn: async (): Promise<CardDetailsResult | null> => {
      try {
        if (!sdk) throw new Error('SDK not initialized');
        const cardDetailsResponse = await sdk.getCardDetails();
        let warning: CardStateWarning | null = null;

        if (cardDetailsResponse.status === CardStatus.FROZEN) {
          warning = CardStateWarning.Frozen;
        } else if (cardDetailsResponse.status === CardStatus.BLOCKED) {
          warning = CardStateWarning.Blocked;
        }

        return {
          cardDetails: cardDetailsResponse,
          warning,
        };
      } catch (err) {
        if (err instanceof CardError) {
          if (err.type === CardErrorType.NO_CARD) {
            return {
              cardDetails: null,
              warning: CardStateWarning.NoCard,
            };
          }
        }

        throw err;
      }
    },
    enabled: false,
    staleTime: 0,
  });

  const fetchCardDetails = useCallback(async () => {
    const result = await refetch();
    return result.data ?? null;
  }, [refetch]);

  return {
    cardDetails: cardDetailsData?.cardDetails ?? null,
    warning: cardDetailsData?.warning ?? null,
    isLoading,
    error: error as Error | null,
    fetchCardDetails,
  };
};

export default useCardDetails;
