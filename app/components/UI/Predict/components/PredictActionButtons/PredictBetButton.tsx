import React from 'react';
import { Button, Text } from '@metamask/design-system-react-native';
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
  size,
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

  const getTextColor = (): string => {
    if (hasTeamColor) {
      return 'text-white';
    }
    return variant === 'yes' ? 'text-success-default' : 'text-error-default';
  };

  return (
    <Button
      onPress={onPress}
      isDisabled={disabled}
      testID={testID}
      style={{ backgroundColor: getBackgroundColor() }}
      isFullWidth
      size={size}
    >
      <Text style={tw.style('font-medium', getTextColor())}>
        {label.toUpperCase()} · {price}¢
      </Text>
    </Button>
  );
};

export default PredictBetButton;
