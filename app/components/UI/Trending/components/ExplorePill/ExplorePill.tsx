import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
  FontWeight,
  type ButtonProps,
} from '@metamask/design-system-react-native';

export interface ExplorePillProps
  extends Pick<ButtonProps, 'accessibilityState' | 'twClassName'> {
  onPress: () => void;
  testID: string;
  /** Icon or logo on the left (e.g. token logo, with or without a network badge wrapper). */
  leading: React.ReactNode;
  title: string;
  changeLabel?: string;
  changeTextColor?: TextColor;
  /** Accessory after the label (e.g. a check on the active filter). */
  trailing?: React.ReactNode;
}

/**
 * Shared horizontal “pill” shell for Explore sections (e.g. Crypto Movers, Perps).
 * Visual layout only; callers supply `leading` and press behavior.
 */
const ExplorePill: React.FC<ExplorePillProps> = ({
  onPress,
  testID,
  leading,
  title,
  changeLabel,
  changeTextColor = TextColor.TextAlternative,
  trailing,
  ...props
}) => {
  const showChange = changeLabel !== undefined && changeLabel.length > 0;

  return (
    <Button
      onPress={onPress}
      testID={testID}
      size={ButtonSize.Md}
      variant={ButtonVariant.Secondary}
      startAccessory={leading}
      endAccessory={trailing}
      {...props}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={2}
      >
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextDefault}
          numberOfLines={1}
        >
          {title}
        </Text>
        {showChange ? (
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            color={changeTextColor}
            numberOfLines={1}
          >
            {changeLabel}
          </Text>
        ) : null}
      </Box>
    </Button>
  );
};

export default React.memo(ExplorePill);
