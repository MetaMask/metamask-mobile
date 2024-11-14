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
import { View } from 'react-native';
import { LOGIN_OPTIONS } from '../SecuritySettings.constants';
import createStyles from '../SecuritySettings.styles';
import { SecurityPrivacyViewSelectorsIDs } from '../../../../../../e2e/selectors/Settings/SecurityAndPrivacy/SecurityPrivacyView.selectors';

interface BiometricOptionSectionProps {
  onSignWithBiometricsOptionUpdated: (enabled: boolean) => Promise<void>;
  onSignWithPasscodeOptionUpdated: (enabled: boolean) => Promise<void>;
}

const LoginOptionsSettings = ({
  onSignWithBiometricsOptionUpdated,
  onSignWithPasscodeOptionUpdated,
}: BiometricOptionSectionProps) => {
  const [biometryType, setBiometryType] = useState<
    BIOMETRY_TYPE | AUTHENTICATION_TYPE.BIOMETRIC | undefined
  >(undefined);
  const [biometryChoice, setBiometryChoice] = useState<boolean>(false);
  const [passcodeChoice, setPasscodeChoice] = useState<boolean>(false);
  const { colors } = useTheme();
  const styles = createStyles(colors);

  useEffect(() => {
    const getOptions = async () => {
      const authType = await Authentication.getType();
      const previouslyDisabled = await StorageWrapper.getItem(
        BIOMETRY_CHOICE_DISABLED,
      );
      const passcodePreviouslyDisabled = await StorageWrapper.getItem(
        PASSCODE_DISABLED,
      );
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

  const onBiometricsOptionUpdated = useCallback(
    async (enabled: boolean) => {
      await onSignWithBiometricsOptionUpdated(enabled);
      setBiometryChoice(enabled);
    },
    [onSignWithBiometricsOptionUpdated],
  );
  const onPasscodeOptionUpdated = useCallback(
    async (enabled: boolean) => {
      await onSignWithPasscodeOptionUpdated(enabled);
      setPasscodeChoice(enabled);
    },
    [onSignWithPasscodeOptionUpdated],
  );

  return (
    <View testID={LOGIN_OPTIONS}>
      {biometryType ? (
        <View style={styles.setting}>
          <SecurityOptionToggle
            title={strings(`biometrics.enable_${biometryType.toLowerCase()}`)}
            value={biometryChoice}
            onOptionUpdated={onBiometricsOptionUpdated}
            testId={SecurityPrivacyViewSelectorsIDs.BIOMETRICS_TOGGLE}
          />
        </View>
      ) : null}
      {biometryType && !biometryChoice ? (
        <View style={styles.setting}>
          <SecurityOptionToggle
            title={
              Device.isIos()
                ? strings(`biometrics.enable_device_passcode_ios`)
                : strings(`biometrics.enable_device_passcode_android`)
            }
            value={passcodeChoice}
            onOptionUpdated={onPasscodeOptionUpdated}
            testId={SecurityPrivacyViewSelectorsIDs.DEVICE_PASSCODE_TOGGLE}
          />
        </View>
      ) : null}
    </View>
  );
};

export default React.memo(LoginOptionsSettings);
