import { useState, useEffect, useCallback } from 'react';
import { BIOMETRY_TYPE } from 'react-native-keychain';
import { Authentication } from '../../../../core';
import AUTHENTICATION_TYPE from '../../../../constants/userProperties';
import StorageWrapper from '../../../../store/storage-wrapper';
import {
  BIOMETRY_CHOICE_DISABLED,
  TRUE,
  PASSCODE_DISABLED,
} from '../../../../constants/storage';
import {
  passcodeType,
  updateAuthTypeStorageFlags,
} from '../../../../util/authentication';
import { setAllowLoginWithRememberMe as setAllowLoginWithRememberMeUtil } from '../../../../actions/security';
import Logger from '../../../../util/Logger';

interface UseAuthPreferencesParams {
  locked?: boolean;
  refreshTrigger?: boolean;
}

export const useAuthPreferences = ({
  locked,
  refreshTrigger,
}: UseAuthPreferencesParams = {}) => {
  const [biometryType, setBiometryType] = useState<
    BIOMETRY_TYPE | AUTHENTICATION_TYPE | string | null
  >(null);
  const [rememberMe, setRememberMe] = useState(false);
  const [biometryChoice, setBiometryChoice] = useState(false);
  const [hasBiometricCredentials, setHasBiometricCredentials] = useState(false);

  const setAllowLoginWithRememberMe = (enabled: boolean) =>
    setAllowLoginWithRememberMeUtil(enabled);

  const updateBiometryChoice = useCallback(
    async (newBiometryChoice: boolean) => {
      await updateAuthTypeStorageFlags(newBiometryChoice);
      setBiometryChoice(newBiometryChoice);
    },
    [],
  );

  useEffect(() => {
    const getUserAuthPreferences = async () => {
      const authData = await Authentication.getType();

      const previouslyDisabled = await StorageWrapper.getItem(
        BIOMETRY_CHOICE_DISABLED,
      );
      const passcodePreviouslyDisabled =
        await StorageWrapper.getItem(PASSCODE_DISABLED);

      if (authData.currentAuthType === AUTHENTICATION_TYPE.PASSCODE) {
        setBiometryType(passcodeType(authData.currentAuthType));
        setHasBiometricCredentials(!locked);
        setBiometryChoice(
          !(passcodePreviouslyDisabled && passcodePreviouslyDisabled === TRUE),
        );
      } else if (authData.currentAuthType === AUTHENTICATION_TYPE.REMEMBER_ME) {
        setHasBiometricCredentials(false);
        setRememberMe(true);
        setAllowLoginWithRememberMe(true);
      } else if (authData.availableBiometryType) {
        Logger.log('authData', authData);
        setBiometryType(authData.availableBiometryType);
        setHasBiometricCredentials(
          authData.currentAuthType === AUTHENTICATION_TYPE.BIOMETRIC,
        );
        setBiometryChoice(!(previouslyDisabled && previouslyDisabled === TRUE));
      }
    };

    getUserAuthPreferences();
  }, [locked, refreshTrigger]);

  return {
    biometryType,
    setBiometryType,
    rememberMe,
    setRememberMe,
    biometryChoice,
    setBiometryChoice,
    hasBiometricCredentials,
    setHasBiometricCredentials,
    updateBiometryChoice,
  };
};
