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
import { SecurityPrivacyViewSelectorsIDs } from '../../../../../../e2e/selectors/Settings/SecurityAndPrivacy/SecurityPrivacyView.selectors';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
} from '@metamask/design-system-react-native';

const LoginOptionsSettings = () => {
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
        setBiometryChoice(!(previouslyDisabled && previouslyDisabled === TRUE));
        setPasscodeChoice(
          !(passcodePreviouslyDisabled && passcodePreviouslyDisabled === TRUE),
        );
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

  const onBiometricsOptionUpdated = useCallback(async (enabled: boolean) => {
    setIsBiometricLoading(true);
    try {
      if (enabled) {
        await Authentication.updateAuthPreference(
          AUTHENTICATION_TYPE.BIOMETRIC,
        );
      } else {
        // Disabling: switch to password (storePassword will handle storage flags)
        await Authentication.updateAuthPreference(AUTHENTICATION_TYPE.PASSWORD);
      }
      setBiometryChoice(enabled);
    } catch (error) {
      // On error, revert the toggle state
      setBiometryChoice(!enabled);
    } finally {
      setIsBiometricLoading(false);
    }
  }, []);
  const onPasscodeOptionUpdated = useCallback(async (enabled: boolean) => {
    setIsPasscodeLoading(true);
    try {
      if (enabled) {
        await Authentication.updateAuthPreference(AUTHENTICATION_TYPE.PASSCODE);
      } else {
        // Disabling: switch to password (storePassword will handle storage flags)
        await Authentication.updateAuthPreference(AUTHENTICATION_TYPE.PASSWORD);
      }
      setPasscodeChoice(enabled);
    } catch (error) {
      // On error, revert the toggle state
      setPasscodeChoice(!enabled);
    } finally {
      setIsPasscodeLoading(false);
    }
  }, []);

  return (
    <Box testID={LOGIN_OPTIONS}>
      {biometryType ? (
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
              disabled={isPasscodeLoading}
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
              disabled={isBiometricLoading}
            />
          )}
        </Box>
      ) : null}
    </Box>
  );
};

export default React.memo(LoginOptionsSettings);
