import React from 'react';
import { Button, Text, TextColor } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useTheme } from '../../../../../util/theme';
import { PredictBetButtonProps } from './PredictActionButtons.types';

const PredictBetButton: React.FC<PredictBetButtonProps> = ({
  label,
  price,
  onPress,
  variant,
  teamColor,
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

  return (
    <Button
      onPress={onPress}
      isDisabled={disabled}
      testID={testID}
      style={{ backgroundColor: getBackgroundColor() }}
      isFullWidth
    >
      <Text color={getTextColor()} style={tw.style('font-medium')}>
        {label.toUpperCase()} · {price}¢
      </Text>
    </Button>
  );
};

export default PredictBetButton;
