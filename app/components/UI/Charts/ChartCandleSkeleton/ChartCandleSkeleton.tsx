import React from 'react';
import { Box } from '@metamask/design-system-react-native';
import { Skeleton } from '../../../../component-library/components-temp/Skeleton';
import { useTheme } from '../../../../util/theme';
import type { ChartCandleSkeletonProps } from './ChartCandleSkeleton.types';

/**
 * Default box height. Same value as
 * `PERPS_CHART_CONFIG.LAYOUT.DETAIL_VIEW_HEIGHT`. Callers pass the chart
 * height; this default keeps an omitted height aligned with the market-details
 * chart. UI/Charts does not import Perps.
 *
 * The root also uses `flex: 1`. A sized parent (chart overlay) wins, so the
 * skeleton fills that box. An unsized parent keeps this height, so the 350px
 * detail chart does not collapse.
 */
const DEFAULT_CHART_HEIGHT = 350;

/**
 * Pixel basis of the price plot at {@link DEFAULT_CHART_HEIGHT}. Marks are
 * stored in these pixels and rendered as a percentage of the pane, so a 350px
 * root (volume band + 32px time row) still lands on the same pixels.
 */
const PRICE_PANE_HEIGHT = 250;
/**
 * Volume band at {@link DEFAULT_CHART_HEIGHT}. 68/350 of the root, which is
 * 68/(350-32) ≈ 21% of the panes above the time row — the loaded chart's
 * ~20–22% volume band.
 */
const VOLUME_PANE_HEIGHT = 68;
/** Time-axis row. Stays 32px at every chart height. */
const TIME_PANE_HEIGHT = 32;

/**
 * Share of `part` within `whole`, as a Yoga percentage length.
 * Six decimal places drops binary float noise and still lands on the source pixel.
 */
const percentOf = (part: number, whole: number): `${number}%` => {
  const rounded = Math.round((part / whole) * 100 * 1e6) / 1e6;
  return `${rounded}%` as `${number}%`;
};

/** Volume row height. At 350px this is still {@link VOLUME_PANE_HEIGHT}. */
const VOLUME_PANE_PERCENT = percentOf(VOLUME_PANE_HEIGHT, DEFAULT_CHART_HEIGHT);
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

interface CandleMark {
  bodyTop: number;
  bodyHeight: number;
  wickTop: number;
  wickHeight: number;
  volumeHeight: number;
}

/**
 * 32 candle marks. Tops and heights are pixels of the 250px price pane (volume
 * heights are pixels of the 68px band). Render converts them to percentages of
 * those panes.
 */
