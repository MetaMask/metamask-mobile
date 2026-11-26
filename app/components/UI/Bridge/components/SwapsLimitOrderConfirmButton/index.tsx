import React from 'react';
import {
  Button,
  ButtonBaseSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { fireImpact, ImpactMoment } from '../../../../../util/haptics';

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
}: Props) => {
  const handlePress = () => {
    fireImpact(ImpactMoment.SecondaryCTA);
    onPress();
  };

  return (
    <Button
      variant={ButtonVariant.Primary}
      size={ButtonBaseSize.Lg}
      isLoading={Boolean(loading)}
      onPress={handlePress}
      isFullWidth
      testID={testID}
      isDisabled={disabled}
    >
      {label}
    </Button>
  );
};
