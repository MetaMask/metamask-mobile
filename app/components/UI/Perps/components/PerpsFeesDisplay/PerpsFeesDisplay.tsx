import React, { useMemo } from 'react';
import { View } from 'react-native';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import RewardsVipBadge from '../../../Rewards/components/RewardsVipBadge/RewardsVipBadge';
import { createStyles } from './PerpsFeesDisplay.styles';
import { useTheme } from '../../../../../util/theme';
import {
  formatPerpsFiat,
  PRICE_RANGES_MINIMAL_VIEW,
} from '../../utils/formatUtils';

interface PerpsFeesDisplayProps {
  /**
   * MetaMask fee discount in whole percentage points. When defined and
   * positive, a VIP badge is rendered and (if `originalFee` is also provided)
   * the pre-discount fee is shown struck-through.
   */
  feeDiscountPercentage?: number;
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
}

const PerpsFeesDisplay: React.FC<PerpsFeesDisplayProps> = ({
  feeDiscountPercentage,
  fee,
  originalFee,
  placeholder = '--',
  testID,
  variant = TextVariant.BodyMD,
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const showVipBadge =
    feeDiscountPercentage !== undefined && feeDiscountPercentage > 0;

  const showStrikethrough = useMemo(
    () =>
      showVipBadge &&
      originalFee !== undefined &&
      fee !== undefined &&
      originalFee > fee,
    [showVipBadge, originalFee, fee],
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
      {showVipBadge ? <RewardsVipBadge /> : null}
      {originalFeeText !== undefined ? (
        <Text
          variant={variant}
          color={TextColor.Alternative}
          // eslint-disable-next-line react-native/no-inline-styles
          style={{ textDecorationLine: 'line-through' }}
          testID={testID ? `${testID}-original` : undefined}
        >
          {originalFeeText}
        </Text>
      ) : null}
      <Text variant={variant} color={TextColor.Alternative} testID={testID}>
        {feeText}
      </Text>
    </View>
  );
};

export default PerpsFeesDisplay;
