import React, { useCallback, useEffect, useState } from 'react';
import { SecurityOptionToggle } from '../../../../UI/SecurityOptionToggle';
import { strings } from '../../../../../../locales/i18n';
import { useSelector, useDispatch } from 'react-redux';
import { setAllowLoginWithRememberMe } from '../../../../../actions/security';
import { useNavigation } from '@react-navigation/native';
import { createTurnOffRememberMeModalNavDetails } from '../../../..//UI/TurnOffRememberMeModal/TurnOffRememberMeModal';

import { Authentication } from '../../../../../core';
import AUTHENTICATION_TYPE from '../../../../../constants/userProperties';
import { TURN_ON_REMEMBER_ME } from '../SecuritySettings.constants';
import Logger from '../../../../../util/Logger';

const RememberMeOptionSection = () => {
  const { navigate } = useNavigation();
  const allowLoginWithRememberMe = useSelector(
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (state: any) => state.security.allowLoginWithRememberMe,
  );

  const [isUsingRememberMe, setIsUsingRememberMe] = useState<boolean>(false);
  useEffect(() => {
    const checkIfAlreadyUsingRememberMe = async () => {
      const authType = await Authentication.getType();
      setIsUsingRememberMe(
        authType.currentAuthType === AUTHENTICATION_TYPE.REMEMBER_ME,
      );
    };
    checkIfAlreadyUsingRememberMe();
  }, []);

  const dispatch = useDispatch();

  const toggleRememberMe = useCallback(
    async (value: boolean) => {
      dispatch(setAllowLoginWithRememberMe(value));

      if (value) {
        // When enabling Remember Me, re-store password with REMEMBER_ME type
        // This removes biometric/passcode protection for convenience
        try {
          const credentials = await Authentication.getPassword();
          if (
            credentials &&
            typeof credentials === 'object' &&
            credentials.password
          ) {
            await Authentication.storePassword(
              credentials.password,
              AUTHENTICATION_TYPE.REMEMBER_ME,
            );
            Logger.log(
              'RememberMe: Password re-stored with REMEMBER_ME type (no biometric)',
            );
          }
        } catch (error) {
          Logger.error(
            error as Error,
            'RememberMe: Failed to re-store password:',
          );
        }
      }
    },
    [dispatch],
  );

  const onValueChanged = useCallback(
    (enabled: boolean) => {
      if (isUsingRememberMe) {
        navigate(...createTurnOffRememberMeModalNavDetails());
      } else {
        toggleRememberMe(enabled).catch((err) => {
          console.error('Failed to toggle Remember Me:', err);
        });
      }
    },
    [isUsingRememberMe, navigate, toggleRememberMe],
  );

  return (
    <SecurityOptionToggle
      title={strings(`remember_me.enable_remember_me`)}
      description={strings(`remember_me.enable_remember_me_description`)}
      value={allowLoginWithRememberMe}
      onOptionUpdated={(value) => onValueChanged(value)}
      testId={TURN_ON_REMEMBER_ME}
    />
  );
};

export default React.memo(RememberMeOptionSection);