const CANDLES: readonly CandleMark[] = [
  {
    bodyTop: 87,
    bodyHeight: 27,
    wickTop: 83,
    wickHeight: 35,
    volumeHeight: 12,
  },
  {
    bodyTop: 96,
    bodyHeight: 30,
    wickTop: 77,
    wickHeight: 65,
    volumeHeight: 17,
  },
  {
    bodyTop: 106,
    bodyHeight: 29,
    wickTop: 90,
    wickHeight: 55,
    volumeHeight: 13,
  },
  {
    bodyTop: 125,
    bodyHeight: 30,
    wickTop: 99,
    wickHeight: 87,
    volumeHeight: 32,
  },
  {
    bodyTop: 139,
    bodyHeight: 30,
    wickTop: 123,
    wickHeight: 66,
    volumeHeight: 14,
  },
  {
    bodyTop: 149,
    bodyHeight: 30,
    wickTop: 132,
    wickHeight: 64,
    volumeHeight: 19,
  },
  {
    bodyTop: 163,
    bodyHeight: 29,
    wickTop: 153,
    wickHeight: 46,
    volumeHeight: 13,
  },
  {
    bodyTop: 124,
    bodyHeight: 30,
    wickTop: 99,
    wickHeight: 74,
    volumeHeight: 17,
  },
  {
    bodyTop: 113,
    bodyHeight: 4,
    wickTop: 106,
    wickHeight: 23,
    volumeHeight: 8,
  },
  {
    bodyTop: 81,
    bodyHeight: 30,
    wickTop: 64,
    wickHeight: 66,
    volumeHeight: 14,
  },
  {
    bodyTop: 81,
    bodyHeight: 30,
    wickTop: 73,
    wickHeight: 45,
    volumeHeight: 14,
  },
  {
    bodyTop: 71,
    bodyHeight: 30,
    wickTop: 48,
    wickHeight: 73,
    volumeHeight: 19,
  },
  {
    bodyTop: 41,
    bodyHeight: 17,
    wickTop: 25,
    wickHeight: 42,
    volumeHeight: 20,
  },
  {
    bodyTop: 49,
    bodyHeight: 30,
    wickTop: 34,
    wickHeight: 66,
    volumeHeight: 16,
  },
  {
    bodyTop: 66,
    bodyHeight: 21,
    wickTop: 53,
    wickHeight: 50,
    volumeHeight: 11,
  },
  {
    bodyTop: 86,
    bodyHeight: 30,
    wickTop: 62,
    wickHeight: 77,
    volumeHeight: 22,
  },
  {
    bodyTop: 145,
    bodyHeight: 30,
    wickTop: 126,
    wickHeight: 65,
    volumeHeight: 17,
  },
  {
    bodyTop: 154,
    bodyHeight: 29,
    wickTop: 139,
    wickHeight: 55,
    volumeHeight: 13,
  },
  {
    bodyTop: 167,
    bodyHeight: 30,
    wickTop: 148,
    wickHeight: 74,
    volumeHeight: 29,
  },
  {
    bodyTop: 184,
    bodyHeight: 25,
    wickTop: 171,
    wickHeight: 54,
    volumeHeight: 12,
  },
  {
    bodyTop: 139,
    bodyHeight: 30,
    wickTop: 121,
    wickHeight: 66,
    volumeHeight: 19,
  },
  {
    bodyTop: 125,
    bodyHeight: 29,
    wickTop: 115,
    wickHeight: 46,
    volumeHeight: 13,
  },
  {
    bodyTop: 115,
    bodyHeight: 30,
    wickTop: 90,
    wickHeight: 74,
    volumeHeight: 17,
  },
  {
    bodyTop: 71,
    bodyHeight: 30,
    wickTop: 59,
    wickHeight: 59,
    volumeHeight: 15,
  },
  {
    bodyTop: 66,
    bodyHeight: 29,
    wickTop: 53,
    wickHeight: 58,
    volumeHeight: 13,
  },
  {
    bodyTop: 53,
    bodyHeight: 30,
    wickTop: 37,
    wickHeight: 62,
    volumeHeight: 29,
  },
  {
    bodyTop: 44,
    bodyHeight: 30,
    wickTop: 31,
    wickHeight: 52,
    volumeHeight: 14,
  },
  {
    bodyTop: 91,
    bodyHeight: 30,
    wickTop: 61,
    wickHeight: 84,
    volumeHeight: 19,
  },
  {
    bodyTop: 114,
    bodyHeight: 21,
    wickTop: 108,
    wickHeight: 41,
    volumeHeight: 11,
  },
  {
    bodyTop: 113,
    bodyHeight: 4,
    wickTop: 100,
    wickHeight: 32,
    volumeHeight: 8,
  },
  {
    bodyTop: 115,
    bodyHeight: 30,
    wickTop: 111,
    wickHeight: 39,
    volumeHeight: 13,
  },
  {
    bodyTop: 108,
    bodyHeight: 30,
    wickTop: 90,
    wickHeight: 63,
    volumeHeight: 16,
  },
];

/**
 * Candle-chart loading placeholder. The price pane flexes, the volume band is
 * a percentage of the root, and the time row is fixed, so the skeleton matches
 * the chart box at any height without measuring it. Grey shapes use the
 * design-system Skeleton pulse.
 */
