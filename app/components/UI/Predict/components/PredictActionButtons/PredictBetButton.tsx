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
  layout = 'stacked',
}) => {
  const tw = useTailwind();
  const { colors } = useTheme();

  const hasTeamColor = Boolean(teamColor);

  const getBackgroundColor = () => {
    if (hasTeamColor) {
      return teamColor;
    }
    if (variant === 'draw') {
      return colors.background.muted;
    }
    return variant === 'yes' ? colors.success.muted : colors.error.muted;
  };

  const getTextColor = (): string => {
    if (hasTeamColor) {
      return 'text-white';
    }
    if (variant === 'draw') {
      return 'text-default';
    }
    return variant === 'yes' ? 'text-success-default' : 'text-error-default';
  };

  const textStyle = tw.style('font-medium text-center', getTextColor());

  return (
    <Button
      onPress={onPress}
      isDisabled={disabled}
      testID={testID}
      style={{ backgroundColor: getBackgroundColor() }}
      isFullWidth
      size={size}
    >
      {layout === 'inline' ? (
        <Text style={textStyle} numberOfLines={1}>
          {label.toUpperCase()} · {price}¢
        </Text>
      ) : (
        <>
          <Text style={textStyle} numberOfLines={1}>
            {label.toUpperCase()}
          </Text>
          <Text style={textStyle}>{price}¢</Text>
        </>
      )}
    </Button>
  );
};

export default PredictBetButton;
