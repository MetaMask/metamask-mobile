import React from 'react';
import {
  Button,
  ButtonBaseSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';

interface Props {
  loading?: boolean;
  onPress: () => void;
  testID?: string;
  disabled?: boolean;
  label: string;
}

export const SwapsLimitOrderConfirmButton = ({
  loading,
  onPress,
  testID,
  disabled,
  label,
}: Props) => (
  <Button
    variant={ButtonVariant.Primary}
    size={ButtonBaseSize.Lg}
    isLoading={loading}
    onPress={onPress}
    isFullWidth
    testID={testID}
    isDisabled={disabled}
  >
    {label}
  </Button>
);
