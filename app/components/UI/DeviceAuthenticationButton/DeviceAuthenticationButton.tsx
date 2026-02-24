import React from 'react';
import { LoginViewSelectors } from '../../Views/Login/LoginView.testIds';
import {
  ButtonIcon,
  ButtonIconProps,
} from '@metamask/design-system-react-native';

type DeviceAuthenticationButtonProps = {
  hidden: boolean;
} & ButtonIconProps;

const DeviceAuthenticationButton = ({
  hidden,
  ...props
}: DeviceAuthenticationButtonProps) => {
  if (hidden) return null;

  return (
    <ButtonIcon
      {...props}
      testID={LoginViewSelectors.DEVICE_AUTHENTICATION_ICON}
    />
  );
};

export default DeviceAuthenticationButton;
