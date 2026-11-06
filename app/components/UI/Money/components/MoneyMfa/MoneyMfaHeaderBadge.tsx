import React, { useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import {
  ButtonIcon,
  ButtonIconSize,
  IconColor,
  IconName,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { MoneyMfaTestIds } from './MoneyMfa.testIds';

const HIT_SLOP = { top: 12, bottom: 12, left: 12, right: 12 };

/**
 * Props for the green shield shown in the Money header when 2-step
 * verification is on. Header bars that take button props instead of an
 * element use these directly.
 *
 * @param onPress - Opens the 2-step verification sheet.
 * @returns The shield's button props.
 */
export const getMoneyMfaHeaderBadgeProps = (onPress?: () => void) => ({
  iconName: IconName.SecurityTick,
  iconProps: { color: IconColor.SuccessDefault },
  onPress,
  accessibilityLabel: strings('money.mfa.badge_label'),
  testID: MoneyMfaTestIds.HEADER_BADGE,
});

interface MoneyMfaHeaderBadgeProps {
  onPress?: () => void;
  isHighlighted?: boolean;
}

const PULSE_SCALE = 1.35;
const PULSE_MS = 220;
const PULSE_COUNT = 3;

/**
 * The green shield next to the Money title when 2-step verification is on.
 *
 * @param props - The badge's props.
 * @param props.onPress - Opens the 2-step verification sheet.
 * @param props.isHighlighted - Pulses the shield to draw attention to it.
 */
const MoneyMfaHeaderBadge = ({
  onPress,
  isHighlighted = false,
}: MoneyMfaHeaderBadgeProps) => {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (!isHighlighted) {
      return;
    }
    scale.value = withRepeat(
      withSequence(
        withTiming(PULSE_SCALE, { duration: PULSE_MS }),
        withTiming(1, { duration: PULSE_MS }),
      ),
      PULSE_COUNT,
    );
  }, [isHighlighted, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <ButtonIcon
        {...getMoneyMfaHeaderBadgeProps(onPress)}
        size={ButtonIconSize.Sm}
        hitSlop={HIT_SLOP}
      />
    </Animated.View>
  );
};

export default MoneyMfaHeaderBadge;
