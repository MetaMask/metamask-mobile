import React, { useId, useMemo, useState } from 'react';
import {
  PanResponder,
  StyleSheet,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import Svg, {
  ClipPath,
  Defs,
  G,
  LinearGradient,
  Line,
  Mask,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import I18n from '../../../../../../../locales/i18n';
import { getIntlDateTimeFormatter } from '../../../../../../util/intl';
import { useTheme } from '../../../../../../util/theme';
import { roundProbabilityToWhole } from '../../../utils/formatProbability';
import {
  CHART_PLOT_TOP,
  createChartModel,
  getScaledChartLayout,
  getScrubAtX,
  getScrubTimeLabelPosition,
  type ChartPoint,
  type ChartSeries,
} from './chartModel';
import { ChartPulse } from './chartPulse';

export const PREDICT_MARKET_CHART_HEIGHT = 150;
const DEFAULT_LABEL_GUTTER = 0;
const DEFAULT_CONTINUATION_WIDTH = 0;
const LABEL_NAME_BASELINE_OFFSET = -5;
const LABEL_VALUE_BASELINE_OFFSET = 24;
const SCRUB_TIME_BOTTOM_INSET = 4;
const SCRUB_RIGHT_OPACITY = 0.3;

const styles = StyleSheet.create({
  container: { width: '100%', overflow: 'hidden' },
});

export type PredictMarketChartPoint = ChartPoint;
export type PredictMarketChartSeries = ChartSeries;

interface PredictMarketChartProps {
  series: readonly PredictMarketChartSeries[];
  height?: number;
  labelGutter?: number;
  continuationWidth?: number;
  lineWidth?: number;
  fillOpacity?: number;
  formatValue?: (value: number) => string;
  formatTime?: (time: number) => string;
  testID?: string;
}

const getGradientId = (prefix: string, seriesId: string, index: number) =>
  `${prefix}-gradient-${index}-${seriesId.replace(/[^a-zA-Z0-9_-]/g, '')}`;

/** Renders caller-owned probability series without choosing product data. */
export const PredictMarketChart = ({
  series,
  height = PREDICT_MARKET_CHART_HEIGHT,
  labelGutter = DEFAULT_LABEL_GUTTER,
  continuationWidth = DEFAULT_CONTINUATION_WIDTH,
  lineWidth = 2,
  fillOpacity = 0.16,
  formatValue = (value) => `${roundProbabilityToWhole(value)}%`,
  formatTime = (time) =>
    getIntlDateTimeFormatter(I18n.locale, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(time)),
  testID = 'predict-market-chart',
}: PredictMarketChartProps) => {
  const { colors } = useTheme();
  const { fontScale } = useWindowDimensions();
  const [width, setWidth] = useState(0);
  const [scrub, setScrub] = useState<{ time: number; x: number }>();
  const idPrefix = useId().replace(/:/g, '');
  const layout = getScaledChartLayout({
    height,
    labelGutter,
    fontScale,
    labels: series.map((entry) => entry.label),
    values: series.flatMap((entry) => {
      const value = entry.data[entry.data.length - 1]?.value;
      return value === undefined ? [] : [formatValue(value)];
    }),
  });
  const model = createChartModel({
    series,
    width,
    height: layout.height,
    labelGutter: layout.labelGutter,
    continuationWidth,
    lineWidth,
    fontScale: layout.fontScale,
    scrub,
  });

  const plotRight = model?.plotRight;
  const minTime = model?.timeDomain[0];
  const maxTime = model?.timeDomain[1];
  const panResponder = useMemo(() => {
    const updateScrub = (xCoord: number) => {
      if (
        plotRight === undefined ||
        minTime === undefined ||
        maxTime === undefined
      ) {
        return;
      }
      setScrub(
        getScrubAtX({
          xCoord,
          plotRight,
          continuationWidth,
          timeDomain: [minTime, maxTime],
        }),
      );
    };
    const clearScrub = () => setScrub(undefined);

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_event, gestureState) =>
        Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
      onMoveShouldSetPanResponderCapture: (_event, gestureState) =>
        Math.abs(gestureState.dx) > Math.abs(gestureState.dy) &&
        Math.abs(gestureState.dx) > 5,
      onPanResponderTerminationRequest: (_event, gestureState) =>
        Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
      onPanResponderGrant: (event) => updateScrub(event.nativeEvent.locationX),
      onPanResponderMove: (event, gestureState) => {
        if (
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx) &&
          Math.abs(gestureState.dy) > 10
        ) {
          clearScrub();
        } else {
          updateScrub(event.nativeEvent.locationX);
        }
      },
      onPanResponderRelease: clearScrub,
      onPanResponderTerminate: clearScrub,
    });
  }, [continuationWidth, maxTime, minTime, plotRight]);

  const handleLayout = (event: LayoutChangeEvent) =>
    setWidth(event.nativeEvent.layout.width);
  const accessibilityValues =
    model?.displayedSeries
      .map((entry) => `${entry.label} ${formatValue(entry.endpoint.value)}`)
      .join(', ') ?? '';
  const clipId = `${idPrefix}-plot-clip`;
  const fadeId = `${idPrefix}-edge-fade`;
  const fadeMaskId = `${idPrefix}-edge-fade-mask`;
  const scrubLeftId = `${idPrefix}-scrub-left-clip`;
  const scrubRightId = `${idPrefix}-scrub-right-clip`;
  const scrubTime = scrub ? formatTime(scrub.time) : '';
  const scrubTimePosition =
    scrub && model
      ? getScrubTimeLabelPosition({
          x: scrub.x,
          plotRight: model.plotRight,
          text: scrubTime,
          fontSize: 13 * layout.fontScale,
        })
      : undefined;

  const renderSeries = (
    clipPath?: string,
    opacity?: number,
    groupTestID?: string,
  ) => (
    <G
      clipPath={clipPath ?? `url(#${clipId})`}
      mask={`url(#${fadeMaskId})`}
      opacity={opacity}
      testID={groupTestID}
    >
      {model?.series.map((entry, index) => (
        <Path
          key={`area-${entry.id}`}
          d={entry.areaPath}
          fill={`url(#${getGradientId(idPrefix, entry.id, index)})`}
        />
      ))}
      {model?.series.map((entry) => (
        <Path
          key={`line-${entry.id}`}
          d={entry.linePath}
          fill="none"
          stroke={entry.color}
          strokeWidth={lineWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          testID={clipPath ? undefined : `${testID}-line-${entry.id}`}
        />
      ))}
    </G>
  );

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={
        scrub
          ? `Market probability history at ${scrubTime}. ${accessibilityValues}`
          : `Market probability history. ${accessibilityValues}`
      }
      onLayout={handleLayout}
      style={[styles.container, { height: layout.height }]}
      testID={testID}
      {...panResponder.panHandlers}
    >
      {model ? (
        <Svg
          width={width}
          height={layout.height}
          viewBox={`0 0 ${width} ${layout.height}`}
        >
          <Defs>
            <ClipPath id={clipId}>
              <Rect width={model.plotRight} height={layout.height} />
            </ClipPath>
            <LinearGradient id={fadeId} x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="white" stopOpacity={0} />
              <Stop offset="14%" stopColor="white" stopOpacity={1} />
              <Stop offset="100%" stopColor="white" stopOpacity={1} />
            </LinearGradient>
            <Mask id={fadeMaskId}>
              <Rect
                width={model.plotRight}
                height={layout.height}
                fill={`url(#${fadeId})`}
              />
            </Mask>
            {scrub ? (
              <>
                <ClipPath id={scrubLeftId}>
                  <Rect width={scrub.x} height={layout.height} />
                </ClipPath>
                <ClipPath id={scrubRightId}>
                  <Rect
                    width={Math.max(0, model.plotRight - scrub.x)}
                    height={layout.height}
                    transform={[{ translateX: scrub.x }]}
                  />
                </ClipPath>
              </>
            ) : null}
            {model.series.map((entry, index) => (
              <LinearGradient
                key={`gradient-${entry.id}`}
                id={getGradientId(idPrefix, entry.id, index)}
                x1="0%"
                y1="0%"
                x2="0%"
                y2="100%"
              >
                <Stop
                  offset="0%"
                  stopColor={entry.color}
                  stopOpacity={fillOpacity}
                />
                <Stop offset="100%" stopColor={entry.color} stopOpacity={0} />
              </LinearGradient>
            ))}
          </Defs>

          {scrub ? (
            <>
              {renderSeries(`url(#${scrubLeftId})`)}
              {renderSeries(
                `url(#${scrubRightId})`,
                SCRUB_RIGHT_OPACITY,
                `${testID}-scrub-future`,
              )}
            </>
          ) : (
            renderSeries()
          )}

          {scrub && scrubTimePosition ? (
            <G>
              <Line
                x1={scrub.x}
                x2={scrub.x}
                y1={CHART_PLOT_TOP}
                y2={layout.height - 28 * layout.fontScale}
                stroke={colors.border.muted}
                strokeWidth={1}
              />
              <SvgText
                fill={colors.text.muted}
                fontSize={13 * layout.fontScale}
                fontWeight="600"
                textAnchor={scrubTimePosition.textAnchor}
                transform={[
                  { translateX: scrubTimePosition.x },
                  {
                    translateY:
                      layout.height -
                      SCRUB_TIME_BOTTOM_INSET * layout.fontScale,
                  },
                ]}
                testID={`${testID}-scrub-time`}
              >
                {scrubTime}
              </SvgText>
            </G>
          ) : null}

          {model.displayedSeries.map((entry) => {
            const labelX = scrub
              ? Math.min(
                  model.plotRight + layout.endpointLabelGap,
                  entry.endpoint.x + layout.endpointLabelGap,
                )
              : model.plotRight + layout.endpointLabelGap;
            return (
              <G key={`endpoint-${entry.id}`}>
                <ChartPulse
                  x={entry.endpoint.x}
                  y={entry.endpoint.y}
                  color={entry.color}
                  backgroundColor={colors.background.default}
                  active={!scrub}
                  testID={`${testID}-endpoint-${entry.id}`}
                />
                <SvgText
                  fill={entry.color}
                  fontSize={14 * layout.fontScale}
                  fontWeight="600"
                  transform={[
                    { translateX: labelX },
                    {
                      translateY:
                        entry.endpoint.labelY +
                        LABEL_NAME_BASELINE_OFFSET * layout.fontScale,
                    },
                  ]}
                  testID={`${testID}-label-${entry.id}`}
                >
                  {entry.label}
                </SvgText>
                <SvgText
                  fill={entry.color}
                  fontSize={28 * layout.fontScale}
                  fontWeight="700"
                  transform={[
                    { translateX: labelX },
                    {
                      translateY:
                        entry.endpoint.labelY +
                        LABEL_VALUE_BASELINE_OFFSET * layout.fontScale,
                    },
                  ]}
                  testID={`${testID}-value-${entry.id}`}
                >
                  {formatValue(entry.endpoint.value)}
                </SvgText>
              </G>
            );
          })}
        </Svg>
      ) : null}
    </View>
  );
};
