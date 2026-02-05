import { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { UseAuthCapabilitiesResult } from './useAuthCapabilities.types';
import { RootState } from '../../../reducers';
import AUTHENTICATION_TYPE from '../../../constants/userProperties';
import { setOsAuthEnabled } from '../../../actions/security';
import { Authentication } from '../Authentication';

/**
 * Hook that detects device authentication capabilities using expo-local-authentication.
 *
 */
const useAuthCapabilities = (): UseAuthCapabilitiesResult => {
  const [isLoading, setIsLoading] = useState(true);
  const [capabilities, setCapabilities] = useState<
    UseAuthCapabilitiesResult['capabilities'] | null
  >(null);
  const osAuthEnabled = useSelector(
    (state: RootState) => state.security.osAuthEnabled,
  );
  const dispatch = useDispatch();

  const updateOsAuthEnabled = useCallback(() => {
    dispatch(setOsAuthEnabled(!osAuthEnabled));
  }, [dispatch, osAuthEnabled]);

  const fetchAuthCapabilities = useCallback(async () => {
    setIsLoading(true);
    try {
      const capabilities =
        await Authentication.getAuthCapabilities(osAuthEnabled);
      setCapabilities(capabilities);
    } catch (error) {
      // On error, default to no capabilities
      setCapabilities({
        isBiometricsAvailable: false,
        biometricsDisabledOnOS: false,
        isAuthToggleVisible: false,
        authToggleLabel: '',
        osAuthEnabled,
        authStorageType: AUTHENTICATION_TYPE.PASSWORD,
      });
    } finally {
      setIsLoading(false);
    }
  }, [osAuthEnabled]);

  useEffect(() => {
    fetchAuthCapabilities();
  }, [fetchAuthCapabilities, osAuthEnabled]);

  return {
    isLoading,
    capabilities,
    refresh: fetchAuthCapabilities,
    updateOsAuthEnabled,
  };
};

export default useAuthCapabilities;
