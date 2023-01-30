import React from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import {
  PaymentCustomActionButton,
  TextOrImage,
} from '@consensys/on-ramp-sdk/dist/API';
import { useAssetFromTheme } from '../../../../util/theme';
import StyledButton from '../../StyledButton';
import RemoteImage from '../../../Base/RemoteImage';
import CustomText from '../../../Base/Text';
// TODO: Convert into typescript and correctly type optionals
const Text = CustomText as any;

interface Props {
  customActionButton: PaymentCustomActionButton;
  isLoading?: boolean;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonImage: {
    marginHorizontal: 2,
  },
});

const renderButtonValue = (value: TextOrImage, textColor: string) => {
  if (value.text) {
    return (
      <Text bold key={value.text} style={{ color: textColor }}>
        {value.text}
      </Text>
    );
  }

  if (value.image) {
    const { url, width, height } = value.image;
    return (
      <RemoteImage
        key={url}
        source={{ uri: url }}
        style={[styles.buttonImage, { width, height }]}
      />
    );
  }
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
          <>
            {value.map((textOrImage) =>
              renderButtonValue(textOrImage, textColor),
            )}
          </>
        )}
      </StyledButton>
    );
  };

export default CustomActionButton;
