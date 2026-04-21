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
  testID?: string;
}

const LABELS = [
  { key: 'open' as const, label: () => strings('perps.chart.ohlc.open') },
  { key: 'close' as const, label: () => strings('perps.chart.ohlc.close') },
  { key: 'high' as const, label: () => strings('perps.chart.ohlc.high') },
  { key: 'low' as const, label: () => strings('perps.chart.ohlc.low') },
] as const;

export const OHLCVBar: React.FC<OHLCVBarProps> = ({
  data,
  currency,
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
    <Box twClassName="px-4 pb-3" testID={testID}>
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
      >
        {LABELS.map(({ key }) => (
          <Box key={key} twClassName="flex-1">
            <Text
              variant={TextVariant.BodySm}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextDefault}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {formatted.prices[key]}
            </Text>
          </Box>
        ))}
        {formatted.volume !== null && (
          <Box twClassName="flex-1">
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
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
      >
        {LABELS.map(({ key, label }) => (
          <Box key={key} twClassName="flex-1">
            <Text
              variant={TextVariant.BodyXs}
              color={TextColor.TextAlternative}
            >
              {label()}
            </Text>
          </Box>
        ))}
        {formatted.volume !== null && (
          <Box twClassName="flex-1">
            <Text
              variant={TextVariant.BodyXs}
              color={TextColor.TextAlternative}
            >
              {strings('perps.chart.ohlc.volume')}
            </Text>
          </Box>
        )}
      </Box>
    </Box>
  );
};
