import type { PerpsFeeDiscountKind } from '../../utils/feeDiscount';
import React, { useMemo } from 'react';
import { View } from 'react-native';
import PerpsFeeDiscountLabel from './PerpsFeeDiscountLabel';
import { createStyles } from './PerpsFeesDisplay.styles';
import { useTheme } from '../../../../../util/theme';
import { strings } from '../../../../../../locales/i18n';
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
  /** Text shown when `fee` (or, in `percentage` mode, either rate) is `undefined` (defaults to `"--"`). */
  placeholder?: string;
  testID?: string;
  variant?: TextVariant;
  /** Main fee value color. Defaults to `TextAlternative` for legacy screens. */
  color?: TextColor;
  fontWeight?: FontWeight;
  /**
   * `'dollar'` (default) renders `fee`/`originalFee` as today. `'percentage'`
   * renders `takerFeeRate`/`makerFeeRate` as "Taker X.XXX% / Maker Y.YYY%"
   * instead, ignoring `fee`/`originalFee`. Perps Fee Display Format A/B test
   * (TAT-4046) — only the order entry/review row passes this; every other
   * call site keeps the default dollar rendering.
   */
  feeDisplayMode?: 'dollar' | 'percentage';
  /** Taker-side combined fee rate as a decimal. Only used in `percentage` mode. */
  takerFeeRate?: number;
  /** Maker-side combined fee rate as a decimal. Only used in `percentage` mode. */
  makerFeeRate?: number;
}

/** Formats a decimal rate as the bare number string the locale template
 * supplies its own "%" for (e.g. `0.00143` → `"0.143"`), or `undefined` when
 * the rate is unavailable. */
const formatRateValue = (rate: number | undefined): string | undefined =>
  rate === undefined || Number.isNaN(rate)
    ? undefined
    : (rate * 100).toFixed(3);

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
  feeDisplayMode = 'dollar',
  takerFeeRate,
  makerFeeRate,
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const isPercentageMode = feeDisplayMode === 'percentage';

  const hasDiscount =
    feeDiscountPercentage !== undefined && feeDiscountPercentage > 0;

  const showStrikethrough = useMemo(
    () =>
      !isPercentageMode &&
      hasDiscount &&
      originalFee !== undefined &&
      fee !== undefined &&
      originalFee > fee,
    [isPercentageMode, hasDiscount, originalFee, fee],
  );

  const dollarFeeText = useMemo(() => {
    if (fee === undefined) return placeholder;
    return formatPerpsFiat(fee, { ranges: PRICE_RANGES_MINIMAL_VIEW });
  }, [fee, placeholder]);

  const takerMakerFeeText = useMemo(() => {
    const takerValue = formatRateValue(takerFeeRate);
    const makerValue = formatRateValue(makerFeeRate);
    if (takerValue === undefined || makerValue === undefined) {
      return placeholder;
    }
    return strings('perps.order.fees_taker_maker', {
      taker: takerValue,
      maker: makerValue,
    });
  }, [takerFeeRate, makerFeeRate, placeholder]);

  const feeText = isPercentageMode ? takerMakerFeeText : dollarFeeText;

  const originalFeeText = useMemo(() => {
    if (!showStrikethrough || originalFee === undefined) return undefined;
    return formatPerpsFiat(originalFee, { ranges: PRICE_RANGES_MINIMAL_VIEW });
  }, [showStrikethrough, originalFee]);

  return (
    <View style={styles.feeRowContent}>
      {hasDiscount ? (
        <View style={styles.vipBadgeContainer}>
          <PerpsFeeDiscountLabel
            feeDiscountPercentage={feeDiscountPercentage}
            feeDiscountKind={feeDiscountKind}
          />
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
