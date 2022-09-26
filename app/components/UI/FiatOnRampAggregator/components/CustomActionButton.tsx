import React from 'react';
import { PaymentCustomActionButton } from '@consensys/on-ramp-sdk/dist/API';
import { useAssetFromTheme } from '../../../../util/theme';
import StyledButton from '../../StyledButton';
import { ActivityIndicator } from 'react-native';

interface Props {
  customActionButton: PaymentCustomActionButton;
  isLoading?: boolean;
}

const CustomActionButton: React.FC<Props & React.ComponentProps<StyledButton>> =
  ({ customActionButton, isLoading, ...props }: Props) => {
    const themeKey: 'light' | 'dark' = useAssetFromTheme('light', 'dark');
    const { backgroundColor, textColor, value } = customActionButton[themeKey];
    return (
      <StyledButton
        type="confirm"
        style={{ color: textColor }}
        containerStyle={{ backgroundColor }}
        {...props}
      >
        {isLoading ? <ActivityIndicator size={'small'} /> : value}
      </StyledButton>
    );
  };

export default CustomActionButton;
