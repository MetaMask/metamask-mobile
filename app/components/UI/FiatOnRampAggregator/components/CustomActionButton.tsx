import React from 'react';
import { PaymentCustomActionButton } from '@consensys/on-ramp-sdk/dist/API';
import { useAssetFromTheme } from '../../../../util/theme';
import StyledButton from '../../StyledButton';
import { ActivityIndicator, StyleSheet } from 'react-native';
import RemoteImage from '../../../Base/RemoteImage';

interface Props {
  customActionButton: PaymentCustomActionButton;
  isLoading?: boolean;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  buttonImage: {
    marginHorizontal: 2,
  },
});

const renderImageIfURL = (value: string) => {
  // TODO: transform this to object with dimensions
  if (value.startsWith('https://')) {
    return (
      <RemoteImage
        key={value}
        source={{ uri: value }}
        // eslint-disable-next-line react-native/no-inline-styles
        style={[styles.buttonImage, { width: 57.3, height: 17 }]}
      />
    );
  }

  return value;
};

const CustomActionButton: React.FC<Props & React.ComponentProps<StyledButton>> =
  ({ customActionButton, isLoading, ...props }: Props) => {
    const themeKey: 'light' | 'dark' = useAssetFromTheme('light', 'dark');
    const { backgroundColor, textColor, value } = customActionButton[themeKey];
    return (
      <StyledButton
        type="confirm"
        style={{ color: textColor }}
        containerStyle={[
          styles.container,
          {
            backgroundColor,
          },
        ]}
        {...props}
      >
        {isLoading ? (
          <ActivityIndicator size={'small'} />
        ) : (
          value.map(renderImageIfURL)
        )}
      </StyledButton>
    );
  };

export default CustomActionButton;
