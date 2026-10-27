import type { PerpsFeeDiscountKind } from '../../utils/feeDiscount';
import React, { useMemo } from 'react';
import { View } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import PerpsFeeDiscountLabel from './PerpsFeeDiscountLabel';
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
   * MetaMask fee discount in whole percentage points. When positive, an
   * attribution label is rendered. If `originalFee` is also provided, the
   * pre-discount fee is shown struck-through.
   */
  feeDiscountPercentage?: number;
  feeDiscountKind?: PerpsFeeDiscountKind;
  /**
   * Fee amount in USD **after** any discount has been applied.
   * When `undefined`, a placeholder is rendered.
   */
  fee: number | undefined;
  /**
   * Fee amount in USD **before** any discount. Shown struck-through when
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

const strikethroughStyle = { textDecorationLine: 'line-through' as const };

const PerpsFeesDisplay: React.FC<PerpsFeesDisplayProps> = ({
  feeDiscountPercentage,
  feeDiscountKind,
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

  const isPromotionalDiscount =
    hasDiscount && feeDiscountKind === 'promotional';
  const discountedFeeColor = isPromotionalDiscount
    ? TextColor.SuccessDefault
    : color;

  return (
    <View style={styles.feeRowContent}>
      {hasDiscount ? (
        <View style={styles.vipBadgeContainer}>
          <PerpsFeeDiscountLabel
            feeDiscountPercentage={feeDiscountPercentage}
            feeDiscountKind={feeDiscountKind}
            accessibilityLabel={
              isPromotionalDiscount
                ? strings('perps.tooltips.fees.promotional_discount')
                : undefined
            }
          />
        </View>
      ) : null}
      {originalFeeText !== undefined ? (
        <Text
          variant={variant}
          color={TextColor.TextAlternative}
          style={strikethroughStyle}
          testID={testID ? `${testID}-original` : undefined}
          accessibilityLabel={
            isPromotionalDiscount
              ? strings('perps.tooltips.fees.original_fee_value', {
                  fee: originalFeeText,
                })
              : undefined
          }
        >
          {originalFeeText}
        </Text>
      ) : null}
      <Text
        variant={variant}
        color={discountedFeeColor}
        fontWeight={fontWeight}
        testID={testID}
      >
        {feeText}
      </Text>
    </View>
  );
};

export default PerpsFeesDisplay;
