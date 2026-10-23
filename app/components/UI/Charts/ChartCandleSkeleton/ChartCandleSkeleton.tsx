import React, { useState } from 'react';
import { Box } from '@metamask/design-system-react-native';
import { StyleSheet, type LayoutChangeEvent } from 'react-native';
import { Skeleton } from '../../../../component-library/components-temp/Skeleton';
import { useTheme } from '../../../../util/theme';
import {
  CHART_CANDLE_SKELETON_BODY_SLOT_RATIO,
  CHART_CANDLE_SKELETON_CANDLES,
  CHART_CANDLE_SKELETON_DEFAULT_HEIGHT,
  CHART_CANDLE_SKELETON_GRID_LINE_THICKNESS,
  CHART_CANDLE_SKELETON_HORIZONTAL_GRID_COUNT,
  CHART_CANDLE_SKELETON_PANE_SEPARATOR_HEIGHT,
  CHART_CANDLE_SKELETON_PILL_RADIUS,
  CHART_CANDLE_SKELETON_PRICE_PANE_RATIO,
  CHART_CANDLE_SKELETON_VERTICAL_GRID_COUNT,
  CHART_CANDLE_SKELETON_VOLUME_PANE_RATIO,
  CHART_CANDLE_SKELETON_WICK_WIDTH,
  CHART_CANDLE_SKELETON_X_AXIS_LABEL_COUNT,
  CHART_CANDLE_SKELETON_X_PILL_HEIGHT,
  CHART_CANDLE_SKELETON_X_PILL_WIDTH,
  CHART_CANDLE_SKELETON_Y_AXIS_WIDTH,
  CHART_CANDLE_SKELETON_Y_PILL_HEIGHT,
  CHART_CANDLE_SKELETON_Y_PILL_WIDTH,
} from './ChartCandleSkeleton.constants';
import type { ChartCandleSkeletonProps } from './ChartCandleSkeleton.types';

const DEFAULT_TEST_ID = 'chart-candle-skeleton';

const styles = StyleSheet.create({
  absolute: { position: 'absolute' },
  absoluteLeft: { position: 'absolute', left: 0 },
  absoluteTop: { position: 'absolute', top: 0 },
  absoluteRight: { position: 'absolute', right: 0 },
  absoluteBottom: { position: 'absolute', bottom: 0 },
  pill: { borderRadius: CHART_CANDLE_SKELETON_PILL_RADIUS },
});

const splitPaneHeights = (height: number) => {
  const inner = Math.max(
    0,
    height - CHART_CANDLE_SKELETON_PANE_SEPARATOR_HEIGHT,
  );
  const priceHeight = Math.round(
    inner * CHART_CANDLE_SKELETON_PRICE_PANE_RATIO,
  );
  const volumeHeight = Math.round(
    inner * CHART_CANDLE_SKELETON_VOLUME_PANE_RATIO,
  );
  const axisHeight = Math.max(0, inner - priceHeight - volumeHeight);

  return { priceHeight, volumeHeight, axisHeight };
};

/**
 * Candle-chart loading placeholder. Grid lines are static. Candle bodies,
 * wicks, volume bars, and axis pills are the design-system Skeleton.
 */
