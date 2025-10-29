import { useCallback, useState } from 'react';
import { useCardSDK } from '../sdk';
import {
  CardDetailsResponse,
  CardError,
  CardErrorType,
  CardStatus,
  CardWarning,
} from '../types';
import { selectIsAuthenticatedCard } from '../../../../core/redux/slices/card';
import { useSelector } from 'react-redux';
import { useWrapWithCache } from './useWrapWithCache';
import { AUTHENTICATED_CACHE_DURATION } from '../constants';

interface CardDetailsResult {
  cardDetails: CardDetailsResponse | null;
  warning: CardWarning | null;
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
        let warning: CardWarning | null = null;

        if (cardDetailsResponse.status === CardStatus.FROZEN) {
          warning = CardWarning.Frozen;
        } else if (cardDetailsResponse.status === CardStatus.BLOCKED) {
          warning = CardWarning.Blocked;
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
              warning: CardWarning.NoCard,
            };
          }
        }

        throw err;
      }
    }, [sdk, isAuthenticated]);

  // Use cache wrapper for card details
  const {
    data: cardDetailsData,
    isLoading,
    error,
    fetchData: fetchCardDetails,
  } = useWrapWithCache('card-details', fetchCardDetailsInternal, {
    cacheDuration: AUTHENTICATED_CACHE_DURATION, // 30 seconds cache
  });

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
    error: error ? CardErrorType.UNKNOWN_ERROR : null,
    isLoadingPollCardStatusUntilProvisioned:
      state.isLoadingPollCardStatusUntilProvisioned,
    fetchCardDetails,
    pollCardStatusUntilProvisioned,
  };
};

export default useCardDetails;
