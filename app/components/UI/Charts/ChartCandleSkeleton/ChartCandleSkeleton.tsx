import React, { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { Box } from '@metamask/design-system-react-native';
import { hasTestOverrides } from '../../../../util/test/utils';
import { getHardwareTier } from '../../../../util/deviceCapability';
import type { ChartCandleSkeletonProps } from './ChartCandleSkeleton.types';

/** Price-pane pixel basis. Mark tops/heights are a percentage of this pane. */
const PRICE_PANE_HEIGHT = 250;
/** Volume-bar pixel basis. Bar height is this share of the volume band. */
const VOLUME_PANE_HEIGHT = 68;
/** Share of the price+volume wrapper. Matches VOLUME_RATIO in the volume study. */
const VOLUME_BAND_RATIO = '22%' as const;
/** Floor for the volume band. Matches MIN_VOLUME_PX in the volume study. */
const MIN_VOLUME_PX = 56;
const TIME_PANE_HEIGHT = 32;

/** Same opacity range and step as the design-system Skeleton pulse. */
const PULSE_MAX_OPACITY = 0.2;
const PULSE_MIN_OPACITY = 0.1;
const PULSE_STEP_MS = 700;
/** Jest and E2E builds keep the pulse still, like the design-system Skeleton wrapper. */
const PULSE_AUTO_PLAY = !hasTestOverrides && !process.env.JEST_WORKER_ID;

const MARK_CLASS = 'rounded bg-icon-alternative';

const percentOf = (part: number, whole: number): `${number}%` => {
  const rounded = Math.round((part / whole) * 100 * 1e6) / 1e6;
  return `${rounded}%` as `${number}%`;
};

/** Right price-scale column. */
const AXIS_WIDTH = 66;
const BODY_WIDTH = 4;
const WICK_WIDTH = 1;
const Y_PILL_WIDTH = 44;
const Y_PILL_HEIGHT = 10;
const X_PILL_WIDTH = 28;
const X_PILL_HEIGHT = 8;

const HORIZONTAL_GRID: readonly { lineTop: number; pillTop: number }[] = [
  { lineTop: 16, pillTop: 11 },
  { lineTop: 60, pillTop: 55 },
  { lineTop: 104, pillTop: 99 },
  { lineTop: 148, pillTop: 143 },
  { lineTop: 192, pillTop: 187 },
  { lineTop: 236, pillTop: 231 },
];

const VERTICAL_GRID = [0, 1, 2, 3] as const;
const TIME_PILLS = [0, 1, 2, 3, 4, 5] as const;

const layout = StyleSheet.create({
  panes: { flex: 1 },
  pricePane: { flex: 1, overflow: 'hidden' },
  plot: { flex: 1, height: '100%' },
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  flex1: { flex: 1 },
  verticalGrid: { width: 1, height: '100%' },
  candleSlot: { height: '100%' },
  candleColumn: { width: BODY_WIDTH, height: '100%' },
  yAxis: { width: AXIS_WIDTH, height: '100%' },
  volumeBand: {
    height: VOLUME_BAND_RATIO,
    minHeight: MIN_VOLUME_PX,
    flexShrink: 0,
  },
  volumeTrack: { flex: 1, height: '100%' },
  volumeSlot: { height: '100%' },
  axisSpacer: { width: AXIS_WIDTH, height: '100%' },
  timeAxis: { height: TIME_PANE_HEIGHT, flexShrink: 0 },
  timeTrack: { flex: 1, height: TIME_PANE_HEIGHT },
  timeSpacer: { width: AXIS_WIDTH, height: TIME_PANE_HEIGHT },
  xPill: { width: X_PILL_WIDTH, height: X_PILL_HEIGHT },
});

const gridStyles = HORIZONTAL_GRID.map((line) =>
  StyleSheet.create({
    line: {
      position: 'absolute',
      top: percentOf(line.lineTop, PRICE_PANE_HEIGHT),
      left: 0,
      right: 0,
      height: 1,
    },
    pill: {
      position: 'absolute',
      top: percentOf(line.pillTop, PRICE_PANE_HEIGHT),
      right: 8,
      width: Y_PILL_WIDTH,
      height: Y_PILL_HEIGHT,
    },
  }),
);

/** [bodyTop, bodyHeight, wickTop, wickHeight, volumeHeight] px of the 250/68 panes. */
const CANDLE_PX = [
  [87, 27, 83, 35, 12],
  [96, 30, 77, 65, 17],
  [106, 29, 90, 55, 13],
  [125, 30, 99, 87, 32],
  [139, 30, 123, 66, 14],
  [149, 30, 132, 64, 19],
  [163, 29, 153, 46, 13],
  [124, 30, 99, 74, 17],
  [113, 4, 106, 23, 8],
  [81, 30, 64, 66, 14],
  [81, 30, 73, 45, 14],
  [71, 30, 48, 73, 19],
  [41, 17, 25, 42, 20],
  [49, 30, 34, 66, 16],
  [66, 21, 53, 50, 11],
  [86, 30, 62, 77, 22],
  [145, 30, 126, 65, 17],
  [154, 29, 139, 55, 13],
  [167, 30, 148, 74, 29],
  [184, 25, 171, 54, 12],
  [139, 30, 121, 66, 19],
  [125, 29, 115, 46, 13],
  [115, 30, 90, 74, 17],
  [71, 30, 59, 59, 15],
  [66, 29, 53, 58, 13],
  [53, 30, 37, 62, 29],
  [44, 30, 31, 52, 14],
  [91, 30, 61, 84, 19],
  [114, 21, 108, 41, 11],
  [113, 4, 100, 32, 8],
  [115, 30, 111, 39, 13],
  [108, 30, 90, 63, 16],
] as const;

const CANDLES = CANDLE_PX.map(
  ([bodyTop, bodyHeight, wickTop, wickHeight, volumeHeight]) => ({
    bodyTop,
    bodyHeight,
    wickTop,
    wickHeight,
    volumeHeight,
  }),
);

const candleMarks = CANDLES.map((candle) =>
  StyleSheet.create({
    wick: {
      position: 'absolute',
      top: percentOf(candle.wickTop, PRICE_PANE_HEIGHT),
      width: WICK_WIDTH,
      height: percentOf(candle.wickHeight, PRICE_PANE_HEIGHT),
    },
    body: {
      position: 'absolute',
      top: percentOf(candle.bodyTop, PRICE_PANE_HEIGHT),
      width: BODY_WIDTH,
      height: percentOf(candle.bodyHeight, PRICE_PANE_HEIGHT),
    },
    volume: {
      width: BODY_WIDTH,
      height: percentOf(candle.volumeHeight, VOLUME_PANE_HEIGHT),
    },
  }),
);

interface ChartFrameProps {
  testID?: string;
  plot: ReactNode;
  yAxis?: ReactNode;
  volume?: ReactNode;
  time?: ReactNode;
}

/** Price/volume panes over the time row. The grid and the marks share this frame. */
const ChartFrame = ({ testID, plot, yAxis, volume, time }: ChartFrameProps) => (
  <>
    <Box testID={testID && `${testID}-panes`} style={layout.panes}>
      <Box
        testID={testID && `${testID}-price`}
        twClassName="flex-row"
        style={layout.pricePane}
      >
        <Box style={layout.plot}>{plot}</Box>
        <Box testID={testID && `${testID}-y-axis`} style={layout.yAxis}>
          {yAxis}
        </Box>
      </Box>
      <Box
        testID={testID && `${testID}-volume-band`}
        twClassName="flex-row items-end"
        style={layout.volumeBand}
      >
        <Box twClassName="flex-row items-end" style={layout.volumeTrack}>
          {volume}
        </Box>
        <Box style={layout.axisSpacer} />
      </Box>
    </Box>
    <Box
      testID={testID && `${testID}-time-axis`}
      twClassName="flex-row items-center"
      style={layout.timeAxis}
    >
      <Box twClassName="flex-row items-center" style={layout.timeTrack}>
        {time}
      </Box>
      <Box style={layout.timeSpacer} />
    </Box>
  </>
);

/** Candle-chart placeholder. Price flexes, volume is 22% of that wrapper, time row is 32px. */
const ChartCandleSkeleton = ({
  height,
  testID = 'chart-candle-skeleton',
}: ChartCandleSkeletonProps) => {
  const [canAnimate] = useState(() => getHardwareTier() !== 'LOW');
  const opacity = useRef(new Animated.Value(PULSE_MAX_OPACITY)).current;

  useEffect(() => {
    if (!canAnimate || !PULSE_AUTO_PLAY) {
      return undefined;
    }
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: PULSE_MIN_OPACITY,
          duration: PULSE_STEP_MS,
          useNativeDriver: true,
          isInteraction: false,
        }),
        Animated.timing(opacity, {
          toValue: PULSE_MAX_OPACITY,
          duration: PULSE_STEP_MS,
          useNativeDriver: true,
          isInteraction: false,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [canAnimate, opacity]);

  return (
    <Box
      testID={testID}
      twClassName="w-full flex-1 overflow-hidden bg-default"
      style={{ height }}
    >
      <Box style={layout.fill}>
        <ChartFrame
          plot={
            <>
              {gridStyles.map((grid, index) => (
                <Box
                  key={`grid-h-${index}`}
                  testID={`${testID}-grid-h-${index}`}
                  twClassName="bg-border-muted"
                  style={grid.line}
                />
              ))}
              <Box twClassName="flex-row" style={layout.fill}>
                <Box style={layout.flex1} />
                {VERTICAL_GRID.map((index) => (
                  <Box
                    key={`grid-v-slot-${index}`}
                    twClassName="flex-row"
                    style={layout.flex1}
                  >
                    <Box
                      testID={`${testID}-grid-v-${index}`}
                      twClassName="bg-border-muted"
                      style={layout.verticalGrid}
                    />
                    <Box style={layout.flex1} />
                  </Box>
                ))}
              </Box>
            </>
          }
        />
      </Box>
      <Animated.View
        testID={canAnimate ? `${testID}-pulse` : `${testID}-static`}
        pointerEvents="none"
        style={[layout.fill, { opacity }]}
      >
        <ChartFrame
          testID={testID}
          plot={
            <Box twClassName="flex-row" style={layout.fill}>
              {candleMarks.map((mark, index) => (
                <Box
                  key={`candle-slot-${index}`}
                  twClassName="flex-1 items-center"
                  style={layout.candleSlot}
                >
                  <Box twClassName="items-center" style={layout.candleColumn}>
                    <Box
                      testID={`${testID}-wick-${index}`}
                      twClassName={MARK_CLASS}
                      style={mark.wick}
                    />
                    <Box
                      testID={`${testID}-candle-${index}`}
                      twClassName={MARK_CLASS}
                      style={mark.body}
                    />
                  </Box>
                </Box>
              ))}
            </Box>
          }
          yAxis={gridStyles.map((grid, index) => (
            <Box
              key={`y-pill-${index}`}
              testID={`${testID}-y-pill-${index}`}
              twClassName={MARK_CLASS}
              style={grid.pill}
            />
          ))}
          volume={candleMarks.map((mark, index) => (
            <Box
              key={`volume-slot-${index}`}
              twClassName="flex-1 items-center justify-end"
              style={layout.volumeSlot}
            >
              <Box
                testID={`${testID}-volume-${index}`}
                twClassName={MARK_CLASS}
                style={mark.volume}
              />
            </Box>
          ))}
          time={TIME_PILLS.map((index) => (
            <Box key={`x-pill-slot-${index}`} twClassName="flex-1 items-center">
              <Box
                testID={`${testID}-x-pill-${index}`}
                twClassName={MARK_CLASS}
                style={layout.xPill}
              />
            </Box>
          ))}
        />
      </Animated.View>
    </Box>
  );
};

export default ChartCandleSkeleton;
