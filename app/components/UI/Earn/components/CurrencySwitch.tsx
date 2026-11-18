import {
  Button,
  ButtonSize,
  ButtonVariant,
  IconName,
} from '@metamask/design-system-react-native';
import React from 'react';

interface CurrencyToggleProps {
  onPress: () => void;
  value: string;
}

const CurrencyToggle = ({ onPress, value }: CurrencyToggleProps) => (
  <Button
    endIconName={IconName.SwapVertical}
    onPress={onPress}
    size={ButtonSize.Md}
    testID="currency-toggle"
    variant={ButtonVariant.Secondary}
  >
    {value}
  </Button>
);

export default CurrencyToggle;
