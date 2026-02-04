import { useCallback } from 'react';
import { useCardSDK } from '../sdk';
import {
  CardDetailsResponse,
  CardError,
  CardErrorType,
  CardStatus,
  CardStateWarning,
} from '../types';
import { selectIsAuthenticatedCard } from '../../../../core/redux/slices/card';
import { useSelector } from 'react-redux';
import { useWrapWithCache } from './useWrapWithCache';
import { AUTHENTICATED_CACHE_DURATION } from '../constants';

interface CardDetailsResult {
  cardDetails: CardDetailsResponse | null;
  warning: CardStateWarning | null;
}

const useCardDetails = () => {
  const isAuthenticated = useSelector(selectIsAuthenticatedCard);
  const { sdk } = useCardSDK();

  const fetchCardDetailsInternal =
    useCallback(async (): Promise<CardDetailsResult | null> => {
      if (!sdk || !isAuthenticated) {
        return null;
      }

      try {
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
    }, [sdk, isAuthenticated]);

  // Use cache wrapper for card details
  const cacheResult = useWrapWithCache(
    'card-details',
    fetchCardDetailsInternal,
    {
      cacheDuration: AUTHENTICATED_CACHE_DURATION, // 30 seconds cache
      fetchOnMount: false,
    },
  );

  const {
    data: cardDetailsData,
    isLoading,
    error,
    fetchData: fetchCardDetails,
  } = cacheResult;

  return {
    cardDetails: cardDetailsData?.cardDetails ?? null,
    warning: cardDetailsData?.warning ?? null,
    isLoading,
    error,
    fetchCardDetails,
  };
};

export default useCardDetails;