const ChartCandleSkeleton = ({
  height = CHART_CANDLE_SKELETON_DEFAULT_HEIGHT,
  testID = DEFAULT_TEST_ID,
}: ChartCandleSkeletonProps) => {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);

  const handleLayout = (event: LayoutChangeEvent) => {
    const nextWidth = event.nativeEvent.layout.width;
    setWidth((current) => (current === nextWidth ? current : nextWidth));
  };

  const { priceHeight, volumeHeight, axisHeight } = splitPaneHeights(height);
  const plotWidth = Math.max(0, width - CHART_CANDLE_SKELETON_Y_AXIS_WIDTH);
  const slotWidth =
    plotWidth > 0 ? plotWidth / CHART_CANDLE_SKELETON_CANDLES.length : 0;
  const bodyWidth = slotWidth * CHART_CANDLE_SKELETON_BODY_SLOT_RATIO;
  const gridColor = colors.border.muted;
  const lastHorizontalGridIndex =
    CHART_CANDLE_SKELETON_HORIZONTAL_GRID_COUNT - 1;
  const horizontalGridTops = Array.from(
    { length: CHART_CANDLE_SKELETON_HORIZONTAL_GRID_COUNT },
    (_, index) => {
      const raw = (priceHeight * index) / lastHorizontalGridIndex;
      return Math.min(
        raw,
        Math.max(0, priceHeight - CHART_CANDLE_SKELETON_GRID_LINE_THICKNESS),
      );
    },
  );

  return (
    <Box
      testID={testID}
      onLayout={handleLayout}
      twClassName="w-full overflow-hidden"
      style={{
        height,
        backgroundColor: colors.background.default,
      }}
    >
      <Box style={{ height: priceHeight }}>
        {horizontalGridTops.map((top, index) => (
          <Box
            key={`h-grid-${index}`}
            style={[
              styles.absoluteLeft,
              {
                top,
                width: plotWidth,
                height: CHART_CANDLE_SKELETON_GRID_LINE_THICKNESS,
                backgroundColor: gridColor,
              },
            ]}
          />
        ))}
        {Array.from(
          { length: CHART_CANDLE_SKELETON_VERTICAL_GRID_COUNT },
          (_, index) => {
            const left =
              plotWidth > 0
                ? (plotWidth * (index + 1)) /
                  (CHART_CANDLE_SKELETON_VERTICAL_GRID_COUNT + 1)
                : 0;
            return (
              <Box
                key={`v-grid-${index}`}
                style={[
                  styles.absoluteTop,
                  {
                    left,
                    width: CHART_CANDLE_SKELETON_GRID_LINE_THICKNESS,
                    height: priceHeight,
                    backgroundColor: gridColor,
                  },
                ]}
              />
            );
          },
        )}
        {CHART_CANDLE_SKELETON_CANDLES.map((candle, index) => {
          const slotLeft = index * slotWidth;
          return (
            <React.Fragment key={`candle-${index}`}>
              <Skeleton
                testID={`${testID}-wick-${index}`}
                width={CHART_CANDLE_SKELETON_WICK_WIDTH}
                height={candle.wickHeight * priceHeight}
                style={[
                  styles.absolute,
                  {
                    left:
                      slotLeft +
                      slotWidth / 2 -
                      CHART_CANDLE_SKELETON_WICK_WIDTH / 2,
                    top: candle.wickTop * priceHeight,
                  },
                ]}
              />
              <Skeleton
                testID={`${testID}-candle-${index}`}
                width={bodyWidth}
                height={candle.bodyHeight * priceHeight}
                style={[
                  styles.absolute,
                  {
                    left: slotLeft + (slotWidth - bodyWidth) / 2,
                    top: candle.bodyTop * priceHeight,
                  },
                ]}
              />
            </React.Fragment>
          );
        })}
        {horizontalGridTops.map((top, index) => (
          <Skeleton
            key={`y-pill-${index}`}
            testID={`${testID}-y-pill-${index}`}
            width={CHART_CANDLE_SKELETON_Y_PILL_WIDTH}
            height={CHART_CANDLE_SKELETON_Y_PILL_HEIGHT}
            style={[
              styles.absoluteRight,
              styles.pill,
              {
                top: Math.min(
                  Math.max(0, top - CHART_CANDLE_SKELETON_Y_PILL_HEIGHT / 2),
                  Math.max(
                    0,
                    priceHeight - CHART_CANDLE_SKELETON_Y_PILL_HEIGHT,
                  ),
                ),
              },
            ]}
          />
        ))}
      </Box>

      <Box
        style={{
          height: CHART_CANDLE_SKELETON_PANE_SEPARATOR_HEIGHT,
          backgroundColor: gridColor,
        }}
      />

      <Box style={{ height: volumeHeight }}>
        {CHART_CANDLE_SKELETON_CANDLES.map((candle, index) => (
          <Skeleton
            key={`volume-${index}`}
            testID={`${testID}-volume-${index}`}
            width={bodyWidth}
            height={volumeHeight * candle.volume}
            style={[
              styles.absoluteBottom,
              { left: index * slotWidth + (slotWidth - bodyWidth) / 2 },
            ]}
          />
        ))}
        <Skeleton
          testID={`${testID}-volume-pill`}
          width={CHART_CANDLE_SKELETON_Y_PILL_WIDTH}
          height={CHART_CANDLE_SKELETON_Y_PILL_HEIGHT}
          style={[
            styles.absoluteRight,
            styles.pill,
            {
              top: Math.max(
                0,
                volumeHeight / 2 - CHART_CANDLE_SKELETON_Y_PILL_HEIGHT / 2,
              ),
            },
          ]}
        />
      </Box>

      <Box style={{ height: axisHeight }}>
        {Array.from(
          { length: CHART_CANDLE_SKELETON_X_AXIS_LABEL_COUNT },
          (_, index) => {
            const segment =
              plotWidth > 0
                ? plotWidth / CHART_CANDLE_SKELETON_X_AXIS_LABEL_COUNT
                : 0;
            return (
              <Skeleton
                key={`x-pill-${index}`}
                testID={`${testID}-x-pill-${index}`}
                width={CHART_CANDLE_SKELETON_X_PILL_WIDTH}
                height={CHART_CANDLE_SKELETON_X_PILL_HEIGHT}
                style={[
                  styles.absolute,
                  styles.pill,
                  {
                    left: Math.max(
                      0,
                      segment * index +
                        segment / 2 -
                        CHART_CANDLE_SKELETON_X_PILL_WIDTH / 2,
                    ),
                    top: Math.max(
                      0,
                      axisHeight / 2 - CHART_CANDLE_SKELETON_X_PILL_HEIGHT / 2,
                    ),
                  },
                ]}
              />
            );
          },
        )}
      </Box>
    </Box>
  );
};

export default ChartCandleSkeleton;
