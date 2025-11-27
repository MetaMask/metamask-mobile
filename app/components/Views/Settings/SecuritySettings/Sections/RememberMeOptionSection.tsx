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
  const navigation = useNavigation();
  const allowLoginWithRememberMe = useSelector(
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (state: any) => state.security.allowLoginWithRememberMe,
  );

  const [isUsingRememberMe, setIsUsingRememberMe] = useState<boolean>(false);
  useEffect(() => {
    const checkIfAlreadyUsingRememberMe = async () => {
      const authType = await Authentication.getType();
      const isRememberMeAuth =
        authType.currentAuthType === AUTHENTICATION_TYPE.REMEMBER_ME;
      setIsUsingRememberMe(isRememberMeAuth);
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
          let credentials;
          try {
            credentials = await Authentication.getPassword();
          } catch (error) {
            Logger.log('RememberMe: getPassword() failed, will prompt user');
          }

          // If we successfully got the password, store it with REMEMBER_ME type
          if (
            credentials &&
            typeof credentials === 'object' &&
            credentials.password &&
            credentials.password !== ''
          ) {
            Logger.log(
              'RememberMe: Password retrieved, storing with REMEMBER_ME type...',
            );
            await Authentication.storePassword(
              credentials.password,
              AUTHENTICATION_TYPE.REMEMBER_ME,
            );

            // Verify it was stored correctly
            const authType = await Authentication.getType();
            Logger.log(
              `RememberMe: Password stored - new auth type = ${authType.currentAuthType}`,
            );

            if (authType.currentAuthType === AUTHENTICATION_TYPE.REMEMBER_ME) {
              Logger.log('RememberMe: ✅ Successfully enabled Remember Me');
            } else {
              Logger.error(
                new Error(
                  `Auth type mismatch: expected REMEMBER_ME, got ${authType.currentAuthType}`,
                ),
                'RememberMe: Auth type mismatch after storing',
              );
            }
          } else {
            // This follows the same pattern as biometric/passcode toggle in SecuritySettings
            Logger.log(
              'RememberMe: Could not retrieve password, navigating to EnterPasswordSimple',
            );

            navigation.navigate('EnterPasswordSimple', {
              onPasswordSet: async (password: string) => {
                try {
                  Logger.log(
                    'RememberMe: User re-entered password, storing with REMEMBER_ME type',
                  );
                  await Authentication.storePassword(
                    password,
                    AUTHENTICATION_TYPE.REMEMBER_ME,
                  );

                  const authType = await Authentication.getType();
                  if (
                    authType.currentAuthType === AUTHENTICATION_TYPE.REMEMBER_ME
                  ) {
                    Logger.log(
                      'RememberMe: ✅ Successfully enabled Remember Me after password re-entry',
                    );
                  } else {
                    dispatch(setAllowLoginWithRememberMe(false));
                  }
                } catch (storeError) {
                  dispatch(setAllowLoginWithRememberMe(false));
                }
              },
            });
          }
        } catch (error) {
          Logger.error(
            error as Error,
            'RememberMe: Failed to enable Remember Me',
          );
          dispatch(setAllowLoginWithRememberMe(false));
        }
      } else {
        Logger.log('RememberMe: Disabled - Redux state updated to false');
      }
    },
    [dispatch, navigation],
  );

  const onValueChanged = useCallback(
    (enabled: boolean) => {
      if (isUsingRememberMe) {
        navigation.navigate(...createTurnOffRememberMeModalNavDetails());
      } else {
        toggleRememberMe(enabled).catch((err) => {
          Logger.log(err as Error, 'RememberMe: Failed to toggle');
        });
      }
    },
    [isUsingRememberMe, navigation, toggleRememberMe],
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
