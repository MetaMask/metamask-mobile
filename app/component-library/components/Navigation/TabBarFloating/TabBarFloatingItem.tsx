import React from 'react';
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

import {
  TAB_BAR_FLOATING_LABEL_FONT_SIZE,
  TAB_BAR_FLOATING_LABEL_LINE_HEIGHT,
} from './TabBarFloating.constants';

export interface TabBarFloatingItemProps {
  iconName: IconName;
  label: string;
  isActive: boolean;
  onPress: () => void;
  testID?: string;
}

const TabBarFloatingItem = ({
  iconName,
  label,
  isActive,
  onPress,
  testID,
}: TabBarFloatingItemProps) => {
  const tw = useTailwind();

  return (
    <ButtonAnimated
      onPress={onPress}
      style={tw.style(
        'flex-1 items-center justify-center self-stretch rounded-full py-1',
        isActive ? 'bg-muted' : 'bg-transparent',
      )}
      testID={testID}
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      accessible
    >
      <Icon
        name={iconName}
        size={IconSize.Md}
        color={isActive ? IconColor.IconDefault : IconColor.IconAlternative}
      />
      <Text
        variant={TextVariant.BodyXs}
        fontWeight={isActive ? FontWeight.Medium : FontWeight.Regular}
        color={isActive ? TextColor.TextDefault : TextColor.TextAlternative}
        numberOfLines={1}
        twClassName="mt-1 text-center"
        // The variant's own 12/20 ramp is too tall for the bar; only the size
        // is overridden so weight and colour still come from the design system.
        style={{
          fontSize: TAB_BAR_FLOATING_LABEL_FONT_SIZE,
          lineHeight: TAB_BAR_FLOATING_LABEL_LINE_HEIGHT,
        }}
      >
        {label}
      </Text>
    </ButtonAnimated>
  );
};

export default TabBarFloatingItem;
