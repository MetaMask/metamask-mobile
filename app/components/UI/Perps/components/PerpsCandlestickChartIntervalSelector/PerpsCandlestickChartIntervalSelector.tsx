import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useStyles } from '../../../../../component-library/hooks';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { CHART_INTERVALS } from '../../constants/chartConfig';
import { selectorStyleSheet } from './PerpsCandlestickChartIntervalSelector.styles';

interface PerpsCandlestickChartIntervalSelectorProps {
  selectedInterval: string;
  onIntervalChange?: (interval: string) => void;
  testID?: string;
}

const PerpsCandlestickChartIntervalSelector: React.FC<
  PerpsCandlestickChartIntervalSelectorProps
> = ({ selectedInterval, onIntervalChange, testID }) => {
  const { styles } = useStyles(selectorStyleSheet, {});

  return (
    <View style={styles.intervalSelector} testID={testID}>
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
          activeOpacity={0.7}
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
    </View>
  );
};

export default PerpsCandlestickChartIntervalSelector;
