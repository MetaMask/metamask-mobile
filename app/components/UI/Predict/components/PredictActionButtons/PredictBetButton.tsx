import React from 'react';
import {
  Button,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
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
  const isInline = layout === 'inline' || layout === 'inlineNoSeparator';
  const inlineLabel =
    layout === 'inlineNoSeparator'
      ? `${label.toUpperCase()} ${price}¢`
      : `${label.toUpperCase()} · ${price}¢`;

  return (
    <Button
      onPress={onPress}
      isDisabled={disabled}
      testID={testID}
      style={{ backgroundColor: getBackgroundColor() }}
      twClassName={isInline ? 'px-1' : undefined}
      contentWrapperProps={isInline ? { twClassName: 'w-full' } : undefined}
      isFullWidth
      size={size}
    >
      {isInline ? (
        <Text
          variant={
            layout === 'inlineNoSeparator' ? TextVariant.BodySm : undefined
          }
          style={tw.style('flex-1', textStyle)}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
          ellipsizeMode="clip"
        >
          {inlineLabel}
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
