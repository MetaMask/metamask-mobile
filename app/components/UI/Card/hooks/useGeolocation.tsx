import { useCallback, useEffect, useState } from 'react';
import { useCardSDK } from '../sdk';

/**
 * Hook to manage user geolocation
 */
export const useUserLocation = (autoFetch = false) => {
  const { sdk } = useCardSDK();

  const [location, setLocation] = useState<string>('');

  const fetchLocation = useCallback(async () => {
    if (sdk) {
      try {
        const geoLocation = await sdk.getGeoLocation();
        setLocation(geoLocation);
      } catch (error) {
        console.error('Error fetching geolocation:', error);
      }
    }
  }, [sdk]);

  // Automatically fetch location if autoFetch is true
  useEffect(() => {
    if (autoFetch) {
      fetchLocation();
    }
  }, [autoFetch, fetchLocation]);

  return { location, fetchLocation };
};
