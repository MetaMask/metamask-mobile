import React, { useState, useEffect } from 'react';
import { SecurityOptionToggle } from '../../../../UI/SecurityOptionToggle';
import { strings } from '../../../../../../locales/i18n';
import { BIOMETRY_TYPE } from 'react-native-keychain';
import { Authentication } from '../../../../../core';
import AUTHENTICATION_TYPE from '../../../../../constants/userProperties';
import Device from '../../../../../util/device';

interface BiometricOptionSectionProps {
  onOptionUpdated: (enabled: boolean) => void;
}

const BiometricOptionSection = ({
  onOptionUpdated,
}: BiometricOptionSectionProps) => {
  const [biometryType, setBiometryType] = useState<
    BIOMETRY_TYPE | AUTHENTICATION_TYPE.BIOMETRIC | undefined
  >(undefined);

  useEffect(() => {
    const getOptions = async () => {
      const authType = await Authentication.getType();
      if (
        authType.type === AUTHENTICATION_TYPE.BIOMETRIC ||
        authType.type === AUTHENTICATION_TYPE.PASSCODE
      ) {
        const stateValue = Device.isAndroid()
          ? AUTHENTICATION_TYPE.BIOMETRIC
          : authType.biometryType;
        setBiometryType(stateValue);
      } else {
        const stateValue =
          Device.isAndroid() && authType.biometryType
            ? AUTHENTICATION_TYPE.BIOMETRIC
            : authType.biometryType;
        setBiometryType(stateValue);
      }
    };
    getOptions();
  }, []);

  return biometryType ? (
    <SecurityOptionToggle
      title={strings(`biometrics.enable_${biometryType.toLowerCase()}`)}
      description={strings(`remember_me.enable_remember_me_description`)}
      value
      onOptionUpdated={(value) => onOptionUpdated(value)}
      testId={'biometrics-option'}
    />
  ) : null;
};

export default React.memo(BiometricOptionSection);
