import React from 'react';
import { StyleSheet } from 'react-native';
import { Skeleton } from '../../../../../component-library/components/Skeleton';
import { PERPS_CHART_CONFIG } from '../../constants/chartConfig';
import { PerpsCandlestickChartSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import Device from '../../../../../util/device';

const styles = StyleSheet.create({
  skeleton: {
    borderRadius: 8,
  },
});

interface PerpsCandlestickChartSkeletonProps {
  height?: number;
  testID?: string;
}

const PerpsCandlestickChartSkeleton: React.FC<
  PerpsCandlestickChartSkeletonProps
> = ({
  height = PERPS_CHART_CONFIG.DEFAULT_HEIGHT,
  testID = PerpsCandlestickChartSelectorsIDs.SKELETON,
}) => (
  <Skeleton
    width={Device.getDeviceWidth() - PERPS_CHART_CONFIG.PADDING.HORIZONTAL * 2}
    style={styles.skeleton}
    testID={testID}
    height={height - PERPS_CHART_CONFIG.PADDING.VERTICAL}
  />
);

export default PerpsCandlestickChartSkeleton;
