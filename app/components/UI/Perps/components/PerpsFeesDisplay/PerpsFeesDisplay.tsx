import React, { useMemo } from 'react';
import { View } from 'react-native';
import type { PerpsFeeSource } from '@metamask/perps-controller';
import RewardsVipBadge from '../../../Rewards/components/RewardsVipBadge/RewardsVipBadge';
import { createStyles } from './PerpsFeesDisplay.styles';
import { useTheme } from '../../../../../util/theme';
import {
  formatPerpsFiat,
  PRICE_RANGES_MINIMAL_VIEW,
} from '../../utils/formatUtils';
import {
  Text,
  TextVariant,
  TextColor,
  FontWeight,
} from '@metamask/design-system-react-native';

interface PerpsFeesDisplayProps {
  /**
   * MetaMask fee discount in whole percentage points. When defined and
   * positive, a VIP badge is rendered and (if `originalFee` is also provided)
   * the pre-discount fee is shown struck-through.
   */
  feeDiscountPercentage?: number;
  /**
   * Winning source of the fee resolution this quote was priced from.
   * `subscription` renders the member badge; `rewards` (with a positive
   * `feeDiscountPercentage`) renders the VIP badge instead. When omitted,
   * the VIP badge falls back to `feeDiscountPercentage` alone.
   */
  feeSource?: PerpsFeeSource;
  /**
   * Fee amount in USD **after** any VIP discount has been applied.
   * When `undefined`, a placeholder is rendered.
   */
  fee: number | undefined;
  /**
   * Fee amount in USD **before** any VIP discount. Shown struck-through when
   * a discount is active. When `undefined` the struck-through row is omitted.
   */
  originalFee?: number;
  /** Text shown when `fee` is `undefined` (defaults to `"--"`). */
  placeholder?: string;
  testID?: string;
  variant?: TextVariant;
  /** Main fee value color. Defaults to `TextAlternative` for legacy screens. */
  color?: TextColor;
  fontWeight?: FontWeight;
}

const PerpsFeesDisplay: React.FC<PerpsFeesDisplayProps> = ({
  feeDiscountPercentage,
  feeSource,
  fee,
  originalFee,
  placeholder = '--',
  testID,
  variant = TextVariant.BodyMd,
  color = TextColor.TextAlternative,
  fontWeight,
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  // `subscription` always wins a member badge, regardless of discount size.
  // `rewards` (or an unknown source, for callers not yet passing `feeSource`)
  // falls back to the discount-based VIP badge.
  const showMemberBadge = feeSource === 'subscription';
  const showVipBadge =
    !showMemberBadge &&
    feeDiscountPercentage !== undefined &&
    feeDiscountPercentage > 0;

  const showStrikethrough = useMemo(
    () =>
      (showVipBadge || showMemberBadge) &&
      originalFee !== undefined &&
      fee !== undefined &&
      originalFee > fee,
    [showVipBadge, showMemberBadge, originalFee, fee],
  );

  const feeText = useMemo(() => {
    if (fee === undefined) return placeholder;
    return formatPerpsFiat(fee, { ranges: PRICE_RANGES_MINIMAL_VIEW });
  }, [fee, placeholder]);

  const originalFeeText = useMemo(() => {
    if (!showStrikethrough || originalFee === undefined) return undefined;
    return formatPerpsFiat(originalFee, { ranges: PRICE_RANGES_MINIMAL_VIEW });
  }, [showStrikethrough, originalFee]);

  return (
    <View style={styles.feeRowContent}>
      {showMemberBadge || showVipBadge ? (
        <View style={styles.vipBadgeContainer}>
          <RewardsVipBadge hasProEntitlement={showMemberBadge} />
        </View>
      ) : null}
      {originalFeeText !== undefined ? (
        <Text
          variant={variant}
          color={TextColor.TextAlternative}
          // eslint-disable-next-line react-native/no-inline-styles
          style={{ textDecorationLine: 'line-through' }}
          testID={testID ? `${testID}-original` : undefined}
        >
          {originalFeeText}
        </Text>
      ) : null}
      <Text
        variant={variant}
        color={color}
        fontWeight={fontWeight}
        testID={testID}
      >
        {feeText}
      </Text>
    </View>
  );
};

export default PerpsFeesDisplay;
