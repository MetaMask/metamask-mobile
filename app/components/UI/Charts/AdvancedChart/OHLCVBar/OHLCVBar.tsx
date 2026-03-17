import React, { useMemo } from 'react';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import { addCurrencySymbol } from '../../../../../util/number';
import { strings } from '../../../../../../locales/i18n';
import type { CrosshairData } from '../AdvancedChart.types';

interface OHLCVBarProps {
  data: CrosshairData;
  currency: string;
  testID?: string;
}

function formatVolume(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1e12) return `${(value / 1e12).toFixed(1)}T`;
  if (abs >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return value.toFixed(0);
}

const LABELS = [
  { key: 'open' as const, label: () => strings('perps.chart.ohlc.open') },
  { key: 'close' as const, label: () => strings('perps.chart.ohlc.close') },
  { key: 'high' as const, label: () => strings('perps.chart.ohlc.high') },
  { key: 'low' as const, label: () => strings('perps.chart.ohlc.low') },
] as const;

const OHLCVBar: React.FC<OHLCVBarProps> = ({ data, currency, testID }) => {
  const formatted = useMemo(() => {
    const prices = {
      open: addCurrencySymbol(data.open, currency),
      close: addCurrencySymbol(data.close, currency),
      high: addCurrencySymbol(data.high, currency),
      low: addCurrencySymbol(data.low, currency),
    };
    const volume = data.volume !== undefined ? formatVolume(data.volume) : null;
    return { prices, volume };
  }, [data.open, data.close, data.high, data.low, data.volume, currency]);

  return (
    <Box twClassName="px-4 py-2" testID={testID}>
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        twClassName="mb-1"
      >
        {LABELS.map(({ key }) => (
          <Box key={key} twClassName="flex-1">
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextDefault}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {formatted.prices[key]}
            </Text>
          </Box>
        ))}
        {formatted.volume && (
          <Box twClassName="flex-1">
            <Text
              variant={TextVariant.BodySm}
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
        {formatted.volume && (
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

export default OHLCVBar;
