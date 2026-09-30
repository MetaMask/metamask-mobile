import React from 'react';
import { ButtonBase, ButtonSize } from '@metamask/design-system-react-native';

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

const TEXT_CLASS = 'text-success-inverse';

/**
 * Main lime CTA (success-default fill, like QuickBuyConfirmButton).
 * DS ButtonHero is not used: its locked light primary is blue.
 */
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
}: CtaButtonProps) => {
  const isInactive = isDisabled || isLoading;

  return (
    <ButtonBase
      size={size}
      isFullWidth
      isLoading={isLoading}
      loadingText={loadingText}
      isDisabled={isDisabled}
      onPress={onPress}
      startAccessory={startAccessory}
      endAccessory={endAccessory}
      testID={testID}
      twClassName={(pressed) =>
        `bg-success-default${pressed && !isInactive ? ' opacity-90' : ''}`
      }
      textClassName={() => TEXT_CLASS}
    >
      {label}
    </ButtonBase>
  );
};

export default CtaButton;
