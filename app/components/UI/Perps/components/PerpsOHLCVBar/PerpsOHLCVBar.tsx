import React, { useMemo } from 'react';
import { View } from 'react-native';
import Text, {
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import {
  formatPerpsFiat,
  formatVolume,
  PRICE_RANGES_UNIVERSAL,
} from '../../utils/formatUtils';
import { createStyles } from './PerpsOHLCVBar.styles';
import type { PerpsOHLCVBarProps } from './PerpsOHLCVBar.types';
import { strings } from '../../../../../../locales/i18n';

/**
 * PerpsOHLCVBar Component
 *
 * Displays Open, High, Low, Close, and Volume data in a two-row layout.
 * This component appears above the trading chart and updates in real-time as the
 * user interacts with the chart crosshair.
 *
 * Layout:
 * - Top row: Formatted values (prices and volume)
 * - Bottom row: Labels (Open, Close, High, Low, Volume)
 * - 5 equal-width columns with centered text alignment
 *
 * Features:
 * - Two-row layout matching TradingView design patterns
 * - Formats prices using universal price ranges
 * - Formats volume with K/M/B/T suffixes
 * - Only renders when data is available
 * - Optimized memoization to prevent unnecessary re-renders
 *
 * @example
 * <PerpsOHLCVBar
 *   open="27750.00"
 *   high="27890.00"
 *   low="27680.00"
 *   close="27750.00"
 *   volume="1234567.89"
 * />
 */
const PerpsOHLCVBar: React.FC<PerpsOHLCVBarProps> = ({
  open,
  high,
  low,
  close,
  volume,
  testID,
}) => {
  const { styles } = useStyles(createStyles, {});

  // Format all values using memoization to prevent unnecessary recalculations
  const formattedValues = useMemo(() => {
    // Format OHLC prices with universal price ranges
    const formattedOpen = formatPerpsFiat(open, {
      ranges: PRICE_RANGES_UNIVERSAL,
      stripTrailingZeros: true,
    });
    const formattedHigh = formatPerpsFiat(high, {
      ranges: PRICE_RANGES_UNIVERSAL,
      stripTrailingZeros: true,
    });
    const formattedLow = formatPerpsFiat(low, {
      ranges: PRICE_RANGES_UNIVERSAL,
      stripTrailingZeros: true,
    });
    const formattedClose = formatPerpsFiat(close, {
      ranges: PRICE_RANGES_UNIVERSAL,
      stripTrailingZeros: true,
    });

    // Format volume with K/M/B/T suffixes (if provided)
    const formattedVolume = volume ? formatVolume(volume) : null;

    return {
      open: formattedOpen,
      high: formattedHigh,
      low: formattedLow,
      close: formattedClose,
      volume: formattedVolume,
    };
  }, [open, high, low, close, volume]);

  return (
    <View style={styles.container} testID={testID}>
      {/* Values Row */}
      <View style={styles.valuesRow}>
        <View style={styles.column}>
          <Text
            style={styles.valueText}
            color={TextColor.Default}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {formattedValues.open}
          </Text>
        </View>
        <View style={styles.column}>
          <Text
            style={styles.valueText}
            color={TextColor.Default}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {formattedValues.close}
          </Text>
        </View>
        <View style={styles.column}>
          <Text
            style={styles.valueText}
            color={TextColor.Default}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {formattedValues.high}
          </Text>
        </View>
        <View style={styles.column}>
          <Text
            style={styles.valueText}
            color={TextColor.Default}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {formattedValues.low}
          </Text>
        </View>
        {formattedValues.volume && (
          <View style={styles.column}>
            <Text
              style={styles.valueText}
              color={TextColor.Default}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {formattedValues.volume}
            </Text>
          </View>
        )}
      </View>

      {/* Labels Row */}
      <View style={styles.labelsRow}>
        <View style={styles.column}>
          <Text style={styles.labelText} color={TextColor.Alternative}>
            {strings('perps.chart.ohlc.open')}
          </Text>
        </View>
        <View style={styles.column}>
          <Text style={styles.labelText} color={TextColor.Alternative}>
            {strings('perps.chart.ohlc.close')}
          </Text>
        </View>
        <View style={styles.column}>
          <Text style={styles.labelText} color={TextColor.Alternative}>
            {strings('perps.chart.ohlc.high')}
          </Text>
        </View>
        <View style={styles.column}>
          <Text style={styles.labelText} color={TextColor.Alternative}>
            {strings('perps.chart.ohlc.low')}
          </Text>
        </View>
        {formattedValues.volume && (
          <View style={styles.column}>
            <Text style={styles.labelText} color={TextColor.Alternative}>
              {strings('perps.chart.ohlc.volume')}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

export default PerpsOHLCVBar;
