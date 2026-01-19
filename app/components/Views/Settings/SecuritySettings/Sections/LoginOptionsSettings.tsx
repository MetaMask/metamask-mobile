import React, { useState, useEffect, useCallback } from 'react';
import { SecurityOptionToggle } from '../../../../UI/SecurityOptionToggle';
import { strings } from '../../../../../../locales/i18n';
import { BIOMETRY_TYPE } from 'react-native-keychain';
import { Authentication } from '../../../../../core';
import AUTHENTICATION_TYPE from '../../../../../constants/userProperties';
import Device from '../../../../../util/device';
import { useTheme } from '../../../../../util/theme';
import StorageWrapper from '../../../../../store/storage-wrapper';
import {
  BIOMETRY_CHOICE_DISABLED,
  PASSCODE_DISABLED,
  TRUE,
} from '../../../../../constants/storage';
import { ActivityIndicator } from 'react-native';
import { LOGIN_OPTIONS } from '../SecuritySettings.constants';
import createStyles from '../SecuritySettings.styles';
import { SecurityPrivacyViewSelectorsIDs } from '../SecurityPrivacyView.testIds';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
} from '@metamask/design-system-react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Logger from '../../../../../util/Logger';
import AuthenticationError from '../../../../../core/Authentication/AuthenticationError';
import { AUTHENTICATION_APP_TRIGGERED_AUTH_NO_CREDENTIALS } from '../../../../../constants/error';
import { RootState } from '../../../../../reducers';

