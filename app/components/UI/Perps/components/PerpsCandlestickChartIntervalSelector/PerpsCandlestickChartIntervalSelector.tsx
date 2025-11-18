import React from 'react';
import { TouchableOpacity, ScrollView } from 'react-native';
import { useStyles } from '../../../../../component-library/hooks';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import {
  CHART_INTERVALS,
  PERPS_CHART_CONFIG,
  ChartInterval,
} from '../../constants/chartConfig';
import { selectorStyleSheet } from './PerpsCandlestickChartIntervalSelector.styles.ts';

interface PerpsCandlestickChartIntervalSelectorProps {
  selectedInterval: ChartInterval | string;
  onIntervalChange?: (interval: ChartInterval) => void;
  testID?: string;
  style?: object; // Allow custom styles to override defaults
}

const PerpsCandlestickChartIntervalSelector: React.FC<
  PerpsCandlestickChartIntervalSelectorProps
> = ({ selectedInterval, onIntervalChange, testID, style }) => {
  const { styles } = useStyles(selectorStyleSheet, {});

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[styles.intervalSelector, style]}
      contentContainerStyle={styles.intervalSelectorContent}
      testID={testID}
    >
      {CHART_INTERVALS.map((interval) => (
        <TouchableOpacity
          key={interval.value}
          style={[
            styles.intervalTab,
            selectedInterval === interval.value
              ? styles.intervalTabActive
              : styles.intervalTabInactive,
          ]}
          onPress={() => onIntervalChange?.(interval.value)}
          activeOpacity={PERPS_CHART_CONFIG.INTERVAL_SELECTOR_OPACITY}
          testID={`${testID}-${interval.value}`}
        >
          <Text
            variant={TextVariant.BodySM}
            color={
              selectedInterval === interval.value
                ? TextColor.Default
                : TextColor.Muted
            }
            style={[
              styles.intervalTabText,
              selectedInterval === interval.value
                ? styles.intervalTabTextActive
                : styles.intervalTabTextInactive,
            ]}
          >
            {interval.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

export default PerpsCandlestickChartIntervalSelector;
