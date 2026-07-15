import React from 'react';
import { Pressable } from 'react-native';
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

export interface HomepageActionButtonProps {
  iconName: IconName;
  label: string;
  onPress: () => void;
  isDisabled?: boolean;
  testID?: string;
}

/**
 * Presentation-only circular action button (icon pill + label).
 * Navigation and analytics live in each `buttons/*Button.tsx` caller.
 */
const HomepageActionButton = ({
  iconName,
  label,
  onPress,
  isDisabled = false,
  testID,
}: HomepageActionButtonProps) => {
  const tw = useTailwind();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      onPress={isDisabled ? undefined : onPress}
      style={tw.style(
        'w-[79px] items-center',
        isDisabled ? 'opacity-50' : 'opacity-100',
      )}
      testID={testID}
    >
      <Box
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        twClassName="h-14 w-14 rounded-full bg-muted"
      >
        <Icon
          color={IconColor.IconAlternative}
          name={iconName}
          size={IconSize.Lg}
        />
      </Box>
      <Text
        color={TextColor.TextDefault}
        fontWeight={FontWeight.Medium}
        numberOfLines={1}
        twClassName="mt-2 w-full text-center"
        variant={TextVariant.BodySm}
      >
        {label}
      </Text>
    </Pressable>
  );
};

export default HomepageActionButton;
