import { useCallback, useState } from 'react';
import { useCardSDK } from '../sdk';
import { CardTokenAllowance } from '../types';

/**
 * Hook to retrieve priority card token
 *
 * This hook provides functionality to fetch the priority token for a given address
 * from a list of card token allowances. It determines the priority token by:
 * 1. Filtering allowances with non-zero amounts
 * 2. Calling the SDK's getPriorityToken method
 * 3. Returning the matching allowance or falling back to the first allowance
 *
 * @param address - Optional wallet address to fetch priority token for
 * @returns Object containing fetchPriorityToken function and loading state
 */
export const useGetPriorityCardToken = (address?: string) => {
  // SDK context
  const { sdk } = useCardSDK();

  // Loading state
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Fetch priority token function
  const fetchPriorityToken = useCallback(
    async (cardTokenAllowances: CardTokenAllowance[]) => {
      if (!sdk || !address) {
        return null;
      }

      setIsLoading(true);
      try {
        // Filter allowances with non-zero amounts and extract addresses
        const nonZeroAllowanceTokens = cardTokenAllowances
          .filter((item) => item.allowance.gt(0))
          .map((item) => item.address);

        // Get priority token from SDK
        const retrievedPriorityToken = await sdk.getPriorityToken(
          address,
          nonZeroAllowanceTokens,
        );

        if (retrievedPriorityToken) {
          // Find the matching allowance for the priority token
          const cardTokenAllowance = cardTokenAllowances.find(
            (item) =>
              item.address.toLowerCase() ===
              retrievedPriorityToken.address?.toLowerCase(),
          );

          return cardTokenAllowance || null;
        }

        // Fallback to first allowance if no priority token found
        return cardTokenAllowances[0] || null;
      } catch (error) {
        console.error('Error fetching priority token:', error);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [sdk, address],
  );

  return { fetchPriorityToken, isLoading };
};
