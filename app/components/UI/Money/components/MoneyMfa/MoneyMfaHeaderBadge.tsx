import React from 'react';
import { useReducedMotion } from 'react-native-reanimated';
import {
  ButtonIcon,
  ButtonIconSize,
  IconColor,
  IconName,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import TextShimmer from '../TextShimmer';
import { MoneyMfaTestIds } from './MoneyMfa.testIds';

const HIT_SLOP = { top: 12, bottom: 12, left: 12, right: 12 };
const SHIMMER_PAUSE_MS = 1000;

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
 * @param props.isHighlighted - Sweeps a shine across the shield.
 */
const MoneyMfaHeaderBadge = ({
  onPress,
  isHighlighted = false,
}: MoneyMfaHeaderBadgeProps) => {
  const isReducedMotion = useReducedMotion();
  const badge = (
    <ButtonIcon
      {...getMoneyMfaHeaderBadgeProps(onPress)}
      size={ButtonIconSize.Sm}
      hitSlop={HIT_SLOP}
    />
  );

  return isHighlighted && !isReducedMotion ? (
    <TextShimmer pauseDurationMs={SHIMMER_PAUSE_MS}>{badge}</TextShimmer>
  ) : (
    badge
  );
};

export default MoneyMfaHeaderBadge;
