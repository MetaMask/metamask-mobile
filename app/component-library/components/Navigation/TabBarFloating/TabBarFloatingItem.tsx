import React from 'react';
import type { LayoutChangeEvent } from 'react-native';
import Animated, {
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
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

import { HIGHLIGHT_LIFT_ICON_SCALE } from './TabBarFloating.constants';
import type { HighlightMotion, HighlightSlot } from './TabBarFloatingHighlight';

export interface TabBarFloatingItemProps {
  iconName: IconName;
  label: string;
  isActive: boolean;
  onPress: () => void;
  testID?: string;
  /** Reports the slot's position so the shared highlight can slide onto it. */
  onLayout?: (event: LayoutChangeEvent) => void;
  /** Finger down / up, so the shared highlight can lift before it moves. */
  onPressIn?: () => void;
  onPressOut?: () => void;
  /**
   * The shared highlight's motion and slot table, plus this item's index into
   * it. Together they let the icon swell as the bubble passes over it.
   */
  motion?: HighlightMotion;
  slots?: SharedValue<HighlightSlot[]>;
  index?: number;
}

const TabBarFloatingItem = ({
  iconName,
  label,
  isActive,
  onPress,
  testID,
  onLayout,
  onPressIn,
  onPressOut,
  motion,
  slots,
  index,
}: TabBarFloatingItemProps) => {
  const tw = useTailwind();

  // Magnification follows the bubble rather than the tab: scaled by the lift
  // and by how centred the bubble is on this slot, so an icon swells as the
  // bubble arrives and settles as it leaves.
  const contentStyle = useAnimatedStyle(() => {
    const slot = index === undefined ? undefined : slots?.value[index];
    if (!motion || !slot || slot.width <= 0) {
      return { transform: [{ scale: 1 }] };
    }

    const bubbleCenter = (motion.leftEdge.value + motion.rightEdge.value) / 2;
    const slotCenter = slot.x + slot.width / 2;
    const proximity = Math.max(
      0,
      1 - Math.abs(bubbleCenter - slotCenter) / slot.width,
    );

    return {
      transform: [
        {
          scale: 1 + HIGHLIGHT_LIFT_ICON_SCALE * motion.lift.value * proximity,
        },
      ],
    };
  });

  return (
    <ButtonAnimated
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      // The active background is drawn by the shared highlight in
      // `TabBarFloating` so it can slide between slots instead of snapping.
      style={tw.style(
        'flex-1 items-center justify-center self-stretch rounded-full bg-transparent py-2',
      )}
      onLayout={onLayout}
      testID={testID}
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      accessible
    >
      <Animated.View
        style={[tw.style('items-center'), contentStyle]}
        testID={testID ? `${testID}-content` : undefined}
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
      </Animated.View>
    </ButtonAnimated>
  );
};

export default TabBarFloatingItem;
