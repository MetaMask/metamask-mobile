import React, { useCallback, useMemo, useState } from 'react';
import {
  Dimensions,
  GestureResponderEvent,
  PanResponder,
  View,
} from 'react-native';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { AreaChart } from 'react-native-svg-charts';
import { useStyles } from '../../../../../hooks/useStyles';
import styleSheet from './VaultHistoricRewardsChart.styles';
import {
  MOCK_VAULT_APRS,
  MOCK_VAULT_REWARDS_ONE_WEEK,
  MOCK_VAULT_REWARDS_ONE_YEAR,
  parseVaultTimespanAprsResponse,
} from '../mockVaultRewards';
import ChartTimespanButtonGroup from './ChartTimespanButtonGroup';
import Tooltip from './Tooltip';
import DataGradient from './DataGradient';
import PlotLine from './PlotLine';
import BigNumber from 'bignumber.js';
import {
  SMALL_DATASET_THRESHOLD,
  SMALL_DATASET_SNAP_RATIO,
  CHART_BUTTONS,
} from './VaultHistoricRewardsChart.constants';
import {
  calculateSegmentCenters,
  formatDailyAprReward,
  getGraphContentInset,
} from './VaultHistoricRewardsChart.utils';

interface CurrentEarningRateProps {
  title: string;
  subtitle: string;
}

const CurrentEarningRate = ({ title, subtitle }: CurrentEarningRateProps) => {
  const { styles } = useStyles(styleSheet, {});

  return (
    <View style={styles.earningRate}>
      <Text variant={TextVariant.HeadingLG} color={TextColor.Success}>
        {title}
      </Text>
      <Text variant={TextVariant.BodyMDMedium} color={TextColor.Alternative}>
        {subtitle}
      </Text>
    </View>
  );
};

/**
 * To feel more intuitive while scrolling horizontally, this chart uses a snapping mechanism.
 * The chart uses a snap threshold that provides some "give" before transitioning to the next data point.
 * This "give" is based on the distance from the center of a segment/data point.
 *
 * Segment Widths: The chart is divided into equal-width segments, one for each data point.
 * Segment Centers: Each data point is associated with a center position within its segment to determine where snapping should occur.
 * Snap Threshold: A portion of the segment width (e.g. 25%) that defines how far past a segment's boundary the cursor can go
 * before snapping to the next segment
 */
