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
   * positive, a discount badge (VIP or member, see `feeSource`) is rendered
   * and (if `originalFee` is also provided) the pre-discount fee is shown
   * struck-through.
   */
  feeDiscountPercentage?: number;
  /**
   * Winning source of the fee resolution this quote was priced from. Only
   * picks the badge variant shown when `feeDiscountPercentage` is positive:
   * `subscription` renders the member badge, anything else (or omitted) the
   * VIP badge.
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

  const hasDiscount =
    feeDiscountPercentage !== undefined && feeDiscountPercentage > 0;

  const showStrikethrough = useMemo(
    () =>
      hasDiscount &&
      originalFee !== undefined &&
      fee !== undefined &&
      originalFee > fee,
    [hasDiscount, originalFee, fee],
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
      {hasDiscount ? (
        <View style={styles.vipBadgeContainer}>
          <RewardsVipBadge hasProEntitlement={feeSource === 'subscription'} />
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
