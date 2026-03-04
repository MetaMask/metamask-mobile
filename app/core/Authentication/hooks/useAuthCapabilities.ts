import { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { UseAuthCapabilitiesResult } from './useAuthCapabilities.types';
import { RootState } from '../../../reducers';
import AUTHENTICATION_TYPE from '../../../constants/userProperties';
import { setOsAuthEnabled } from '../../../actions/security';
import { Authentication } from '../Authentication';

/**
 * Hook that detects device authentication capabilities using expo-local-authentication.
 * Considers both osAuthEnabled and allowLoginWithRememberMe preferences.
 * Priority: REMEMBER_ME > BIOMETRIC > PASSCODE > PASSWORD
 */
const useAuthCapabilities = (): UseAuthCapabilitiesResult => {
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
  const dispatch = useDispatch();

  const updateOsAuthEnabled = useCallback(() => {
    dispatch(setOsAuthEnabled(!osAuthEnabled));
  }, [dispatch, osAuthEnabled]);

  const fetchAuthCapabilities = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await Authentication.getAuthCapabilities(
        osAuthEnabled,
        allowLoginWithRememberMe,
      );
      setCapabilities(result);
    } catch (error) {
      // On error, default to no capabilities
      setCapabilities({
        isBiometricsAvailable: false,
        biometricsDisabledOnOS: false,
        isAuthToggleVisible: false,
        authToggleLabel: '',
        osAuthEnabled,
        allowLoginWithRememberMe,
        authStorageType: AUTHENTICATION_TYPE.PASSWORD,
      });
    } finally {
      setIsLoading(false);
    }
  }, [osAuthEnabled, allowLoginWithRememberMe]);

  useEffect(() => {
    fetchAuthCapabilities();
  }, [fetchAuthCapabilities, osAuthEnabled, allowLoginWithRememberMe]);

  return {
    isLoading,
    capabilities,
    refresh: fetchAuthCapabilities,
    updateOsAuthEnabled,
  };
};

export default useAuthCapabilities;
