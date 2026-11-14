import React, { useEffect } from 'react';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  ButtonIcon,
  ButtonIconSize,
  IconColor,
  IconName,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { MoneyMfaTestIds } from './MoneyMfa.testIds';

const HIT_SLOP = { top: 12, bottom: 12, left: 12, right: 12 };
const PULSE_MS = 1300;
const PULSE_GAP_MS = 80;
const PULSE_EASING = Easing.inOut(Easing.cubic);

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

/**
 * The green shield next to the Money title when 2-step verification is on.
 *
 * @param props - The badge's props.
 * @param props.onPress - Opens the 2-step verification sheet.
 * @param props.isHighlighted - Pulses the shield twice.
 */
const MoneyMfaHeaderBadge = ({
  onPress,
  isHighlighted = false,
}: MoneyMfaHeaderBadgeProps) => {
  const tw = useTailwind();
  const isReducedMotion = useReducedMotion();
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = 0;
    if (!isHighlighted || isReducedMotion) {
      return;
    }
    pulse.value = withSequence(
      withTiming(1, { duration: PULSE_MS, easing: PULSE_EASING }),
      withTiming(0, { duration: 0 }),
      withDelay(
        PULSE_GAP_MS,
        withTiming(1, { duration: PULSE_MS, easing: PULSE_EASING }),
      ),
    );
    return () => cancelAnimation(pulse);
  }, [isHighlighted, isReducedMotion, pulse]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(pulse.value, [0, 0.35, 1], [1, 1.18, 1]) },
    ],
  }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 0.2, 1], [0, 0.35, 0]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [0.65, 1.15]) }],
  }));

  return (
    <Box twClassName="items-center justify-center">
      <Animated.View
        pointerEvents="none"
        style={[
          tw.style('absolute h-9 w-9 rounded-full bg-success-default'),
          ringStyle,
        ]}
      />
      <Animated.View style={iconStyle}>
        <ButtonIcon
          {...getMoneyMfaHeaderBadgeProps(onPress)}
          size={ButtonIconSize.Sm}
          hitSlop={HIT_SLOP}
        />
      </Animated.View>
    </Box>
  );
};

export default MoneyMfaHeaderBadge;