const ChartCandleSkeleton = ({
  height = DEFAULT_CHART_HEIGHT,
  testID = 'chart-candle-skeleton',
}: ChartCandleSkeletonProps) => {
  const { colors } = useTheme();
  const gridColor = colors.border.muted;

  return (
    <Box
      testID={testID}
      twClassName="w-full overflow-hidden"
      style={{
        flex: 1,
        height,
        backgroundColor: colors.background.default,
      }}
    >
      <Box
        testID={`${testID}-price`}
        twClassName="flex-row"
        style={{ flex: 1, overflow: 'hidden' }}
      >
        <Box style={{ flex: 1, height: '100%' }}>
          {HORIZONTAL_GRID.map((line, index) => (
            <Box
              key={`grid-h-${line.lineTop}`}
              testID={`${testID}-grid-h-${index}`}
              style={{
                position: 'absolute',
                top: percentOf(line.lineTop, PRICE_PANE_HEIGHT),
                left: 0,
                right: 0,
                height: 1,
                backgroundColor: gridColor,
              }}
            />
          ))}
          <Box
            twClassName="flex-row"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          >
            <Box style={{ flex: 1 }} />
            {VERTICAL_GRID.map((index) => (
              <Box
                key={`grid-v-slot-${index}`}
                twClassName="flex-row"
                style={{ flex: 1 }}
              >
                <Box
                  testID={`${testID}-grid-v-${index}`}
                  style={{
                    width: 1,
                    height: '100%',
                    backgroundColor: gridColor,
                  }}
                />
                <Box style={{ flex: 1 }} />
              </Box>
            ))}
          </Box>
          <Box
            twClassName="flex-row"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          >
            {CANDLES.map((candle, index) => (
              <Box
                key={`candle-slot-${index}`}
                twClassName="flex-1 items-center"
                style={{ height: '100%' }}
              >
                <Box
                  twClassName="items-center"
                  style={{ width: BODY_WIDTH, height: '100%' }}
                >
                  <Skeleton
                    testID={`${testID}-wick-${index}`}
                    width={WICK_WIDTH}
                    height={percentOf(candle.wickHeight, PRICE_PANE_HEIGHT)}
                    style={{
                      position: 'absolute',
                      top: percentOf(candle.wickTop, PRICE_PANE_HEIGHT),
                    }}
                  />
                  <Skeleton
                    testID={`${testID}-candle-${index}`}
                    width={BODY_WIDTH}
                    height={percentOf(candle.bodyHeight, PRICE_PANE_HEIGHT)}
                    style={{
                      position: 'absolute',
                      top: percentOf(candle.bodyTop, PRICE_PANE_HEIGHT),
                    }}
                  />
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
        <Box
          testID={`${testID}-y-axis`}
          style={{ width: AXIS_WIDTH, height: '100%' }}
        >
          {HORIZONTAL_GRID.map((line, index) => (
            <Skeleton
              key={`y-pill-${line.pillTop}`}
              testID={`${testID}-y-pill-${index}`}
              width={Y_PILL_WIDTH}
              height={percentOf(Y_PILL_HEIGHT, PRICE_PANE_HEIGHT)}
              style={{
                position: 'absolute',
                top: percentOf(line.pillTop, PRICE_PANE_HEIGHT),
                right: 8,
              }}
            />
          ))}
        </Box>
      </Box>

      <Box
        testID={`${testID}-volume-band`}
        twClassName="flex-row items-end"
        style={{ height: VOLUME_PANE_PERCENT, flexShrink: 0 }}
      >
        <Box
          twClassName="flex-row items-end"
          style={{ flex: 1, height: '100%' }}
        >
          {CANDLES.map((candle, index) => (
            <Box
              key={`volume-slot-${index}`}
              twClassName="flex-1 items-center justify-end"
              style={{ height: '100%' }}
            >
              <Skeleton
                testID={`${testID}-volume-${index}`}
                width={BODY_WIDTH}
                height={percentOf(candle.volumeHeight, VOLUME_PANE_HEIGHT)}
              />
            </Box>
          ))}
        </Box>
        <Box style={{ width: AXIS_WIDTH, height: '100%' }} />
      </Box>

      <Box
        testID={`${testID}-time-axis`}
        twClassName="flex-row items-center"
        style={{ height: TIME_PANE_HEIGHT, flexShrink: 0 }}
      >
        <Box
          twClassName="flex-row items-center"
          style={{ flex: 1, height: TIME_PANE_HEIGHT }}
        >
          {TIME_PILLS.map((index) => (
            <Box key={`x-pill-slot-${index}`} twClassName="flex-1 items-center">
              <Skeleton
                testID={`${testID}-x-pill-${index}`}
                width={X_PILL_WIDTH}
                height={X_PILL_HEIGHT}
              />
            </Box>
          ))}
        </Box>
        <Box style={{ width: AXIS_WIDTH, height: TIME_PANE_HEIGHT }} />
      </Box>
    </Box>
  );
};

export default ChartCandleSkeleton;