// TODO: Snap threshold shouldn't apply the first and last elements since we have to swipe off screen to reach them.
// TODO: Clicking in between points should default to the next segment. Right now clicking between points does nothing until you start dragging.
// TODO: Replace MOCK values with actual VaultDailyRewards from StakeSDK.
const VaultHistoricRewardsChart = () => {
  const { styles } = useStyles(styleSheet, { isSelected: false });

  // Vault Aprs for 1 day, 1 week, 1 month, 3 months, 6 months, and 1 year.
  // Calculated server-side
  const parsedVaultTimespanAprs = useMemo(
    () => parseVaultTimespanAprsResponse(MOCK_VAULT_APRS),
    [],
  );

  // Default at 1 week
  const [activeTimespanApr, setActiveTimespanApr] = useState(
    parsedVaultTimespanAprs[7],
  );

  const [userSelectedDailyApr, setUserSelectedDailyApr] = useState<{
    apr: string;
    timestamp: string;
  } | null>(null);

  const [vaultRewardsToDisplay, setVaultRewardsToDisplay] = useState(
    MOCK_VAULT_REWARDS_ONE_WEEK,
  );

  const [selectedPointIndex, setSelectedPointIndex] = useState(-1);

  const dataPoints = useMemo(
    () => vaultRewardsToDisplay.map(({ daily_apy }) => parseFloat(daily_apy)),
    [vaultRewardsToDisplay],
  );

  const doesChartHaveData = dataPoints.length > 0;

  const chartWidth = Dimensions.get('window').width;

  const chartSegmentWidth = useMemo(() => {
    const calculatedSegmentWidth = chartWidth / dataPoints.length;
    return parseFloat(calculatedSegmentWidth.toFixed(6));
  }, [chartWidth, dataPoints.length]);

  const segmentCenters = useMemo(
    () => calculateSegmentCenters(dataPoints, chartSegmentWidth),
    [chartSegmentWidth, dataPoints],
  );

  const handleTimespanPressed = (numDaysToDisplay: number) => {
    setVaultRewardsToDisplay(
      MOCK_VAULT_REWARDS_ONE_YEAR.slice(-numDaysToDisplay),
    );
    setActiveTimespanApr(parsedVaultTimespanAprs[numDaysToDisplay]);
    // Reset selected position when switching timespan
    setSelectedPointIndex(-1);
  };

  // Determines when the cursor should "snap" (or jump to) the next point.
  const snapThreshold = useMemo(
    () =>
      chartSegmentWidth *
      (dataPoints.length <= SMALL_DATASET_THRESHOLD
        ? SMALL_DATASET_SNAP_RATIO
        : 0),
    [dataPoints.length, chartSegmentWidth],
  );

  const graphInset = useMemo(
    () => getGraphContentInset(dataPoints),
    [dataPoints],
  );

  const updateSelection = useCallback(
    (index: number) => {
      setSelectedPointIndex(index);
      const activeVaultDailyReward = vaultRewardsToDisplay[index];
      setUserSelectedDailyApr(formatDailyAprReward(activeVaultDailyReward));
    },
    [vaultRewardsToDisplay],
  );

  const updatePosition = useCallback(
    (x: number) => {
      if (x === -1) {
        setSelectedPointIndex(-1);
        setUserSelectedDailyApr(null);
        return;
      }

      // Find the closest segment center to the current touch position
      let closestIndex = 0;
      let minDistance = Infinity;

      segmentCenters.forEach((center, index) => {
        const distance = Math.abs(x - center);
        if (distance < minDistance) {
          closestIndex = index;
          minDistance = distance;
        }
      });

      // Ensure snapping respects the snap threshold
      // Only snap for small datasets
      if (
        minDistance <= snapThreshold ||
        dataPoints.length > SMALL_DATASET_THRESHOLD
      ) {
        updateSelection(closestIndex);
      }
    },
    [segmentCenters, snapThreshold, updateSelection, dataPoints.length],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderTerminationRequest: () => true,
        onPanResponderGrant: (evt: GestureResponderEvent) => {
          updatePosition(evt.nativeEvent.locationX);
        },
        onPanResponderMove: (evt: GestureResponderEvent) => {
          updatePosition(evt.nativeEvent.locationX);
        },
        onPanResponderRelease: () => {
          updatePosition(-1);
        },
      }),
    [updatePosition],
  );

  return (
    <View>
      <ChartTimespanButtonGroup
        buttons={CHART_BUTTONS}
        onTimePress={handleTimespanPressed}
      />
      <CurrentEarningRate
        title={
          userSelectedDailyApr
            ? `${userSelectedDailyApr.apr} APR`
            : `${new BigNumber(activeTimespanApr.apr).toFixed(
                1,
                BigNumber.ROUND_DOWN,
              )}% APR`
        }
        subtitle={
          userSelectedDailyApr
            ? userSelectedDailyApr.timestamp
            : activeTimespanApr.label
        }
      />
      <View style={styles.chartContainer} {...panResponder.panHandlers}>
        <AreaChart
          style={styles.chart}
          data={dataPoints}
          contentInset={{
            top: graphInset,
            bottom: graphInset,
          }}
          svg={doesChartHaveData ? { fill: `url(#dataGradient)` } : undefined}
          yMin={0}
        >
          <PlotLine doesChartHaveData={doesChartHaveData} />
          {doesChartHaveData && <DataGradient dataPoints={dataPoints} />}
          <Tooltip currentX={selectedPointIndex} dailyAprs={dataPoints} />
        </AreaChart>
      </View>
    </View>
  );
};

export default VaultHistoricRewardsChart;
