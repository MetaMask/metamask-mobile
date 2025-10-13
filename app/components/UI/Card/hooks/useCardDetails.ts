import { useEffect, useState } from 'react';
import { useCardSDK } from '../sdk';
import { CardDetailsResponse, CardError, CardErrorType } from '../types';

const useCardDetails = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<CardErrorType | null>(null);
  const { sdk, isAuthenticated } = useCardSDK();
  const [cardDetails, setCardDetails] = useState<CardDetailsResponse | null>(
    null,
  );

  useEffect(() => {
    const fetchCardDetails = async () => {
      if (!sdk) return;
      setIsLoading(true);

      try {
        const cardDetailsResponse = await sdk.getCardDetails();
        setCardDetails(cardDetailsResponse);
        setIsLoading(false);
      } catch (err) {
        if (err instanceof CardError) {
          setError(err.type);
        } else {
          setError(CardErrorType.UNKNOWN_ERROR);
        }

        setIsLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchCardDetails();
    }
  }, [sdk, isAuthenticated]);

  return { cardDetails, isLoading, error };
};

export default useCardDetails;
