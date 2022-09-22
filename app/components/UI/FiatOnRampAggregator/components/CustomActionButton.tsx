import React from 'react';
import { PaymentCustomActionButton } from '@consensys/on-ramp-sdk/dist/API';
import { useAssetFromTheme } from '../../../../util/theme';
import StyledButton from '../../StyledButton';

interface Props {
  customActionButton: PaymentCustomActionButton;
}

const CustomActionButton: React.FC<Props & React.ComponentProps<StyledButton>> =
  ({ customActionButton, ...props }: Props) => {
    const themeKey: 'light' | 'dark' = useAssetFromTheme('light', 'dark');
    const { backgroundColor, textColor, value } = customActionButton[themeKey];
    return (
      <StyledButton
        type="confirm"
        style={{ color: textColor }}
        containerStyle={{ backgroundColor }}
        {...props}
      >
        {value}
      </StyledButton>
    );
  };

export default CustomActionButton;
