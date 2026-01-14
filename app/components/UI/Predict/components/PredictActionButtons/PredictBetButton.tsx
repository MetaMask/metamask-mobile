import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import {
  Text,
  TextVariant,
  TextColor,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useTheme } from '../../../../../util/theme';
import { PredictBetButtonProps } from './PredictActionButtons.types';

const PRESSED_OPACITY = 0.8;

const HEIGHT_BY_SIZE = {
  sm: 32,
  md: 40,
  lg: 48,
};

const TEXT_VARIANT_BY_SIZE = {
  sm: TextVariant.BodySm,
  md: TextVariant.BodyMd,
  lg: TextVariant.BodyMd,
};

const styles = StyleSheet.create({
  button: {
    flex: 1,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

const PredictBetButton: React.FC<PredictBetButtonProps> = ({
  label,
  price,
  onPress,
  variant,
  teamColor,
  size = 'md',
  disabled = false,
  testID,
}) => {
  const tw = useTailwind();
  const { colors } = useTheme();

  const hasTeamColor = Boolean(teamColor);

  const getBackgroundColor = () => {
    if (hasTeamColor) {
      return teamColor;
    }
    return variant === 'yes' ? colors.success.muted : colors.error.muted;
  };

  const getTextColor = (): TextColor => {
    if (hasTeamColor) {
      return TextColor.TextDefault;
    }
    return variant === 'yes'
      ? TextColor.SuccessDefault
      : TextColor.ErrorDefault;
  };

  const buttonHeight = HEIGHT_BY_SIZE[size];
  const textVariant = TEXT_VARIANT_BY_SIZE[size];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      testID={testID}
      style={({ pressed }) => [
        styles.button,
        {
          height: buttonHeight,
          backgroundColor: getBackgroundColor(),
          opacity: pressed ? PRESSED_OPACITY : disabled ? 0.5 : 1,
        },
      ]}
    >
      <Text
        variant={textVariant}
        color={getTextColor()}
        style={tw.style('font-medium')}
      >
        {label.toUpperCase()} · {price}¢
      </Text>
    </Pressable>
  );
};

export default PredictBetButton;
