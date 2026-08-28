import React from 'react';
import type { LayoutChangeEvent } from 'react-native';
import {
  ButtonAnimated,
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

export interface TabBarFloatingItemProps {
  iconName: IconName;
  label: string;
  isActive: boolean;
  onPress: () => void;
  testID?: string;
  /** Reports the slot's position so the shared highlight can slide onto it. */
  onLayout?: (event: LayoutChangeEvent) => void;
}

const TabBarFloatingItem = ({
  iconName,
  label,
  isActive,
  onPress,
  testID,
  onLayout,
}: TabBarFloatingItemProps) => {
  const tw = useTailwind();

  return (
    <ButtonAnimated
      onPress={onPress}
      // The active background is drawn by the shared highlight in
      // `TabBarFloating` so it can slide between slots instead of snapping.
      style={tw.style(
        'flex-1 items-center justify-center self-stretch bg-transparent py-2',
      )}
      onLayout={onLayout}
      testID={testID}
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      accessible
    >
      <Icon
        name={iconName}
        size={IconSize.Lg}
        color={isActive ? IconColor.IconDefault : IconColor.IconAlternative}
      />
      <Text
        variant={TextVariant.BodyXs}
        fontWeight={isActive ? FontWeight.Medium : FontWeight.Regular}
        color={isActive ? TextColor.TextDefault : TextColor.TextAlternative}
        numberOfLines={1}
        twClassName="mt-0 text-center"
      >
        {label}
      </Text>
    </ButtonAnimated>
  );
};

export default TabBarFloatingItem;
