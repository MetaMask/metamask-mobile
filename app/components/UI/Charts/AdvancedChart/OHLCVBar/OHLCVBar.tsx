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

interface LabelValueRow {
  label: string;
  value: string;
  valueColor?: TextColor;
}

const LabelValue: React.FC<LabelValueRow> = ({ label, value, valueColor }) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    twClassName="gap-2"
  >
    <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
      {label}
    </Text>
    <Text
      variant={TextVariant.BodySm}
      fontWeight={FontWeight.Medium}
      color={valueColor ?? TextColor.TextDefault}
      numberOfLines={1}
    >
      {value}
    </Text>
  </Box>
);

const Column: React.FC<{ rows: LabelValueRow[] }> = ({ rows }) => (
  <Box
    flexDirection={BoxFlexDirection.Column}
    alignItems={BoxAlignItems.Start}
    twClassName="gap-2.5"
  >
    {rows.map((row) => (
      <LabelValue key={row.label} {...row} />
    ))}
  </Box>
);

export const OHLCVBar: React.FC<OHLCVBarProps> = ({
  data,
  currency,
  changePercent,
  changePercentColor,
  testID,
}) => {
  const { leftRows, rightRows } = useMemo(() => {
    const fmt = (n: number) =>
      formatPriceWithSubscriptNotation(n, currency, {
        maxDigitsAfterSubscript: 1,
      });

    const volumeText =
      data.volume === undefined
        ? null
        : Number(data.volume) === 0
          ? '—'
          : formatOhlcvVolumeDisplay(data.volume, currency);

    const left: LabelValueRow[] = [
      { label: strings('perps.chart.ohlc.open'), value: fmt(data.open) },
      { label: strings('perps.chart.ohlc.close'), value: fmt(data.close) },
    ];
    if (volumeText !== null) {
      left.push({
        label: strings('perps.chart.ohlc.volume'),
        value: volumeText,
      });
    }

    const right: LabelValueRow[] = [
      { label: strings('perps.chart.ohlc.low'), value: fmt(data.low) },
      { label: strings('perps.chart.ohlc.high'), value: fmt(data.high) },
    ];
    if (changePercent !== undefined) {
      right.push({
        label: strings('perps.chart.ohlc.change'),
        value: changePercent,
        valueColor: changePercentColor,
      });
    }

    return { leftRows: left, rightRows: right };
  }, [
    data.open,
    data.close,
    data.high,
    data.low,
    data.volume,
    currency,
    changePercent,
    changePercentColor,
  ]);

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      justifyContent={BoxJustifyContent.Between}
      alignItems={BoxAlignItems.Start}
      twClassName="px-4 pt-2.5 pb-2 w-[302px]"
      testID={testID}
    >
      <Column rows={leftRows} />
      <Column rows={rightRows} />
    </Box>
  );
};
