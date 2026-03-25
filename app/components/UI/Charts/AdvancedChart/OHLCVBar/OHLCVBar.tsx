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
import {
  formatPerpsFiat,
  formatVolume,
  PRICE_RANGES_UNIVERSAL,
} from '../../../Perps/utils/formatUtils';
import { strings } from '../../../../../../locales/i18n';
import type { CrosshairData } from '../AdvancedChart.types';

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

const OHLCVBar: React.FC<OHLCVBarProps> = ({ data, currency, testID }) => {
  const formatted = useMemo(() => {
    const formatOpts = {
      ranges: PRICE_RANGES_UNIVERSAL,
      stripTrailingZeros: true,
      currency: currency.toUpperCase(),
    };
    const prices = {
      open: formatPerpsFiat(data.open, formatOpts),
      close: formatPerpsFiat(data.close, formatOpts),
      high: formatPerpsFiat(data.high, formatOpts),
      low: formatPerpsFiat(data.low, formatOpts),
    };
    const volume = data.volume !== undefined ? formatVolume(data.volume) : null;
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
              style={{ fontWeight: FontWeight.Medium }}
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
              style={{ fontWeight: FontWeight.Medium }}
              color={TextColor.TextDefault}
              numberOfLines={1}
              adjustsFontSizeToFit
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
