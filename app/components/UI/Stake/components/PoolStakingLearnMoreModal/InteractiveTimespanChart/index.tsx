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
import styleSheet from './InteractiveTimespanChart.styles';
import { useStyles } from '../../../../../hooks/useStyles';
import {
  calculateSegmentCenters,
  calculateSnapThreshold,
  findClosestPointIndex,
} from './InteractiveTimespanChart.utils';
import GraphCursor from './GraphCursor';
import {
  DataPoint,
  Accessor,
  GraphOptions,
} from './InteractiveTimespanChart.types';
import GraphTooltip from './GraphTooltip';
import { DEFAULT_GRAPH_OPTIONS } from './InteractiveTimespanChart.constants';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';

export interface InteractiveTimespanChartProps<T extends DataPoint> {
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
   * In the above example, the yAccessor informs the graph that we'd like to extract
   * the daily_apy values and use them as the y-axis data points.
   */
  yAccessor?: Accessor<T, number>;
  titleAccessor?: Accessor<T, string>;
  defaultTitle?: string;
  subtitleAccessor?: Accessor<T, string>;
  defaultSubtitle?: string;
  onTimespanPressed?: (numDataPointsToDisplay: number) => void;
  graphOptions?: Partial<Omit<GraphOptions, 'color'>>;
  /**
   * The color used for the chart line, gradient, cursor, and tooltip title.
   */
  color: string;
  testID?: string;
  isLoading?: boolean;
}

/**
 * Interactive Graph Guide
 *
 * The graph takes an array of number or objects to serve as data points.
 *
 * When data points are of type number[]
 * 1. No need to define the yAccessor prop.
 * 2. Defining the titleAccessor property is recommended. This allows the title to update dynamically when a user selects a point.
 * If you just want to show the value you can use the following titleAccessor={(point) => point.toString()}
 *
 * When data points are of type object[]
 * 1. The yAccessor prop must be defined to tell the graph which object key to use for the y-axis values.
 * 2. Defining the titleAccessor property is recommended. This allows the title to update dynamically when a user selects a point.
 *
 * How the graph works
 * 1. Using the data points values, the graph is divided into equal-width segments, one for each data point. This is done by dividing the chart width by the number of data points.
 * 2. Using the array of segments, we calculate the center of each segment. This is used for "snapping" with small datasets.
 * A small dataset is one that has 10 or less data points. A dataset with more than 10 points is considered standard.
 *
 * Snapping Mechanism (small datasets only)
 * This chart uses a snapping mechanism to feel more intuitive while dragging horizontally with small datasets.
 * The chart uses a snap threshold that provides some "give" before transitioning to the next data point.
 * This "give" is based on the distance from the center of a segment/data point.
 */

export const INTERACTIVE_TIMESPAN_CHART_DEFAULT_TEST_ID =
  'InteractiveTimespanChart';

const InteractiveTimespanChart = <T extends DataPoint>({
  dataPoints,
  graphOptions,
  yAccessor,
  defaultTitle,
  defaultSubtitle,
  titleAccessor,
  subtitleAccessor,
  onTimespanPressed,
  color,
  testID = INTERACTIVE_TIMESPAN_CHART_DEFAULT_TEST_ID,
  isLoading = false,
}: InteractiveTimespanChartProps<T>) => {
  const { styles } = useStyles(styleSheet, {});

  const { insetTop, insetRight, insetBottom, insetLeft, timespanButtons } = {
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
        if (typeof point === 'number') {
          values.push(point);
        }

        if (typeof point === 'object' && yAccessor) {
          values.push(yAccessor?.(point));
        }

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
    () => calculateSnapThreshold(chartSegmentWidth, dataPointsToShow.length),
    [chartSegmentWidth, dataPointsToShow.length],
  );

  const updateSelectedGraphPosition = useCallback(
    (x: number) => {
      const newIndex = findClosestPointIndex(
        x,
        segmentCenters,
        snapThreshold,
        dataPointsToShow.length,
      );
      setSelectedPointIndex(newIndex);
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

  const renderChart = () => {
    if (isLoading) {
      return (
        <View style={styles.chartContainer}>
          <SkeletonPlaceholder>
            <SkeletonPlaceholder.Item height={112} />
          </SkeletonPlaceholder>
        </View>
      );
    }

    return (
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
    );
  };

  return (
    <View testID={testID}>
      <ChartTimespanButtonGroup
        buttons={timespanButtons}
        onPress={handleTimespanPressed}
        isLoading={isLoading}
      />
      {Boolean(parsedDataPointValues.length) && (
        <GraphTooltip
          title={parsedTitleValues[selectedPointIndex] ?? defaultTitle ?? ''}
          subtitle={
            parsedSubtitleValues[selectedPointIndex] ?? defaultSubtitle ?? ''
          }
          color={color}
          isLoading={isLoading}
        />
      )}
      {renderChart()}
    </View>
  );
};

export default InteractiveTimespanChart;
