import React, { useCallback, useMemo, useState } from 'react';
import {
  Dimensions,
  GestureResponderEvent,
  PanResponder,
  View,
} from 'react-native';
import { AreaChart } from 'react-native-svg-charts';
import ChartTimespanButtonGroup from './ChartTimespanButtonGroup';
import DataGradient from './DataGradient';
import PlotLine from './PlotLine';
import {
  SMALL_DATASET_SNAP_RATIO,
  SMALL_DATASET_THRESHOLD,
} from './InteractiveTimespanChart';
import styleSheet from './InteractiveTimespanChart.styles';
import { useStyles } from '../../../../../hooks/useStyles';
import { calculateSegmentCenters } from './InteractiveTimespanChart.utils';
import GraphCursor from './GraphCursor';
import {
  DataPoint,
  Accessor,
  GraphOptions,
} from './InteractiveTimespanChart.types';
import GraphTooltip from './GraphTooltip';
import { DEFAULT_GRAPH_OPTIONS } from './InteractiveTimespanChart.constants';

interface InteractiveTimespanChartProps<T extends DataPoint> {
  dataPoints: T[];
  /**
   * The yAccessor prop informs the graph of which object key to parse Y values from.
   * This allows for greater flexibility with the dataPoints passed into the graph.
   *
   * Example Usage:
   * <InteractiveTimespanChart
   * dataPoints={[{ daily_apy: number, vaultAddress: string, timestamp: string }]}
   * yAccessor={(point: DataPoint) => point.daily_apy}
   * />
   *
   * In the above example, the yAccessor informs the graph that we'd like to extract the daily_apy values and use them as the data points.
   */
  yAccessor: Accessor<T, number>;
  titleAccessor?: Accessor<T, string>;
  defaultTitle: string;
  subtitleAccessor?: Accessor<T, string>;
  defaultSubtitle: string;
  onTimespanPressed?: (numDataPointsToDisplay: number) => void;
  graphOptions?: Partial<GraphOptions>;
}

/**
 * How the Graph Works:
 *
 * 1. The graph takes an array of number to serve as data points.
 * 2. Using the data points, the graph is divided into equal-width segments, one for each data point. This is done by dividing the chart width by the number of data points.
 * 3. Using the array of segments, we calculate the center of each segment. This is used for "snapping" with small datasets.
 *
 * This chart uses a snapping mechanism to feel more intuitive while dragging horizontally with small datasets.
 * The chart uses a snap threshold that provides some "give" before transitioning to the next data point.
 * This "give" is based on the distance from the center of a segment/data point.
 *
 * Legend:
 * - Segment Widths: The chart is divided into equal-width segments, one for each data point.
 * - Segment Centers: Each data point is associated with a center position within its segment to determine where snapping should occur.
 * - Snap Threshold: A portion of the segment width (e.g. 25%) that defines how far past a segment's boundary the cursor can go
 * before snapping to the next segment. Snapping is only enabled for small datasets since there isn't a need for snapping with large datasets.
 */

