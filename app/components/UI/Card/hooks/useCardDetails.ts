import { useCallback, useEffect, useState } from 'react';
import { useCardSDK } from '../sdk';
import { CardDetailsResponse, CardError, CardErrorType } from '../types';

interface State {
  cardDetails: CardDetailsResponse | null;
  isLoading: boolean;
  error: CardErrorType | null;
}

const useCardDetails = () => {
  const [state, setState] = useState<State>({
    cardDetails: null,
    isLoading: false,
    error: null,
  });
  const { sdk, isAuthenticated } = useCardSDK();

  const fetchCardDetails = useCallback(async () => {
    if (!sdk) return;
    setState((prevState) => ({
      ...prevState,
      isLoading: true,
      error: null,
    }));

    try {
      const cardDetailsResponse = await sdk.getCardDetails();

      setState((prevState) => ({
        ...prevState,
        cardDetails: cardDetailsResponse,
        isLoading: false,
      }));
    } catch (err) {
      if (err instanceof CardError) {
        if (err.type === CardErrorType.NO_CARD) {
          // Add Card Provisioning Flow
          setState((prevState) => ({
            ...prevState,
            isLoading: false,
          }));
          return;
        }
      }

      setState((prevState) => ({
        ...prevState,
        isLoading: false,
        error: CardErrorType.UNKNOWN_ERROR,
      }));
    }
  }, [sdk]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCardDetails();
    }
  }, [isAuthenticated, fetchCardDetails]);

  return { ...state, fetchCardDetails };
};

export default useCardDetails;
