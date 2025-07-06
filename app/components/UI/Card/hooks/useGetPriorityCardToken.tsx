import { useCallback, useState } from 'react';
import { useCardSDK } from '../sdk';
import { CardToken } from '../types';
import Logger from '../../../../util/Logger';

/**
 * Hook to retrieve piority card token
 */
export const useGetPriorityCardToken = (address?: string) => {
  const { sdk } = useCardSDK();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchPriorityToken = useCallback(
    async (nonZeroBalanceTokens: string[]) => {
      if (sdk && address) {
        setIsLoading(true);
        try {
          Logger.log(`Fetching retrievedPriorityToken for address: ${address}`);
          const retrievedPriorityToken = await sdk.getPriorityToken(
            address,
            nonZeroBalanceTokens,
          );
          Logger.log('retrievedPriorityToken', retrievedPriorityToken);

          return retrievedPriorityToken as CardToken | null;
        } catch (error) {
          console.error('Error fetching priority token:', error);
        } finally {
          setIsLoading(false);
        }
      }
    },
    [sdk, address],
  );

  return { fetchPriorityToken, isLoading };
};