const InteractiveTimespanChart = <T extends DataPoint>({
  dataPoints,
  graphOptions,
  yAccessor,
  defaultTitle,
  defaultSubtitle,
  titleAccessor,
  subtitleAccessor,
  onTimespanPressed,
}: InteractiveTimespanChartProps<T>) => {
  const { styles } = useStyles(styleSheet, {});

  const {
    insetTop,
    insetRight,
    insetBottom,
    insetLeft,
    timespanButtons,
    color,
  } = {
    ...DEFAULT_GRAPH_OPTIONS,
    ...graphOptions,
  };

  const [dataPointsToShow, setDataPointsToShow] = useState(
    dataPoints.slice(-timespanButtons[0].value),
  );

  /**
   * Parse the dataPoints using accessor props to create array of values, titles, and subtitles.
   * - values array: The point on the graph.
   * - titles array: The available titles for each point on the graph for use in the GraphTooltip.
   * - subtitles array: The available subtitles for each point on the graph for use in the GraphTooltip.
   *
   * When a user selects a point on the graph, the index of this point is used to select the correct value, title, and subtitle.
   *
   */
  const { parsedDataPointValues, parsedSubtitleValues, parsedTitleValues } =
    useMemo(() => {
      const values: number[] = [];
      const titles: string[] = [];
      const subtitles: string[] = [];

      dataPointsToShow.forEach((point) => {
        values.push(yAccessor(point));
        if (titleAccessor) {
          titles.push(titleAccessor(point));
        }
        if (subtitleAccessor) {
          subtitles.push(subtitleAccessor(point));
        }
      });

      return {
        parsedDataPointValues: values,
        parsedTitleValues: titles,
        parsedSubtitleValues: subtitles,
      };
    }, [dataPointsToShow, subtitleAccessor, titleAccessor, yAccessor]);

  const [selectedPointIndex, setSelectedPointIndex] = useState(-1);

  const doesChartHaveData = useMemo(
    () => dataPointsToShow.length > 0,
    [dataPointsToShow],
  );

  const chartWidth = Dimensions.get('window').width;

  const chartSegmentWidth = useMemo(() => {
    const calculatedSegmentWidth = chartWidth / dataPointsToShow.length;
    return parseFloat(calculatedSegmentWidth.toFixed(6));
  }, [chartWidth, dataPointsToShow.length]);

  const segmentCenters = useMemo(
    () => calculateSegmentCenters(parsedDataPointValues, chartSegmentWidth),
    [chartSegmentWidth, parsedDataPointValues],
  );

  const handleTimespanPressed = (numDataPointsToDisplay: number) => {
    setDataPointsToShow(dataPoints.slice(-numDataPointsToDisplay));
    // Remove graph selection when switching between timespans.
    setSelectedPointIndex(-1);
    onTimespanPressed?.(numDataPointsToDisplay);
  };

  // Determines when the cursor should "snap" (or jump) to the next point.
  const snapThreshold = useMemo(
    () =>
      chartSegmentWidth *
      // We only enable snapping for small datasets.
      (dataPointsToShow.length <= SMALL_DATASET_THRESHOLD
        ? SMALL_DATASET_SNAP_RATIO
        : 0),
    [dataPointsToShow.length, chartSegmentWidth],
  );

  const updateSelectedGraphPosition = useCallback(
    (x: number) => {
      // Deselect point when finger raised
      if (x === -1) {
        setSelectedPointIndex(-1);
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

      /**
       * Ensure that small datasets respect snap threshold
       * Larger datasets can always update.
       */
      if (
        minDistance <= snapThreshold ||
        dataPointsToShow.length > SMALL_DATASET_THRESHOLD
      ) {
        setSelectedPointIndex(closestIndex);
      }
    },
    [dataPointsToShow.length, segmentCenters, snapThreshold],
  );

  /**
   * PanResponder captures the dragging on the graph
   * src: https://reactnative.dev/docs/panresponder
   */
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderTerminationRequest: () => true,
        onPanResponderGrant: (evt: GestureResponderEvent) => {
          updateSelectedGraphPosition(evt.nativeEvent.locationX);
        },
        onPanResponderMove: (evt: GestureResponderEvent) => {
          updateSelectedGraphPosition(evt.nativeEvent.locationX);
        },
        onPanResponderRelease: () => {
          updateSelectedGraphPosition(-1);
        },
      }),
    [updateSelectedGraphPosition],
  );

  return (
    <View>
      <ChartTimespanButtonGroup
        buttons={timespanButtons}
        onTimePress={handleTimespanPressed}
      />
      {Boolean(parsedDataPointValues.length) && (
        <GraphTooltip
          title={parsedTitleValues[selectedPointIndex] ?? defaultTitle}
          subtitle={parsedSubtitleValues[selectedPointIndex] ?? defaultSubtitle}
          color={color}
        />
      )}
      <View style={styles.chartContainer} {...panResponder.panHandlers}>
        <AreaChart
          style={styles.chart}
          data={parsedDataPointValues}
          contentInset={{
            top: insetTop,
            right: insetRight,
            bottom: insetBottom,
            left: insetLeft,
          }}
          svg={doesChartHaveData ? { fill: `url(#dataGradient)` } : undefined}
          yMin={0}
        >
          <PlotLine doesChartHaveData color={color} />
          {doesChartHaveData && (
            <DataGradient dataPoints={parsedDataPointValues} color={color} />
          )}
          <GraphCursor
            currentX={selectedPointIndex}
            data={parsedDataPointValues}
            color={color}
          />
        </AreaChart>
      </View>
    </View>
  );
};

export default InteractiveTimespanChart;