const LoginOptionsSettings = () => {
  const navigation = useNavigation();
  const allowLoginWithRememberMe = useSelector(
    (state: RootState) => state.security?.allowLoginWithRememberMe,
  );
  const [biometryType, setBiometryType] = useState<
    BIOMETRY_TYPE | AUTHENTICATION_TYPE.BIOMETRIC | undefined
  >(undefined);
  const [biometryChoice, setBiometryChoice] = useState<boolean>(false);
  const [passcodeChoice, setPasscodeChoice] = useState<boolean>(false);
  const [isBiometricLoading, setIsBiometricLoading] = useState<boolean>(false);
  const [isPasscodeLoading, setIsPasscodeLoading] = useState<boolean>(false);
  const { colors } = useTheme();
  const styles = createStyles(colors);

  useEffect(() => {
    const getOptions = async () => {
      const authType = await Authentication.getType();
      const previouslyDisabled = await StorageWrapper.getItem(
        BIOMETRY_CHOICE_DISABLED,
      );
      const passcodePreviouslyDisabled =
        await StorageWrapper.getItem(PASSCODE_DISABLED);
      if (
        authType.currentAuthType === AUTHENTICATION_TYPE.BIOMETRIC ||
        authType.currentAuthType === AUTHENTICATION_TYPE.PASSCODE
      ) {
        const stateValue = Device.isAndroid()
          ? AUTHENTICATION_TYPE.BIOMETRIC
          : authType.availableBiometryType;
        setBiometryType(stateValue);

        if (authType.currentAuthType === AUTHENTICATION_TYPE.BIOMETRIC) {
          // Biometrics are enabled - passcode must be disabled (mutually exclusive)
          setBiometryChoice(
            !(previouslyDisabled && previouslyDisabled === TRUE),
          );
          setPasscodeChoice(false);
        } else {
          // Passcode is enabled - biometrics must be disabled (mutually exclusive)
          setBiometryChoice(false);
          setPasscodeChoice(
            !(
              passcodePreviouslyDisabled && passcodePreviouslyDisabled === TRUE
            ),
          );
        }
      } else {
        const stateValue =
          Device.isAndroid() && authType.availableBiometryType
            ? AUTHENTICATION_TYPE.BIOMETRIC
            : authType.availableBiometryType;
        setBiometryType(stateValue);
      }
    };
    getOptions();
  }, []);

  const onBiometricsOptionUpdated = useCallback(
    async (enabled: boolean) => {
      // Prevent toggling biometrics when remember me is enabled
      if (allowLoginWithRememberMe) {
        return;
      }

      setIsBiometricLoading(true);
      try {
        const authType = enabled
          ? AUTHENTICATION_TYPE.BIOMETRIC
          : AUTHENTICATION_TYPE.PASSWORD;

        // Enabling biometrics is handled by the catch condition  "isPasswordRequiredError"
        await Authentication.updateAuthPreference({ authType });

        // Only update UI if operation completed successfully
        setBiometryChoice(enabled);
        // Biometrics and passcode are mutually exclusive - enabling one disables the other
        // Disabling biometrics switches to PASSWORD which disables both
        setPasscodeChoice(false);
      } catch (error) {
        // Check if error is "password required" - navigate to password entry
        const isPasswordRequiredError =
          error instanceof AuthenticationError &&
          error.customErrorMessage ===
            AUTHENTICATION_APP_TRIGGERED_AUTH_NO_CREDENTIALS;

        if (isPasswordRequiredError) {
          // Navigate to password entry
          const authType = enabled
            ? AUTHENTICATION_TYPE.BIOMETRIC
            : AUTHENTICATION_TYPE.PASSWORD;

          navigation.navigate('EnterPasswordSimple', {
            onPasswordSet: async (enteredPassword: string) => {
              // Set loading back to true when callback is invoked
              setIsBiometricLoading(true);
              try {
                await Authentication.updateAuthPreference({
                  authType,
                  password: enteredPassword,
                });

                // Update UI state after successful password entry and update
                setBiometryChoice(enabled);
                // Biometrics and passcode are mutually exclusive - enabling one disables the other
                // Disabling biometrics switches to PASSWORD which disables both
                setPasscodeChoice(false);

                // Re-fetch to ensure UI matches actual state
                const currentAuthType = await Authentication.getType();
                const previouslyDisabled = await StorageWrapper.getItem(
                  BIOMETRY_CHOICE_DISABLED,
                );
                setBiometryChoice(
                  currentAuthType.currentAuthType ===
                    AUTHENTICATION_TYPE.BIOMETRIC &&
                    !(previouslyDisabled && previouslyDisabled === TRUE),
                );
              } catch (updateError) {
                // On error, revert UI state
                setBiometryChoice(!enabled);
                Logger.error(
                  updateError as Error,
                  'Failed to update auth preference after password entry',
                );
              } finally {
                // Clear loading after callback completes
                setIsBiometricLoading(false);
              }
            },
          });
          // Don't update UI state here - wait for callback
          return;
        }
        // Other error - revert toggle state
        Logger.error(
          error as Error,
          'Failed to update auth preference after password entry',
        );
        setBiometryChoice(!enabled);
      } finally {
        setIsBiometricLoading(false);
      }
    },
    [navigation, allowLoginWithRememberMe],
  );
  const onPasscodeOptionUpdated = useCallback(
    async (enabled: boolean) => {
      // Prevent toggling passcode when remember me is enabled
      if (allowLoginWithRememberMe) {
        return;
      }

      setIsPasscodeLoading(true);
      try {
        const authType = enabled
          ? AUTHENTICATION_TYPE.PASSCODE
          : AUTHENTICATION_TYPE.PASSWORD;

        // Enabling passcode is handled by the catch condition  "isPasswordRequiredError"
        await Authentication.updateAuthPreference({ authType });

        // Only update UI if operation completed successfully
        setPasscodeChoice(enabled);
        // Biometrics and passcode are mutually exclusive - enabling one disables the other
        // Disabling passcode switches to PASSWORD which disables both
        setBiometryChoice(false);
      } catch (error) {
        // Check if error is "password required" - navigate to password entry
        const isPasswordRequiredError =
          error instanceof AuthenticationError &&
          error.customErrorMessage ===
            AUTHENTICATION_APP_TRIGGERED_AUTH_NO_CREDENTIALS;

        if (isPasswordRequiredError) {
          // Navigate to password entry
          const authType = enabled
            ? AUTHENTICATION_TYPE.PASSCODE
            : AUTHENTICATION_TYPE.PASSWORD;

          navigation.navigate('EnterPasswordSimple', {
            onPasswordSet: async (enteredPassword: string) => {
              // Set loading back to true when callback is invoked
              setIsPasscodeLoading(true);
              try {
                await Authentication.updateAuthPreference({
                  authType,
                  password: enteredPassword,
                });

                // Update UI state after successful password entry and update
                setPasscodeChoice(enabled);
                // Biometrics and passcode are mutually exclusive - enabling one disables the other
                // Disabling passcode switches to PASSWORD which disables both
                setBiometryChoice(false);

                // Re-fetch to ensure UI matches actual state
                const currentAuthType = await Authentication.getType();
                const passcodePreviouslyDisabled =
                  await StorageWrapper.getItem(PASSCODE_DISABLED);
                setPasscodeChoice(
                  currentAuthType.currentAuthType ===
                    AUTHENTICATION_TYPE.PASSCODE &&
                    !(
                      passcodePreviouslyDisabled &&
                      passcodePreviouslyDisabled === TRUE
                    ),
                );
              } catch (updateError) {
                // On error, revert UI state
                setPasscodeChoice(!enabled);
                Logger.error(
                  updateError as Error,
                  'Failed to update auth preference after password entry',
                );
              } finally {
                // Clear loading after callback completes
                setIsPasscodeLoading(false);
              }
            },
          });
          // Don't update UI state here - wait for callback
          return;
        }
        // Other error - revert toggle state
        Logger.error(
          error as Error,
          'Failed to update auth preference after password entry',
        );
        setPasscodeChoice(!enabled);
      } finally {
        setIsPasscodeLoading(false);
      }
    },
    [navigation, allowLoginWithRememberMe],
  );

  return (
    <Box testID={LOGIN_OPTIONS}>
      {biometryType && !passcodeChoice ? (
        <Box style={styles.setting}>
          {isBiometricLoading ? (
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName="justify-center py-4"
            >
              <ActivityIndicator size="small" color={colors.primary.default} />
            </Box>
          ) : (
            <SecurityOptionToggle
              title={strings(`biometrics.enable_${biometryType.toLowerCase()}`)}
              value={biometryChoice}
              onOptionUpdated={onBiometricsOptionUpdated}
              testId={SecurityPrivacyViewSelectorsIDs.BIOMETRICS_TOGGLE}
              disabled={allowLoginWithRememberMe || isPasscodeLoading}
            />
          )}
        </Box>
      ) : null}
      {biometryType && !biometryChoice ? (
        <Box style={styles.setting}>
          {isPasscodeLoading ? (
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName="justify-center py-4"
            >
              <ActivityIndicator size="small" color={colors.primary.default} />
            </Box>
          ) : (
            <SecurityOptionToggle
              title={
                Device.isIos()
                  ? strings(`biometrics.enable_device_passcode_ios`)
                  : strings(`biometrics.enable_device_passcode_android`)
              }
              value={passcodeChoice}
              onOptionUpdated={onPasscodeOptionUpdated}
              testId={SecurityPrivacyViewSelectorsIDs.DEVICE_PASSCODE_TOGGLE}
              disabled={allowLoginWithRememberMe || isBiometricLoading}
            />
          )}
        </Box>
      ) : null}
    </Box>
  );
};

export default React.memo(LoginOptionsSettings);
