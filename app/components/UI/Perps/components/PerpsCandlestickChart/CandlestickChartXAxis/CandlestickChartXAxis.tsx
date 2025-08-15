import React, { useMemo } from 'react';
import { View } from 'react-native';
import { useStyles } from '../../../../../../component-library/hooks';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import {
  formatTimeForXAxis,
  generateTimeIntervals,
  ChartDataPoint,
} from '../utils/chartUtils';
import { styleSheet } from './CandlestickChartXAxis.styles';
import { PerpsChartAdditionalSelectorsIDs } from '../../../../../../../e2e/selectors/Perps/Perps.selectors';

interface CandlestickChartXAxisProps {
  /** Transformed chart data for time calculations */
  transformedData: ChartDataPoint[];
  /** Chart width for positioning calculations */
  chartWidth: number;
  /** Number of time labels to display (default: 5) */
  labelCount?: number;
  /** Test ID for the container */
  testID?: string;
}

/**
 * Component for rendering X-axis time labels on candlestick charts
 * Displays evenly spaced time points with time and date formatting
 */
const CandlestickChartXAxis: React.FC<CandlestickChartXAxisProps> = ({
  transformedData,
  chartWidth,
  labelCount = 5,
  testID = PerpsChartAdditionalSelectorsIDs.CANDLESTICK_X_AXIS,
}) => {
  const { styles } = useStyles(styleSheet, {});

  // Generate time intervals for X-axis labels
  const timeIntervals = useMemo(
    () => generateTimeIntervals(transformedData, chartWidth, labelCount),
    [transformedData, chartWidth, labelCount],
  );

  if (transformedData.length === 0) {
    return null;
  }

  return (
    <View style={styles.timeAxisContainer} testID={testID}>
      {timeIntervals.map((interval) => (
        <Text
          key={`time-${interval.index}`}
          variant={TextVariant.BodyXS}
          color={TextColor.Alternative}
          style={[
            styles.timeLabel,
            {
              left: interval.position,
            },
          ]}
          testID={`time-label-${interval.index}`}
        >
          {formatTimeForXAxis(interval.time)}
        </Text>
      ))}
    </View>
  );
};

export default CandlestickChartXAxis;
