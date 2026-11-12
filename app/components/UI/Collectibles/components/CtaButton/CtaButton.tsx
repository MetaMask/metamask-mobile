import React from 'react';
import {
  Button,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';

export interface CtaButtonProps {
  label: string;
  onPress: () => void;
  isDisabled?: boolean;
  isLoading?: boolean;
  loadingText?: string;
  startAccessory?: React.ReactNode;
  endAccessory?: React.ReactNode;
  size?: ButtonSize;
  testID?: string;
}

/** Use the same primary action and theme tokens as the Replit design system. */
const CtaButton = ({
  label,
  onPress,
  isDisabled = false,
  isLoading = false,
  loadingText,
  startAccessory,
  endAccessory,
  size = ButtonSize.Lg,
  testID,
}: CtaButtonProps) => (
  <Button
    variant={ButtonVariant.Primary}
    size={size}
    isFullWidth
    isLoading={isLoading}
    loadingText={loadingText}
    isDisabled={isDisabled}
    onPress={onPress}
    startAccessory={startAccessory}
    endAccessory={endAccessory}
    testID={testID}
  >
    {label}
  </Button>
);

export default CtaButton;
