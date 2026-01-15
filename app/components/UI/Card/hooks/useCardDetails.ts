import { useCallback, useState } from 'react';
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

interface State {
  isLoadingPollCardStatusUntilProvisioned: boolean;
}

const useCardDetails = () => {
  const [state, setState] = useState<State>({
    isLoadingPollCardStatusUntilProvisioned: false,
  });
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

  // Poll logic to check if card is provisioned
  // max polling attempts is 10, polling interval is 2 seconds
  const pollCardStatusUntilProvisioned = useCallback(
    async (maxAttempts: number = 10, pollingInterval: number = 2000) => {
      setState((prevState) => ({
        ...prevState,
        isLoadingPollCardStatusUntilProvisioned: true,
      }));
      for (let i = 0; i < maxAttempts; i++) {
        try {
          const cardDetailsResponse = await sdk?.getCardDetails();
          if (!cardDetailsResponse) {
            setState((prevState) => ({
              ...prevState,
              isLoadingPollCardStatusUntilProvisioned: false,
            }));
            return false;
          }
          if (cardDetailsResponse.status === CardStatus.ACTIVE) {
            setState((prevState) => ({
              ...prevState,
              isLoadingPollCardStatusUntilProvisioned: false,
            }));
            // Refresh card details after provisioning
            await fetchCardDetails();
            return true;
          }

          await new Promise((resolve) => setTimeout(resolve, pollingInterval));
        } catch (err) {
          setState((prevState) => ({
            ...prevState,
            isLoadingPollCardStatusUntilProvisioned: false,
          }));
          return false;
        }
      }

      // Max polling attempts reached without finding ACTIVE status
      setState((prevState) => ({
        ...prevState,
        isLoadingPollCardStatusUntilProvisioned: false,
      }));
      return false;
    },
    [sdk, fetchCardDetails],
  );

  return {
    cardDetails: cardDetailsData?.cardDetails ?? null,
    warning: cardDetailsData?.warning ?? null,
    isLoading,
    error,
    isLoadingPollCardStatusUntilProvisioned:
      state.isLoadingPollCardStatusUntilProvisioned,
    fetchCardDetails,
    pollCardStatusUntilProvisioned,
  };
};

export default useCardDetails;
