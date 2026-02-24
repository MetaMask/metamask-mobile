import React, { useCallback } from 'react';
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
import AuthenticationError from '../../../../../core/Authentication/AuthenticationError';
import { AUTHENTICATION_APP_TRIGGERED_AUTH_NO_CREDENTIALS } from '../../../../../constants/error';
import StorageWrapper from '../../../../../store/storage-wrapper';
import { PREVIOUS_AUTH_TYPE_BEFORE_REMEMBER_ME } from '../../../../../constants/storage';

const RememberMeOptionSection = () => {
  const { navigate } = useNavigation();
  const allowLoginWithRememberMe = useSelector(
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (state: any) => state.security?.allowLoginWithRememberMe,
  );

  const dispatch = useDispatch();

  const toggleRememberMe = useCallback(
    async (value: boolean) => {
      // If enabling remember me, update the password storage type first
      if (value) {
        try {
          await Authentication.updateAuthPreference({
            authType: AUTHENTICATION_TYPE.REMEMBER_ME,
          });
          // Only set Redux state after operation completes successfully
          dispatch(setAllowLoginWithRememberMe(value));
        } catch (error) {
          // Check if error is "password required" - navigate to password entry
          const isPasswordRequiredError =
            error instanceof AuthenticationError &&
            error.customErrorMessage ===
              AUTHENTICATION_APP_TRIGGERED_AUTH_NO_CREDENTIALS;

          if (isPasswordRequiredError) {
            // Navigate to password entry
            navigate('EnterPasswordSimple', {
              onPasswordSet: async (enteredPassword: string) => {
                try {
                  await Authentication.updateAuthPreference({
                    authType: AUTHENTICATION_TYPE.REMEMBER_ME,
                    password: enteredPassword,
                  });
                  // Only set Redux state after operation completes successfully
                  dispatch(setAllowLoginWithRememberMe(value));
                } catch (updateError) {
                  // If update fails, revert the flag to ensure UI matches actual state
                  dispatch(setAllowLoginWithRememberMe(false));
                  Logger.error(
                    updateError as Error,
                    'Failed to update auth preference after password entry',
                  );
                }
              },
            });
            return;
          }
          // Other error - revert the flag to ensure UI matches actual state
          dispatch(setAllowLoginWithRememberMe(false));
          Logger.error(
            error as Error,
            'Failed to update auth preference for remember me',
          );
        }
      } else {
        // Disabling remember me - restore previous authentication method
        try {
          // Get the previous auth type that was stored before enabling remember me
          const previousAuthType = await StorageWrapper.getItem(
            PREVIOUS_AUTH_TYPE_BEFORE_REMEMBER_ME,
          );

          // Determine which auth method to restore
          // Use stored previous auth type if available, otherwise fall back to password
          const authTypeToRestore = previousAuthType
            ? (previousAuthType as AUTHENTICATION_TYPE)
            : AUTHENTICATION_TYPE.PASSWORD;

          await Authentication.updateAuthPreference({
            authType: authTypeToRestore,
          });
          // Clear the stored previous auth type after successful restoration
          await StorageWrapper.removeItem(
            PREVIOUS_AUTH_TYPE_BEFORE_REMEMBER_ME,
          );
          // Only set Redux state after operation completes successfully
          dispatch(setAllowLoginWithRememberMe(value));
        } catch (error) {
          // Check if error is "password required" - navigate to password entry
          const isPasswordRequiredError =
            error instanceof AuthenticationError &&
            error.customErrorMessage ===
              AUTHENTICATION_APP_TRIGGERED_AUTH_NO_CREDENTIALS;

          if (isPasswordRequiredError) {
            // Navigate to password entry
            const previousAuthType = await StorageWrapper.getItem(
              PREVIOUS_AUTH_TYPE_BEFORE_REMEMBER_ME,
            );

            // Use stored previous auth type if available, otherwise fall back to password
            const authTypeToRestore = previousAuthType
              ? (previousAuthType as AUTHENTICATION_TYPE)
              : AUTHENTICATION_TYPE.PASSWORD;

            navigate('EnterPasswordSimple', {
              onPasswordSet: async (enteredPassword: string) => {
                try {
                  await Authentication.updateAuthPreference({
                    authType: authTypeToRestore,
                    password: enteredPassword,
                  });
                  // Clear the stored previous auth type after successful restoration
                  await StorageWrapper.removeItem(
                    PREVIOUS_AUTH_TYPE_BEFORE_REMEMBER_ME,
                  );
                  // Only set Redux state after operation completes successfully
                  dispatch(setAllowLoginWithRememberMe(value));
                } catch (updateError) {
                  // If update fails, revert the flag to ensure UI matches actual state
                  dispatch(setAllowLoginWithRememberMe(true));
                  Logger.error(
                    updateError as Error,
                    'Failed to restore auth preference after password entry',
                  );
                }
              },
            });
            // Don't set Redux state here - wait for callback to complete
            return;
          }
          // Other error - revert the flag to ensure UI matches actual state
          dispatch(setAllowLoginWithRememberMe(true));
          Logger.error(
            error as Error,
            'Failed to restore auth preference when disabling remember me',
          );
        }
      }
    },
    [dispatch, navigate],
  );

  const onValueChanged = useCallback(
    async (enabled: boolean) => {
      // Check if remember me is currently active by checking the actual auth type
      // This ensures we always have the current state
      if (!enabled && allowLoginWithRememberMe) {
        // User is trying to disable remember me - check if it's actually active
        const authType = await Authentication.getType();
        if (authType.currentAuthType === AUTHENTICATION_TYPE.REMEMBER_ME) {
          navigate(...createTurnOffRememberMeModalNavDetails());
          return;
        }
      }
      // Otherwise, proceed with normal toggle
      await toggleRememberMe(enabled);
    },
    [allowLoginWithRememberMe, navigate, toggleRememberMe],
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
