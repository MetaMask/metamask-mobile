import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { UseAuthCapabilitiesResult } from './useAuthCapabilities.types';
import { RootState } from '../../../reducers';
import useAuthentication from './useAuthentication';

/**
 * Hook that detects device authentication capabilities using expo-local-authentication.
 * Considers both osAuthEnabled and allowLoginWithRememberMe preferences.
 * Priority: REMEMBER_ME > BIOMETRIC > PASSCODE > PASSWORD
 */
const useAuthCapabilities = (): UseAuthCapabilitiesResult => {
  const { getAuthCapabilities } = useAuthentication();
  const [isLoading, setIsLoading] = useState(true);
  const [capabilities, setCapabilities] = useState<
    UseAuthCapabilitiesResult['capabilities'] | null
  >(null);
  const osAuthEnabled = useSelector(
    (state: RootState) => state.security.osAuthEnabled,
  );
  const allowLoginWithRememberMe = useSelector(
    (state: RootState) => state.security.allowLoginWithRememberMe,
  );

  const fetchAuthCapabilities = useCallback(async () => {
    setIsLoading(true);
    try {
      // No need to catch error as it will return default capabilities
      const result = await getAuthCapabilities({
        osAuthEnabled,
        allowLoginWithRememberMe,
      });
      setCapabilities(result);
    } finally {
      setIsLoading(false);
    }
  }, [osAuthEnabled, allowLoginWithRememberMe, getAuthCapabilities]);

  useEffect(() => {
    fetchAuthCapabilities();
  }, [fetchAuthCapabilities, osAuthEnabled, allowLoginWithRememberMe]);

  return {
    isLoading,
    capabilities,
  };
};

export default useAuthCapabilities;
