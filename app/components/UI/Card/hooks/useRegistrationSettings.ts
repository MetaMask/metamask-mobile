import { useCardSDK } from '../sdk';
import { useWrapWithCache } from './useWrapWithCache';
import { CardLocation } from '../types';

/**
 * Hook to fetch and cache registration settings from the Card SDK
 *
 * @param location - The card location ('us' or 'international'), defaults to 'international'
 * @returns Object containing registration settings data, loading state, error, and fetch function
 */
const useRegistrationSettings = (location: CardLocation = 'international') => {
  const { sdk } = useCardSDK();

  const fetchRegistrationSettings = async () => {
    if (!sdk) {
      throw new Error('Card SDK not available');
    }
    return sdk.getRegistrationSettings(location);
  };

  return useWrapWithCache(
    `registration-settings-${location}`,
    fetchRegistrationSettings,
    { cacheDuration: 5 * 60 * 1000 }, // 5 minutes cache
  );
};

export default useRegistrationSettings;
