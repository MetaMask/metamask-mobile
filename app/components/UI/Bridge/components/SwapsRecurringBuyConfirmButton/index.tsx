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

export const SwapsRecurringBuyConfirmButton = ({
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
      isLoading={loading}
      onPress={handlePress}
      isFullWidth
      testID={testID}
      isDisabled={Boolean(disabled || loading)}
    >
      {label}
    </Button>
  );
};
