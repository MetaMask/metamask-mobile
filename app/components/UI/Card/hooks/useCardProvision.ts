import { useCallback, useState } from 'react';
import { useCardSDK } from '../sdk';
import Logger from '../../../../util/Logger';

export const useCardProvision = () => {
  const { sdk } = useCardSDK();
  const [isLoading, setIsLoading] = useState(false);

  const provisionCard = useCallback(async () => {
    if (!sdk) return;

    try {
      setIsLoading(true);
      const response = await sdk.provisionCard();

      if (!response.success) {
        throw new Error('Failed to provision card');
      }

      return response;
    } catch (error) {
      Logger.error(error as Error, 'Failed to provision card');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [sdk]);

  return { provisionCard, isLoading };
};
