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
import { PERPS_FEE_RATE_DISPLAY_DECIMALS } from '../../constants/perpsConfig';
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
   * instead, ignoring `fee`/`originalFee`. Only the order entry/review row
   * passes this; every other call site keeps the default dollar rendering.
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
    : (rate * 100).toFixed(PERPS_FEE_RATE_DISPLAY_DECIMALS);

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
      return { full: placeholder, taker: undefined, maker: undefined };
    }
    const full = strings('perps.order.fees_taker_maker', {
      taker: takerValue,
      maker: makerValue,
    });
    const separator = ' / ';
    const separatorIndex = full.indexOf(separator);
    if (separatorIndex === -1) {
      return { full, taker: undefined, maker: undefined };
    }
    return {
      full,
      taker: `${full.slice(0, separatorIndex)}${separator}`,
      maker: full.slice(separatorIndex + separator.length),
    };
  }, [takerFeeRate, makerFeeRate, placeholder]);

  const feeText = isPercentageMode ? takerMakerFeeText.full : dollarFeeText;

  const originalFeeText = useMemo(() => {
    if (!showStrikethrough || originalFee === undefined) return undefined;
    return formatPerpsFiat(originalFee, { ranges: PRICE_RANGES_MINIMAL_VIEW });
  }, [showStrikethrough, originalFee]);

  const percentageRates =
    isPercentageMode &&
    takerMakerFeeText.taker !== undefined &&
    takerMakerFeeText.maker !== undefined;

  const isPromotionalDiscount =
    hasDiscount && feeDiscountKind === 'promotional';
  const discountedFeeColor =
    isPromotionalDiscount && showStrikethrough
      ? TextColor.SuccessDefault
      : color;

  return (
    <View
      style={[
        styles.feeRowContent,
        percentageRates ? styles.percentageFeeContent : null,
      ]}
      accessibilityLabel={percentageRates ? takerMakerFeeText.full : undefined}
      // Keep the base testID mounted in percentage mode so E2E fee waits still resolve.
      testID={percentageRates ? testID : undefined}
    >
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
          twClassName="tabular-nums"
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
      {percentageRates ? (
        <>
          <Text
            variant={variant}
            color={discountedFeeColor}
            fontWeight={fontWeight}
            numberOfLines={1}
            style={styles.percentageRate}
            testID={testID ? `${testID}-taker` : undefined}
            twClassName="tabular-nums"
          >
            {takerMakerFeeText.taker}
          </Text>
          <Text
            variant={variant}
            color={discountedFeeColor}
            fontWeight={fontWeight}
            numberOfLines={1}
            style={styles.percentageRate}
            testID={testID ? `${testID}-maker` : undefined}
            twClassName="tabular-nums"
          >
            {takerMakerFeeText.maker}
          </Text>
        </>
      ) : (
        <Text
          variant={variant}
          color={discountedFeeColor}
          fontWeight={fontWeight}
          testID={testID}
          twClassName="tabular-nums"
        >
          {feeText}
        </Text>
      )}
    </View>
  );
};

export default PerpsFeesDisplay;
