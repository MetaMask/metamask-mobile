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
        'flex-1 items-center justify-center self-stretch rounded-full py-2',
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
