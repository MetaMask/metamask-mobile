import React from 'react';
import { Animated, Pressable } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useAnimatedPressable } from '../../../../../component-library/hooks';

export interface HomepageActionButtonProps {
  iconName: IconName;
  label: string;
  onPress: () => void;
  isDisabled?: boolean;
  /** When true, label wraps to 2 lines before tail ellipsis. */
  allowTwoLineLabel?: boolean;
  testID?: string;
}

/**
 * Presentation-only circular action button (icon pill + label).
 * Navigation and analytics live in each `buttons/*Button.tsx` caller.
 * Press feedback: slight scale-down + muted → muted-pressed pill background.
 */
const HomepageActionButton = ({
  iconName,
  label,
  onPress,
  isDisabled = false,
  allowTwoLineLabel = false,
  testID,
}: HomepageActionButtonProps) => {
  const tw = useTailwind();
  const labelNumberOfLines = allowTwoLineLabel ? 2 : 1;
  const { scaleAnim, handlePressIn, handlePressOut } = useAnimatedPressable();

  return (
    <Animated.View
      style={[
        tw.style('min-w-0 flex-1'),
        { transform: [{ scale: scaleAnim }] },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled }}
        disabled={isDisabled}
        onPress={isDisabled ? undefined : onPress}
        onPressIn={isDisabled ? undefined : handlePressIn}
        onPressOut={isDisabled ? undefined : handlePressOut}
        style={tw.style(
          'w-full items-center',
          isDisabled ? 'opacity-50' : 'opacity-100',
        )}
        testID={testID}
      >
        {({ pressed }) => (
          <>
            <Box
              alignItems={BoxAlignItems.Center}
              justifyContent={BoxJustifyContent.Center}
              twClassName={`h-14 w-14 rounded-full border border-muted ${
                pressed && !isDisabled ? 'bg-muted-pressed' : 'bg-muted'
              }`}
            >
              <Icon
                color={IconColor.IconAlternative}
                name={iconName}
                size={IconSize.Lg}
              />
            </Box>
            <Text
              color={TextColor.TextDefault}
              ellipsizeMode="tail"
              fontWeight={FontWeight.Medium}
              numberOfLines={labelNumberOfLines}
              twClassName={
                allowTwoLineLabel
                  ? 'mt-2 min-h-[40px] w-full text-center'
                  : 'mt-2 w-full text-center'
              }
              variant={TextVariant.BodySm}
            >
              {label}
            </Text>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
};

export default HomepageActionButton;
