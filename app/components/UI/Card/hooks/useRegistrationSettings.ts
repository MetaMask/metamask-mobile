import { useCallback } from 'react';
import { useCardSDK } from '../sdk';
import { useWrapWithCache } from './useWrapWithCache';

/**
 * Hook to fetch and cache registration settings from the Card SDK
 *
 * @returns Object containing registration settings data, loading state, error, and fetch function
 */
const useRegistrationSettings = () => {
  const { sdk } = useCardSDK();

  const fetchRegistrationSettings = useCallback(async () => {
    if (!sdk) {
      throw new Error('Card SDK not available');
    }
    return sdk.getRegistrationSettings();
  }, [sdk]);

  return useWrapWithCache(
    'registration-settings',
    fetchRegistrationSettings,
    { cacheDuration: 5 * 60 * 1000 }, // 5 minutes cache
  );
};

export default useRegistrationSettings;
