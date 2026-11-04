import React from 'react';
import {
  BadgeStatus,
  BadgeStatusStatus,
  BadgeWrapper,
  BadgeWrapperPosition,
  BadgeWrapperPositionAnchorShape,
  ButtonAnimated,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import {
  TAB_BAR_FLOATING_ICON_DIMENSION,
  TAB_BAR_FLOATING_ICON_SIZE,
  TAB_BAR_FLOATING_LABEL_FONT_SIZE,
  TAB_BAR_FLOATING_LABEL_LINE_HEIGHT,
} from './TabBarFloating.constants';

export interface TabBarFloatingItemProps {
  iconName: IconName;
  label: string;
  isActive: boolean;
  onPress: () => void;
  testID?: string;
  showNewBadge?: boolean;
  newBadgeTestID?: string;
  /**
   * Draw inactive icons and labels at full contrast. Contextual bars use this
   * so every item stays white, matching the selected item and the Home button.
   */
  fullContrast?: boolean;
}

const TabBarFloatingItem = ({
  iconName,
  label,
  isActive,
  onPress,
  testID,
  showNewBadge = false,
  newBadgeTestID,
  fullContrast = false,
}: TabBarFloatingItemProps) => {
  const tw = useTailwind();
  const iconColor =
    isActive || fullContrast
      ? IconColor.IconDefault
      : IconColor.IconAlternative;
  const labelColor =
    isActive || fullContrast
      ? TextColor.TextDefault
      : TextColor.TextAlternative;

  return (
    <ButtonAnimated
      onPress={onPress}
      style={tw.style(
        'flex-1 items-center justify-center self-stretch rounded-full py-1',
        // Solid platter, not the translucent muted wash. The wash lightens
        // over a black page and darkens over a bright one, so the same
        // selection read as two different capsules.
        isActive ? 'bg-alternative' : 'bg-transparent',
      )}
      testID={testID}
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      accessible
    >
      <BadgeWrapper
        twClassName="self-center"
        position={BadgeWrapperPosition.TopRight}
        positionAnchorShape={BadgeWrapperPositionAnchorShape.Circular}
        badge={
          showNewBadge ? (
            <BadgeStatus
              status={BadgeStatusStatus.Active}
              twClassName="translate-x-1"
              testID={newBadgeTestID}
            />
          ) : null
        }
      >
        <Icon
          name={iconName}
          size={TAB_BAR_FLOATING_ICON_SIZE}
          color={iconColor}
          style={{
            width: TAB_BAR_FLOATING_ICON_DIMENSION,
            height: TAB_BAR_FLOATING_ICON_DIMENSION,
          }}
        />
      </BadgeWrapper>
      <Text
        variant={TextVariant.BodyXs}
        fontWeight={isActive ? FontWeight.Medium : FontWeight.Regular}
        color={labelColor}
        numberOfLines={1}
        twClassName="mt-0.5 text-center"
        // The variant's own 12/20 ramp is too tall for the bar; only the size
        // is overridden so weight and colour still come from the design system.
        style={{
          fontSize: TAB_BAR_FLOATING_LABEL_FONT_SIZE,
          lineHeight: TAB_BAR_FLOATING_LABEL_LINE_HEIGHT,
        }}
        maxFontSizeMultiplier={1}
      >
        {label}
      </Text>
    </ButtonAnimated>
  );
};

export default TabBarFloatingItem;
