import { useCallback, useEffect, useState } from 'react';
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

interface State {
  cardDetails: CardDetailsResponse | null;
  isLoading: boolean;
  isLoadingPollCardStatusUntilProvisioned: boolean;
  error: CardErrorType | null;
  warning: CardWarning | null;
}

const useCardDetails = () => {
  const [state, setState] = useState<State>({
    cardDetails: null,
    isLoading: false,
    isLoadingPollCardStatusUntilProvisioned: false,
    error: null,
    warning: null,
  });
  const isAuthenticated = useSelector(selectIsAuthenticatedCard);
  const { sdk, isLoading: isSDKLoading } = useCardSDK();

  const fetchCardDetails = useCallback(async () => {
    if (!sdk) return;
    setState((prevState) => ({
      ...prevState,
      isLoading: true,
      error: null,
      warning: null,
    }));

    try {
      const cardDetailsResponse = await sdk.getCardDetails();
      let warning: CardWarning | null = null;

      if (cardDetailsResponse.status === CardStatus.FROZEN) {
        warning = CardWarning.Frozen;
      } else if (cardDetailsResponse.status === CardStatus.BLOCKED) {
        warning = CardWarning.Blocked;
      }

      setState((prevState) => ({
        ...prevState,
        cardDetails: cardDetailsResponse,
        isLoading: false,
        warning,
      }));
    } catch (err) {
      if (err instanceof CardError) {
        if (err.type === CardErrorType.NO_CARD) {
          setState((prevState) => ({
            ...prevState,
            isLoading: false,
            warning: CardWarning.NoCard,
          }));
          return;
        }
      }

      setState((prevState) => ({
        ...prevState,
        isLoading: false,
        error: CardErrorType.UNKNOWN_ERROR,
        warning: null,
      }));
    }
  }, [sdk]);

  // Poll logic to check if card is provisioned
  // max polling attempts is 10, polling interval is 2 seconds
  const pollCardStatusUntilProvisioned = useCallback(
    async (maxAttempts: number = 10, pollingInterval: number = 2000) => {
      setState((prevState) => ({
        ...prevState,
        isLoadingPollCardStatusUntilProvisioned: true,
        error: null,
        warning: null,
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
              cardDetails: cardDetailsResponse,
              isLoadingPollCardStatusUntilProvisioned: false,
              warning: null,
            }));
            return true;
          }

          await new Promise((resolve) => setTimeout(resolve, pollingInterval));
        } catch (err) {
          setState((prevState) => ({
            ...prevState,
            isLoadingPollCardStatusUntilProvisioned: false,
            error: CardErrorType.UNKNOWN_ERROR,
            warning: null,
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
    [sdk],
  );
  useEffect(() => {
    if (isAuthenticated && !isSDKLoading) {
      fetchCardDetails();
    }
  }, [isAuthenticated, isSDKLoading, fetchCardDetails]);

  return { ...state, fetchCardDetails, pollCardStatusUntilProvisioned };
};

export default useCardDetails;
