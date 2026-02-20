import React from 'react';
import { TouchableOpacity, TouchableOpacityProps } from 'react-native';
import styles from './styles';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../component-library/components/Icons/Icon';
import { LoginViewSelectors } from '../../Views/Login/LoginView.testIds';

type DeviceAuthenticationButtonProps = {
  hidden: boolean;
} & TouchableOpacityProps;

const DeviceAuthenticationButton = ({
  hidden,
  ...props
}: DeviceAuthenticationButtonProps) => {
  if (hidden) return null;

  return (
    <TouchableOpacity
      testID={LoginViewSelectors.BIOMETRY_BUTTON}
      hitSlop={styles.hitSlop}
      {...props}
    >
      <Icon
        color={IconColor.Default}
        style={styles.fixCenterIcon}
        size={IconSize.Lg}
        name={IconName.SecurityKey}
        testID={LoginViewSelectors.DEVICE_AUTHENTICATION_ICON}
      />
    </TouchableOpacity>
  );
};

export default DeviceAuthenticationButton;
