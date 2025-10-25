import { useCallback, useEffect, useState } from 'react';
import { useCardSDK } from '../sdk';
<<<<<<< HEAD
import {
  CardDetailsResponse,
  CardError,
  CardErrorType,
  CardStatus,
  CardWarning,
} from '../types';
=======
import { CardDetailsResponse, CardError, CardErrorType } from '../types';
>>>>>>> 8ae259608f (feat: card delegation)
import { selectIsAuthenticatedCard } from '../../../../core/redux/slices/card';
import { useSelector } from 'react-redux';

interface State {
  cardDetails: CardDetailsResponse | null;
  isLoading: boolean;
<<<<<<< HEAD
  isLoadingPollCardStatusUntilProvisioned: boolean;
  error: CardErrorType | null;
  warning: CardWarning | null;
=======
  error: CardErrorType | null;
>>>>>>> 8ae259608f (feat: card delegation)
}

const useCardDetails = () => {
  const [state, setState] = useState<State>({
    cardDetails: null,
    isLoading: false,
<<<<<<< HEAD
    isLoadingPollCardStatusUntilProvisioned: false,
    error: null,
    warning: null,
=======
    error: null,
>>>>>>> 8ae259608f (feat: card delegation)
  });
  const isAuthenticated = useSelector(selectIsAuthenticatedCard);
  const { sdk, isLoading: isSDKLoading } = useCardSDK();

  const fetchCardDetails = useCallback(async () => {
    if (!sdk) return;
    setState((prevState) => ({
      ...prevState,
      isLoading: true,
      error: null,
<<<<<<< HEAD
      warning: null,
=======
>>>>>>> 8ae259608f (feat: card delegation)
    }));

    try {
      const cardDetailsResponse = await sdk.getCardDetails();
<<<<<<< HEAD
      let warning: CardWarning | null = null;

      if (cardDetailsResponse.status === CardStatus.FROZEN) {
        warning = CardWarning.Frozen;
      } else if (cardDetailsResponse.status === CardStatus.BLOCKED) {
        warning = CardWarning.Blocked;
      }
=======
>>>>>>> 8ae259608f (feat: card delegation)

      setState((prevState) => ({
        ...prevState,
        cardDetails: cardDetailsResponse,
        isLoading: false,
<<<<<<< HEAD
        warning,
=======
>>>>>>> 8ae259608f (feat: card delegation)
      }));
    } catch (err) {
      if (err instanceof CardError) {
        if (err.type === CardErrorType.NO_CARD) {
<<<<<<< HEAD
          setState((prevState) => ({
            ...prevState,
            isLoading: false,
            warning: CardWarning.NoCard,
=======
          // Add Card Provisioning Flow
          setState((prevState) => ({
            ...prevState,
            isLoading: false,
>>>>>>> 8ae259608f (feat: card delegation)
          }));
          return;
        }
      }

      setState((prevState) => ({
        ...prevState,
        isLoading: false,
        error: CardErrorType.UNKNOWN_ERROR,
<<<<<<< HEAD
        warning: null,
=======
>>>>>>> 8ae259608f (feat: card delegation)
      }));
    }
  }, [sdk]);

<<<<<<< HEAD
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
=======
>>>>>>> 8ae259608f (feat: card delegation)
  useEffect(() => {
    if (isAuthenticated && !isSDKLoading) {
      fetchCardDetails();
    }
  }, [isAuthenticated, isSDKLoading, fetchCardDetails]);

<<<<<<< HEAD
  return { ...state, fetchCardDetails, pollCardStatusUntilProvisioned };
=======
  return { ...state, fetchCardDetails };
>>>>>>> 8ae259608f (feat: card delegation)
};

export default useCardDetails;
