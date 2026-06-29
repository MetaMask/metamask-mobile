import React, { useMemo } from 'react';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import { formatPriceWithSubscriptNotation } from '../../../Predict/utils/format';
import { strings } from '../../../../../../locales/i18n';
import type { CrosshairData } from '../AdvancedChart.types';
import { formatOhlcvVolumeDisplay } from './ohlcvBarVolumeFormat';

interface OHLCVBarProps {
  data: CrosshairData;
  currency: string;
  changePercent?: string;
  changePercentColor?: TextColor;
  testID?: string;
}

const LEFT_COLUMN = [
  { labelKey: 'perps.chart.ohlc.open', valueKey: 'open' as const },
  { labelKey: 'perps.chart.ohlc.close', valueKey: 'close' as const },
] as const;

const RIGHT_COLUMN = [
  { labelKey: 'perps.chart.ohlc.low', valueKey: 'low' as const },
  { labelKey: 'perps.chart.ohlc.high', valueKey: 'high' as const },
] as const;

export const OHLCVBar: React.FC<OHLCVBarProps> = ({
  data,
  currency,
  changePercent,
  changePercentColor,
  testID,
}) => {
  const formatted = useMemo(() => {
    const subscriptOpts = { maxDigitsAfterSubscript: 1 };
    const prices = {
      open: formatPriceWithSubscriptNotation(
        data.open,
        currency,
        subscriptOpts,
      ),
      close: formatPriceWithSubscriptNotation(
        data.close,
        currency,
        subscriptOpts,
      ),
      high: formatPriceWithSubscriptNotation(
        data.high,
        currency,
        subscriptOpts,
      ),
      low: formatPriceWithSubscriptNotation(data.low, currency, subscriptOpts),
    };
    const volume =
      data.volume === undefined
        ? null
        : Number(data.volume) === 0
          ? '—'
          : formatOhlcvVolumeDisplay(data.volume, currency);
    return { prices, volume };
  }, [data.open, data.close, data.high, data.low, data.volume, currency]);

  return (
    <Box twClassName="px-4 pt-4 pb-3" testID={testID}>
      <Box flexDirection={BoxFlexDirection.Row}>
        {/* Left column: Open, Close, Volume */}
        <Box twClassName="flex-1 pr-2">
          {LEFT_COLUMN.map(({ labelKey, valueKey }) => (
            <Box
              key={valueKey}
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              justifyContent={BoxJustifyContent.Between}
            >
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
              >
                {strings(labelKey)}
              </Text>
              <Text
                variant={TextVariant.BodySm}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextDefault}
                numberOfLines={1}
              >
                {formatted.prices[valueKey]}
              </Text>
            </Box>
          ))}
          {formatted.volume !== null && (
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              justifyContent={BoxJustifyContent.Between}
            >
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
              >
                {strings('perps.chart.ohlc.volume')}
              </Text>
              <Text
                variant={TextVariant.BodySm}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextDefault}
                numberOfLines={1}
              >
                {formatted.volume}
              </Text>
            </Box>
          )}
        </Box>
        {/* Right column: Low, High, Change */}
        <Box twClassName="flex-1 pl-2">
          {RIGHT_COLUMN.map(({ labelKey, valueKey }) => (
            <Box
              key={valueKey}
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              justifyContent={BoxJustifyContent.Between}
            >
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
              >
                {strings(labelKey)}
              </Text>
              <Text
                variant={TextVariant.BodySm}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextDefault}
                numberOfLines={1}
              >
                {formatted.prices[valueKey]}
              </Text>
            </Box>
          ))}
          {changePercent !== undefined && (
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              justifyContent={BoxJustifyContent.Between}
            >
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
              >
                {strings('perps.chart.ohlc.change')}
              </Text>
              <Text
                variant={TextVariant.BodySm}
                fontWeight={FontWeight.Medium}
                color={changePercentColor ?? TextColor.TextDefault}
                numberOfLines={1}
              >
                {changePercent}
              </Text>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};
