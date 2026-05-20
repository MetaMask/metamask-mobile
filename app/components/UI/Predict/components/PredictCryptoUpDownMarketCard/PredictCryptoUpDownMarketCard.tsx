import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useSyncExternalStore,
} from 'react';
import { Image, Pressable } from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Line as SvgLine,
  Path,
  Stop,
} from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedProps,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  ButtonBase,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../../../util/theme';
import { PredictEventValues } from '../../constants/eventNames';
import { usePredictActionGuard } from '../../hooks/usePredictActionGuard';
import { useCryptoUpDownChartData } from '../../hooks/useCryptoUpDownChartData';
import { useCryptoTargetPrice } from '../../hooks/useCryptoTargetPrice';
import { useLiveMarketPrices } from '../../hooks/useLiveMarketPrices';
import { usePredictNavigation } from '../../hooks/usePredictNavigation';
import { usePredictSeries } from '../../hooks/usePredictSeries';
import {
  OPEN_PREDICT_OUTCOME_STATUS,
  PredictMarketStatus,
  type PredictMarket,
  type PredictOutcome,
  type PredictOutcomeToken,
} from '../../types';
import type {
  PredictEntryPoint,
  PredictNavigationParamList,
} from '../../types/navigation';
import {
  getEventStartTime,
  getCryptoSymbol,
  getVariant,
} from '../../utils/cryptoUpDown';
import { formatPrice } from '../../utils/format';
import {
  getCurrentSeriesWindowMs,
  formatSeriesMarketCountdown,
  getSeriesDurationMs,
  formatSeriesDuration,
  getSeriesMarketProgressRemaining,
  getSeriesMarketWindow,
  resolvePredictSeriesMarket,
  type PredictMarketWithSeries,
} from '../../utils/series';
import { usePredictEntryPoint, usePredictPreviewSheet } from '../../contexts';
import TrendingFeedSessionManager from '../../../Trending/services/TrendingFeedSessionManager';
import { PredictCryptoUpDownMarketCardSelectorsIDs } from '../../Predict.testIds';
import { Skeleton } from '../../../../../component-library/components-temp/Skeleton';
import type { LivelinePoint } from '../../../Charts/LivelineChart/LivelineChart.types';

const SPARKLINE_POINT_LIMIT = 80;
const SPARKLINE_WINDOW_SECS = 30;
const SPARKLINE_SEED_POINT_COUNT = 24;
const SPARKLINE_VALUE_ANIMATION_MS = 260;
const SPARKLINE_RANGE_ANIMATION_MS = 360;
const SPARKLINE_SEED_GAP_SECS = 0.75;
const SPARKLINE_SEED_BRIDGE_SECS = 4;
const SPARKLINE_MIN_SCREEN_POINT_GAP = 0.25;
const SPARKLINE_RANGE_CONTRACTION_RATIO = 1.45;
const SPARKLINE_HEIGHT = 104;
const SPARKLINE_WIDTH = 100;
const SPARKLINE_RANGE_PADDING_RATIO = 0.12;
const SPARKLINE_CONTENT_INSET = { top: 6, bottom: 0, left: 0, right: 0 };
const TARGET_LABEL_OFFSET = 12;
const TARGET_LABEL_MIN_TOP = 12;
const TARGET_LABEL_MAX_TOP = 68;
const CHART_HISTORY_WINDOW_MIN_BUCKET_MS = 60 * 1000;
const CHART_HISTORY_WINDOW_BUCKET_DIVISOR = 12;
const CHART_DISPLAY_DURATION_BY_RECURRENCE_MS: Record<string, number> = {
  '5m': 10 * 60 * 1000,
  '15m': 30 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '4h': 4 * 60 * 60 * 1000,
  daily: 24 * 60 * 60 * 1000,
};
const getChartHistoryBucketMs = (displayDurationMs: number) =>
  Math.max(
    CHART_HISTORY_WINDOW_MIN_BUCKET_MS,
    Math.floor(displayDurationMs / CHART_HISTORY_WINDOW_BUCKET_DIVISOR),
  );
const CHART_REQUEST_DURATION_BY_RECURRENCE_MS: Record<string, number> = {
  '5m': 2 * 60 * 60 * 1000,
  '15m': 2 * 60 * 60 * 1000,
  '1h': 4 * 60 * 60 * 1000,
  '4h': 12 * 60 * 60 * 1000,
  daily: 7 * 24 * 60 * 60 * 1000,
};
const PROGRESS_RING_SIZE = 54;
const PROGRESS_RING_STROKE_WIDTH = 4;
const PROGRESS_RING_RADIUS =
  (PROGRESS_RING_SIZE - PROGRESS_RING_STROKE_WIDTH) / 2;
const PROGRESS_RING_CIRCUMFERENCE = 2 * Math.PI * PROGRESS_RING_RADIUS;
const CRYPTO_ACCENT_DEFAULT = 'rgb(245, 158, 11)';
const CRYPTO_ACCENT_BY_SYMBOL: Record<string, string> = {
  BTC: 'rgb(247, 147, 26)',
};
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedLine = Animated.createAnimatedComponent(SvgLine);
const CLOCK_UPDATE_OFFSET_MS = 50;

interface CardClock {
  listeners: Set<() => void>;
  nowMs: number;
  timeout: ReturnType<typeof setTimeout> | undefined;
}

const cardClock: CardClock = {
  listeners: new Set(),
  nowMs: Date.now(),
  timeout: undefined,
};

/**
 * Test-only: resets the shared card clock so tests don't leak listeners or
 * timers across cases. Mirrors the reference-counter teardown used by
 * `PredictPreviewSheetContext` (PR #30219).
 */
export const __resetCardClockForTest = () => {
  if (cardClock.timeout) {
    clearTimeout(cardClock.timeout);
  }
  cardClock.listeners.clear();
  cardClock.timeout = undefined;
  cardClock.nowMs = Date.now();
};

type SparklinePoint = LivelinePoint;

interface PredictCryptoUpDownMarketCardProps {
  market: PredictMarketWithSeries;
  testID?: string;
  entryPoint?: PredictEntryPoint;
  /**
   * Forwarded by the parent `PredictMarket` router for parity with sibling
   * cards (`PredictMarketSingle`, `PredictMarketMultiple`). The crypto up/down
   * card does not yet implement a carousel sizing variant — accepting the
   * prop keeps the variant-card contract stable.
   */
  isCarousel?: boolean;
  /** Called synchronously before the card's navigation press fires. */
  onCardPress?: () => void;
  /** Called when the user taps a buy button (before betslip opens). */
  onBuyButtonPress?: (marketId: string) => void;
}

const getOpenOutcome = (market: PredictMarket): PredictOutcome | undefined =>
  market.outcomes.find(
    (outcome) => outcome.status === OPEN_PREDICT_OUTCOME_STATUS,
  ) ?? market.outcomes[0];

const getTokenByTitle = (
  outcome: PredictOutcome | undefined,
  title: string,
  fallbackIndex: number,
): PredictOutcomeToken | undefined =>
  outcome?.tokens.find(
    (token) => token.title.toLowerCase() === title.toLowerCase(),
  ) ?? outcome?.tokens[fallbackIndex];

const getLivePrice = (
  token: PredictOutcomeToken | undefined,
  getPrice: ReturnType<typeof useLiveMarketPrices>['getPrice'],
) => {
  if (!token) {
    return undefined;
  }
  return getPrice(token.id)?.bestAsk ?? token.price;
};

const formatCents = (price?: number) => {
  if (typeof price !== 'number' || !Number.isFinite(price)) {
    return '--';
  }
  return `${Math.round(price * 100)}¢`;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const scheduleClockTick = () => {
  const delayMs = 1000 - (Date.now() % 1000) + CLOCK_UPDATE_OFFSET_MS;

  cardClock.timeout = setTimeout(() => {
    cardClock.timeout = undefined;
    cardClock.nowMs = Date.now();
    cardClock.listeners.forEach((listener) => listener());

    if (cardClock.listeners.size > 0) {
      scheduleClockTick();
    }
  }, delayMs);
};

const subscribeClock = (listener: () => void) => {
  cardClock.listeners.add(listener);
  cardClock.nowMs = Date.now();

  if (!cardClock.timeout) {
    scheduleClockTick();
  }

  return () => {
    cardClock.listeners.delete(listener);

    if (cardClock.listeners.size === 0 && cardClock.timeout) {
      clearTimeout(cardClock.timeout);
      cardClock.timeout = undefined;
    }
  };
};

const getClockSnapshot = () => cardClock.nowMs;

const useSharedNowMs = () =>
  useSyncExternalStore(subscribeClock, getClockSnapshot, getClockSnapshot);

const useSharedSeriesWindowMs = (durationMs: number) => {
  const getWindowSnapshot = useCallback(
    () => getCurrentSeriesWindowMs(durationMs, cardClock.nowMs),
    [durationMs],
  );

  return useSyncExternalStore(
    subscribeClock,
    getWindowSnapshot,
    getWindowSnapshot,
  );
};

const useSharedBucketedNowMs = (bucketMs: number) => {
  const getBucketSnapshot = useCallback(
    () => Math.floor(cardClock.nowMs / bucketMs) * bucketMs,
    [bucketMs],
  );

  return useSyncExternalStore(
    subscribeClock,
    getBucketSnapshot,
    getBucketSnapshot,
  );
};

const getChartDisplayDurationMs = (recurrence: string, durationMs: number) =>
  CHART_DISPLAY_DURATION_BY_RECURRENCE_MS[recurrence] ?? durationMs;

const getChartRequestDurationMs = (
  recurrence: string,
  displayDurationMs: number,
) => CHART_REQUEST_DURATION_BY_RECURRENCE_MS[recurrence] ?? displayDurationMs;

const downsampleSparklinePoints = (points: SparklinePoint[]) => {
  if (points.length <= SPARKLINE_POINT_LIMIT) {
    return points;
  }

  const lastIndex = points.length - 1;
  return Array.from({ length: SPARKLINE_POINT_LIMIT }, (_, index) => {
    const sourceIndex = Math.round(
      (index / (SPARKLINE_POINT_LIMIT - 1)) * lastIndex,
    );
    return points[sourceIndex];
  });
};

const normalizeSparklinePointsToWindow = (
  points: SparklinePoint[],
  windowSecs: number,
) => {
  if (points.length < 2) {
    return points;
  }

  const lastTime = points[points.length - 1].time;
  const fittedStartTime = lastTime - windowSecs;

  return points.map((point, index) => ({
    ...point,
    time: fittedStartTime + (index / (points.length - 1)) * windowSecs,
  }));
};

const fitSparklinePointsToWindow = (
  points: SparklinePoint[],
  windowSecs: number,
) => {
  if (points.length < 2) {
    return points;
  }

  const firstTime = points[0].time;
  const lastTime = points[points.length - 1].time;
  const sourceDuration = lastTime - firstTime;

  if (sourceDuration <= 0) {
    return normalizeSparklinePointsToWindow(points, windowSecs);
  }

  return points.map((point) => ({
    ...point,
    time:
      lastTime -
      windowSecs +
      ((point.time - firstTime) / sourceDuration) * windowSecs,
  }));
};

export const getSparklineDisplayPoints = (
  points: SparklinePoint[],
  windowSecs = SPARKLINE_WINDOW_SECS,
  fitToWindow = false,
) => {
  const finitePoints = points
    .filter(
      (point) =>
        Number.isFinite(point.time) &&
        Number.isFinite(point.value) &&
        point.time > 0,
    )
    .sort((a, b) => a.time - b.time);

  if (fitToWindow) {
    if (finitePoints.length === 0) {
      return [];
    }

    const latestTime = finitePoints.at(-1)?.time ?? 0;
    const windowStart = latestTime - windowSecs;
    const visiblePoints = finitePoints.filter(
      (point) => point.time >= windowStart,
    );
    const pointsToFit =
      visiblePoints.length >= 2 ? visiblePoints : finitePoints;

    if (pointsToFit.length < 2) {
      return pointsToFit;
    }

    return fitSparklinePointsToWindow(
      downsampleSparklinePoints(pointsToFit),
      windowSecs,
    );
  }

  if (finitePoints.length < 2) {
    return finitePoints;
  }

  const latestTime = finitePoints.at(-1)?.time ?? 0;
  const windowStart = latestTime - windowSecs;
  const visiblePoints = finitePoints.filter(
    (point) => point.time >= windowStart,
  );
  const firstVisibleTime = visiblePoints[0]?.time ?? latestTime;
  const visiblePointsCoverWindow =
    firstVisibleTime - windowStart <= SPARKLINE_SEED_GAP_SECS;

  if (visiblePointsCoverWindow) {
    return downsampleSparklinePoints(visiblePoints);
  }

  const seedSource = finitePoints
    .filter((point) => point.time < firstVisibleTime)
    .slice(-SPARKLINE_SEED_POINT_COUNT);

  if (seedSource.length === 0) {
    return downsampleSparklinePoints(
      visiblePoints.length >= 2 ? visiblePoints : finitePoints.slice(-2),
    );
  }

  const seedGap = firstVisibleTime - windowStart;
  const bridgeSecs = Math.min(SPARKLINE_SEED_BRIDGE_SECS, seedGap / 2);
  const seedEndTime = Math.max(windowStart, firstVisibleTime - bridgeSecs);
  const seedPoints = seedSource.map((point, index) => ({
    ...point,
    time:
      seedSource.length === 1
        ? windowStart
        : windowStart +
          (index / (seedSource.length - 1)) * (seedEndTime - windowStart),
  }));

  return downsampleSparklinePoints([...seedPoints, ...visiblePoints]);
};

export const getSparklineRange = (
  points: SparklinePoint[],
  targetPrice?: number,
) => {
  const displayPoints = points;
  const displayData = displayPoints
    .map((point) => point.value)
    .filter((value) => Number.isFinite(value));
  const sortedData = [...displayData].sort((a, b) => a - b);
  const lowerIndex =
    sortedData.length >= 8 ? Math.floor((sortedData.length - 1) * 0.15) : 0;
  const upperIndex =
    sortedData.length >= 8
      ? Math.ceil((sortedData.length - 1) * 0.85)
      : sortedData.length - 1;
  const latestValue = displayPoints.at(-1)?.value;
  const rangeData =
    sortedData.length >= 8
      ? [
          sortedData[lowerIndex],
          sortedData[upperIndex],
          ...(typeof latestValue === 'number' && Number.isFinite(latestValue)
            ? [latestValue]
            : []),
        ]
      : sortedData;
  const values =
    typeof targetPrice === 'number' && Number.isFinite(targetPrice)
      ? [...rangeData, targetPrice]
      : rangeData;
  const hasRangeValues = values.length > 0;
  const minValue = hasRangeValues ? Math.min(...values) : 0;
  const maxValue = hasRangeValues ? Math.max(...values) : 1;
  const valueRange = maxValue - minValue;
  const rangePadding =
    valueRange === 0 ? 1 : valueRange * SPARKLINE_RANGE_PADDING_RATIO;

  return {
    yMin: minValue - rangePadding,
    yMax: maxValue + rangePadding,
  };
};

const getSparklineY = (value: number, yMin: number, yMax: number) => {
  if (yMax === yMin) {
    return SPARKLINE_HEIGHT / 2;
  }

  const drawableHeight =
    SPARKLINE_HEIGHT -
    SPARKLINE_CONTENT_INSET.top -
    SPARKLINE_CONTENT_INSET.bottom;

  return (
    SPARKLINE_CONTENT_INSET.top +
    clamp((yMax - value) / (yMax - yMin), 0, 1) * drawableHeight
  );
};

const getSparklineX = (
  time: number,
  now: number,
  windowSecs = SPARKLINE_WINDOW_SECS,
) => {
  'worklet';
  const windowStart = now - windowSecs;
  return Math.min(
    Math.max(((time - windowStart) / windowSecs) * SPARKLINE_WIDTH, 0),
    SPARKLINE_WIDTH,
  );
};

const getSparklineYWorklet = (value: number, yMin: number, yMax: number) => {
  'worklet';
  if (yMax === yMin) {
    return SPARKLINE_HEIGHT / 2;
  }

  const drawableHeight =
    SPARKLINE_HEIGHT -
    SPARKLINE_CONTENT_INSET.top -
    SPARKLINE_CONTENT_INSET.bottom;

  return (
    SPARKLINE_CONTENT_INSET.top +
    Math.min(Math.max((yMax - value) / (yMax - yMin), 0), 1) * drawableHeight
  );
};

const buildSmoothLinePath = (
  points: SparklinePoint[],
  now: number,
  windowSecs: number,
  yMin: number,
  yMax: number,
  smoothValue: number,
) => {
  'worklet';
  if (points.length < 2) {
    return '';
  }

  const screenPoints: { x: number; y: number }[] = [];
  for (const point of points) {
    const screenPoint = {
      x: getSparklineX(point.time, now, windowSecs),
      y: getSparklineYWorklet(point.value, yMin, yMax),
    };
    const previous = screenPoints[screenPoints.length - 1];

    if (
      previous &&
      screenPoint.x - previous.x < SPARKLINE_MIN_SCREEN_POINT_GAP
    ) {
      screenPoints[screenPoints.length - 1] = screenPoint;
    } else {
      screenPoints.push(screenPoint);
    }
  }
  if (screenPoints.length < 2) {
    return '';
  }
  screenPoints[screenPoints.length - 1].y = getSparklineYWorklet(
    smoothValue,
    yMin,
    yMax,
  );
  const liveTipX = getSparklineX(now, now, windowSecs);

  if (liveTipX - screenPoints[screenPoints.length - 1].x > 0.1) {
    screenPoints.push({
      x: liveTipX,
      y: getSparklineYWorklet(smoothValue, yMin, yMax),
    });
  }

  let path = `M${screenPoints[0].x},${screenPoints[0].y}`;

  for (let index = 0; index < screenPoints.length - 1; index++) {
    const current = screenPoints[index];
    const next = screenPoints[index + 1];
    const midX = current.x + (next.x - current.x) / 2;
    path += ` C${midX},${current.y} ${midX},${next.y} ${next.x},${next.y}`;
  }

  return path;
};

const buildSmoothAreaPath = (
  points: SparklinePoint[],
  now: number,
  windowSecs: number,
  linePath: string,
) => {
  'worklet';
  if (!linePath) {
    return '';
  }

  const firstX = getSparklineX(points[0].time, now, windowSecs);
  const lastX = getSparklineX(now, now, windowSecs);

  return `M${firstX},${SPARKLINE_HEIGHT} L${linePath.slice(
    1,
  )} L${lastX},${SPARKLINE_HEIGHT} Z`;
};

const TargetDirectionGlyph = ({
  direction,
  color,
}: {
  direction: 'up' | 'down';
  color: string;
}) => {
  const isUp = direction === 'up';
  const firstY = isUp ? 8 : 4;
  const secondY = isUp ? 12 : 8;
  const controlOffset = isUp ? -4 : 4;

  return (
    <Svg width={16} height={16} viewBox="0 0 16 16">
      {[firstY, secondY].map((y, index) => (
        <Path
          key={`${direction}-${index}`}
          d={`M3 ${y} L8 ${y + controlOffset} L13 ${y}`}
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity={index === 0 ? 0.65 : 1}
        />
      ))}
    </Svg>
  );
};

const getTargetLineTop = ({
  targetPrice,
  yMin,
  yMax,
}: {
  targetPrice?: number;
  yMin: number;
  yMax: number;
}) => {
  if (
    typeof targetPrice !== 'number' ||
    !Number.isFinite(targetPrice) ||
    yMax === yMin
  ) {
    return 43;
  }

  return getSparklineY(targetPrice, yMin, yMax);
};

const Sparkline = React.memo(
  ({
    displayPoints,
    color,
    targetPrice,
    windowSecs,
    yMin,
    yMax,
  }: {
    displayPoints: SparklinePoint[];
    color: string;
    targetPrice?: number;
    windowSecs: number;
    yMin: number;
    yMax: number;
  }) => {
    const tw = useTailwind();
    const reactId = useId();
    const gradientId = `cryptoFeedSparklineGradient-${reactId}`;
    const latestTime = displayPoints.at(-1)?.time ?? 0;
    const animatedPoints = useSharedValue<SparklinePoint[]>(displayPoints);
    const animatedYMin = useSharedValue(yMin);
    const animatedYMax = useSharedValue(yMax);
    const animatedTargetPrice = useSharedValue(targetPrice ?? Number.NaN);
    const animatedNow = useSharedValue(latestTime);
    const animatedWindowSecs = useSharedValue(windowSecs);
    const animatedSmoothValue = useSharedValue(
      displayPoints.at(-1)?.value ?? 0,
    );
    const rangeRef = useRef({ yMin, yMax });

    useEffect(() => {
      const latestValue = displayPoints.at(-1)?.value ?? 0;
      const currentRange = rangeRef.current;
      const currentSpan = currentRange.yMax - currentRange.yMin;
      const nextSpan = yMax - yMin;
      const shouldExpandRange =
        yMin < currentRange.yMin || yMax > currentRange.yMax;
      const shouldContractRange =
        nextSpan > 0 &&
        currentSpan > nextSpan * SPARKLINE_RANGE_CONTRACTION_RATIO;

      animatedPoints.value = displayPoints;
      animatedWindowSecs.value = windowSecs;
      if (shouldExpandRange || shouldContractRange) {
        rangeRef.current = { yMin, yMax };
        animatedYMin.value = withTiming(yMin, {
          duration: SPARKLINE_RANGE_ANIMATION_MS,
          easing: Easing.out(Easing.cubic),
        });
        animatedYMax.value = withTiming(yMax, {
          duration: SPARKLINE_RANGE_ANIMATION_MS,
          easing: Easing.out(Easing.cubic),
        });
      }
      animatedTargetPrice.value = targetPrice ?? Number.NaN;
      animatedSmoothValue.value = withTiming(latestValue, {
        duration: SPARKLINE_VALUE_ANIMATION_MS,
        easing: Easing.out(Easing.cubic),
      });
      animatedNow.value = latestTime;
    }, [
      animatedNow,
      animatedPoints,
      animatedSmoothValue,
      animatedTargetPrice,
      animatedWindowSecs,
      animatedYMax,
      animatedYMin,
      displayPoints,
      latestTime,
      targetPrice,
      windowSecs,
      yMax,
      yMin,
    ]);

    const linePath = useDerivedValue(() =>
      buildSmoothLinePath(
        animatedPoints.value,
        animatedNow.value,
        animatedWindowSecs.value,
        animatedYMin.value,
        animatedYMax.value,
        animatedSmoothValue.value,
      ),
    );

    const areaAnimatedProps = useAnimatedProps(() => ({
      d: buildSmoothAreaPath(
        animatedPoints.value,
        animatedNow.value,
        animatedWindowSecs.value,
        linePath.value,
      ),
    }));

    const lineAnimatedProps = useAnimatedProps(() => ({
      d: linePath.value,
    }));

    const targetLineAnimatedProps = useAnimatedProps(() => {
      const target = animatedTargetPrice.value;

      if (!Number.isFinite(target)) {
        return { y1: 0, y2: 0, opacity: 0 };
      }

      const targetY = getSparklineYWorklet(
        target,
        animatedYMin.value,
        animatedYMax.value,
      );

      return { y1: targetY, y2: targetY, opacity: 1 };
    });

    return (
      <Box
        testID={PredictCryptoUpDownMarketCardSelectorsIDs.SPARKLINE}
        twClassName="h-[104px] w-full"
      >
        <Svg
          style={tw.style(`h-[${SPARKLINE_HEIGHT}px] w-full`)}
          viewBox={`0 0 ${SPARKLINE_WIDTH} ${SPARKLINE_HEIGHT}`}
          preserveAspectRatio="none"
        >
          <Defs key="crypto-feed-sparkline-gradient">
            <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity={0.62} />
              <Stop offset="0.48" stopColor={color} stopOpacity={0.28} />
              <Stop offset="0.78" stopColor={color} stopOpacity={0.1} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <AnimatedPath
            animatedProps={areaAnimatedProps}
            fill={`url(#${gradientId})`}
          />
          <AnimatedPath
            animatedProps={lineAnimatedProps}
            stroke={color}
            strokeWidth={7}
            strokeOpacity={0.14}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          <AnimatedPath
            animatedProps={lineAnimatedProps}
            stroke={color}
            strokeWidth={3.5}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          <AnimatedLine
            x1={0}
            x2={78}
            stroke={color}
            strokeDasharray="3 3"
            strokeLinecap="round"
            strokeOpacity={0.58}
            strokeWidth={1}
            animatedProps={targetLineAnimatedProps}
          />
        </Svg>
      </Box>
    );
  },
);
Sparkline.displayName = 'Sparkline';

const ProgressLogo = React.memo(
  ({
    imageUrl,
    progress,
    color,
    trackColor,
  }: {
    imageUrl?: string;
    progress: number;
    color: string;
    trackColor: string;
  }) => {
    const tw = useTailwind();
    const strokeDashoffset = PROGRESS_RING_CIRCUMFERENCE * (1 - progress);

    return (
      <Box twClassName="h-[54px] w-[54px] items-center justify-center">
        <Box twClassName="absolute inset-0">
          <Svg
            width={PROGRESS_RING_SIZE}
            height={PROGRESS_RING_SIZE}
            viewBox={`0 0 ${PROGRESS_RING_SIZE} ${PROGRESS_RING_SIZE}`}
          >
            <Circle
              cx={PROGRESS_RING_SIZE / 2}
              cy={PROGRESS_RING_SIZE / 2}
              r={PROGRESS_RING_RADIUS}
              stroke={trackColor}
              strokeOpacity={0.7}
              strokeWidth={PROGRESS_RING_STROKE_WIDTH}
              fill="transparent"
            />
            <Circle
              cx={PROGRESS_RING_SIZE / 2}
              cy={PROGRESS_RING_SIZE / 2}
              r={PROGRESS_RING_RADIUS}
              stroke={color}
              strokeWidth={PROGRESS_RING_STROKE_WIDTH}
              strokeDasharray={`${PROGRESS_RING_CIRCUMFERENCE} ${PROGRESS_RING_CIRCUMFERENCE}`}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              transform={`rotate(-90 ${PROGRESS_RING_SIZE / 2} ${
                PROGRESS_RING_SIZE / 2
              })`}
            />
          </Svg>
        </Box>
        <Box twClassName="h-10 w-10 overflow-hidden rounded-full bg-default">
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={tw.style('h-full w-full')}
              resizeMode="cover"
            />
          ) : (
            <Box twClassName="h-full w-full bg-muted" />
          )}
        </Box>
      </Box>
    );
  },
);
ProgressLogo.displayName = 'ProgressLogo';

const LiveStatus = React.memo(
  ({
    endDate,
    durationMs,
    imageUrl,
    accentColor,
    trackColor,
  }: {
    endDate?: string;
    durationMs: number;
    imageUrl?: string;
    accentColor: string;
    trackColor: string;
  }) => {
    const tw = useTailwind();
    const nowMs = useSharedNowMs();
    const countdown = formatSeriesMarketCountdown(endDate, nowMs);
    const progressRemaining = getSeriesMarketProgressRemaining(
      endDate,
      durationMs,
      nowMs,
    );

    return (
      <>
        <Box twClassName="absolute left-0 right-0 top-[112px] items-center px-4">
          <ProgressLogo
            imageUrl={imageUrl}
            progress={progressRemaining}
            color={accentColor}
            trackColor={trackColor}
          />
        </Box>

        <Box
          testID={PredictCryptoUpDownMarketCardSelectorsIDs.LIVE_BADGE}
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
          twClassName="absolute left-0 right-0 top-[171px]"
        >
          <Box
            twClassName="mr-1.5 h-2 w-2 rounded-full"
            style={tw.style({ backgroundColor: accentColor })}
          />
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            style={tw.style({ color: accentColor })}
          >
            LIVE · {countdown}
          </Text>
        </Box>
      </>
    );
  },
);
LiveStatus.displayName = 'LiveStatus';

const OutcomeButtons = React.memo(
  ({
    upToken,
    downToken,
    marketStatus,
    onBuyPress,
  }: {
    upToken?: PredictOutcomeToken;
    downToken?: PredictOutcomeToken;
    marketStatus: PredictMarketStatus;
    onBuyPress: (token?: PredictOutcomeToken) => void;
  }) => {
    const tokenIds = useMemo(
      () =>
        [upToken?.id, downToken?.id].filter((id): id is string => Boolean(id)),
      [downToken?.id, upToken?.id],
    );
    const isMarketOpen = marketStatus === PredictMarketStatus.OPEN;
    const { getPrice } = useLiveMarketPrices(tokenIds, {
      enabled: isMarketOpen,
    });
    const upPrice = getLivePrice(upToken, getPrice);
    const downPrice = getLivePrice(downToken, getPrice);

    return (
      <Box
        flexDirection={BoxFlexDirection.Row}
        twClassName="absolute left-4 right-4 top-[235px] z-10 gap-2"
      >
        <ButtonBase
          testID={PredictCryptoUpDownMarketCardSelectorsIDs.UP_BUTTON}
          onPress={() => onBuyPress(upToken)}
          twClassName="h-10 flex-1 rounded-lg bg-success-muted"
          disabled={!upToken || !isMarketOpen}
        >
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.SuccessDefault}
          >
            Up · {formatCents(upPrice)}
          </Text>
        </ButtonBase>
        <ButtonBase
          testID={PredictCryptoUpDownMarketCardSelectorsIDs.DOWN_BUTTON}
          onPress={() => onBuyPress(downToken)}
          twClassName="h-10 flex-1 rounded-lg bg-error-muted"
          disabled={!downToken || !isMarketOpen}
        >
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.ErrorDefault}
          >
            Down · {formatCents(downPrice)}
          </Text>
        </ButtonBase>
      </Box>
    );
  },
);
OutcomeButtons.displayName = 'OutcomeButtons';

const PredictCryptoUpDownMarketCardSkeleton = ({
  testID,
}: {
  testID?: string;
}) => {
  const tw = useTailwind();

  return (
    <Box testID={testID} twClassName="my-2 rounded-xl bg-section p-4">
      <Box
        testID={PredictCryptoUpDownMarketCardSelectorsIDs.SKELETON}
        twClassName="items-center gap-3"
      >
        <Skeleton width={40} height={40} style={tw.style('rounded-full')} />
        <Skeleton width="70%" height={18} style={tw.style('rounded-md')} />
        <Skeleton width="100%" height={120} style={tw.style('rounded-xl')} />
        <Box flexDirection={BoxFlexDirection.Row} twClassName="w-full gap-2">
          <Skeleton width="48%" height={40} style={tw.style('rounded-lg')} />
          <Skeleton width="48%" height={40} style={tw.style('rounded-lg')} />
        </Box>
      </Box>
    </Box>
  );
};

const PredictCryptoUpDownMarketCard: React.FC<
  PredictCryptoUpDownMarketCardProps
> = ({
  market,
  testID,
  entryPoint: propEntryPoint,
  onCardPress,
  onBuyButtonPress,
}) => {
  const tw = useTailwind();
  const { colors } = useTheme();
  const navigation =
    useNavigation<NavigationProp<PredictNavigationParamList>>();
  const { navigateToMarketDetails } = usePredictNavigation();
  const { openBuySheet } = usePredictPreviewSheet();
  const contextEntryPoint = usePredictEntryPoint();
  const baseEntryPoint =
    contextEntryPoint ??
    propEntryPoint ??
    PredictEventValues.ENTRY_POINT.PREDICT_FEED;
  const resolvedEntryPoint = TrendingFeedSessionManager.getInstance()
    .isFromTrending
    ? PredictEventValues.ENTRY_POINT.TRENDING
    : baseEntryPoint;
  const { executeGuardedAction } = usePredictActionGuard({ navigation });
  const durationMs = getSeriesDurationMs(market.series.recurrence);
  const windowMs = useSharedSeriesWindowMs(durationMs);
  const chartDisplayDurationMs = getChartDisplayDurationMs(
    market.series.recurrence,
    durationMs,
  );
  const chartRequestDurationMs = getChartRequestDurationMs(
    market.series.recurrence,
    chartDisplayDurationMs,
  );
  const chartWindowSecs = chartDisplayDurationMs / 1000;
  const chartHistoryBucketMs = getChartHistoryBucketMs(chartDisplayDurationMs);
  const chartHistoryEndMs = useSharedBucketedNowMs(chartHistoryBucketMs);
  const chartHistoryWindow = useMemo(
    () => ({
      startDate: new Date(
        chartHistoryEndMs - chartRequestDurationMs,
      ).toISOString(),
    }),
    [chartHistoryEndMs, chartRequestDurationMs],
  );

  const seriesQueryParams = useMemo(
    () => ({
      seriesId: market.series.id,
      ...getSeriesMarketWindow({ anchorMs: windowMs, durationMs }),
    }),
    [durationMs, market.series.id, windowMs],
  );

  const { data: seriesMarkets, isLoading: isSeriesLoading } =
    usePredictSeries(seriesQueryParams);
  const selectedMarket = useMemo(
    () => resolvePredictSeriesMarket(market, seriesMarkets),
    [market, seriesMarkets],
  );
  const selectedOutcome = useMemo(
    () => getOpenOutcome(selectedMarket),
    [selectedMarket],
  );
  const upToken = useMemo(
    () => getTokenByTitle(selectedOutcome, 'Up', 0),
    [selectedOutcome],
  );
  const downToken = useMemo(
    () => getTokenByTitle(selectedOutcome, 'Down', 1),
    [selectedOutcome],
  );
  const symbol = getCryptoSymbol(selectedMarket);
  const accentColor =
    CRYPTO_ACCENT_BY_SYMBOL[symbol ?? ''] ?? CRYPTO_ACCENT_DEFAULT;
  const targetPriceEventStartTime = getEventStartTime(
    selectedMarket.endDate,
    selectedMarket.series.recurrence,
  );
  const { data: targetPrice } = useCryptoTargetPrice({
    eventId: selectedMarket.id,
    symbol: symbol ?? '',
    eventStartTime: targetPriceEventStartTime ?? '',
    variant: getVariant(selectedMarket.series.recurrence),
    endDate: selectedMarket.endDate ?? '',
    enabled:
      Boolean(symbol) &&
      Boolean(targetPriceEventStartTime) &&
      Boolean(selectedMarket.endDate),
  });
  const validatedTargetPrice =
    typeof targetPrice === 'number' && targetPrice > 0
      ? targetPrice
      : undefined;
  const chartData = useCryptoUpDownChartData(
    selectedMarket,
    validatedTargetPrice,
    { liveUpdatesEnabled: false, historicalWindow: chartHistoryWindow },
  );
  const sparklinePoints = useMemo(() => chartData.data, [chartData.data]);
  const latestPrice =
    chartData.data.at(-1)?.value ??
    (chartData.value > 0 ? chartData.value : undefined);
  const sparklineDisplayPoints = useMemo(
    () => getSparklineDisplayPoints(sparklinePoints, chartWindowSecs, true),
    [chartWindowSecs, sparklinePoints],
  );
  const sparklineRange = useMemo(
    () => getSparklineRange(sparklineDisplayPoints, validatedTargetPrice),
    [sparklineDisplayPoints, validatedTargetPrice],
  );
  const targetLineTop = getTargetLineTop({
    targetPrice: validatedTargetPrice,
    ...sparklineRange,
  });
  const targetLabelTop = clamp(
    targetLineTop - TARGET_LABEL_OFFSET,
    TARGET_LABEL_MIN_TOP,
    TARGET_LABEL_MAX_TOP,
  );
  const targetDirection: 'up' | 'down' =
    typeof latestPrice === 'number' &&
    typeof validatedTargetPrice === 'number' &&
    latestPrice > validatedTargetPrice
      ? 'down'
      : 'up';
  const resetDuration = formatSeriesDuration(durationMs);
  const cardTitle = selectedMarket.series.title || selectedMarket.title;
  const imageUrl = selectedMarket.image || market.image;
  const displayTargetPrice =
    typeof validatedTargetPrice === 'number'
      ? formatPrice(validatedTargetPrice, { maximumDecimals: 0 })
      : undefined;

  const handleCardPress = useCallback(() => {
    onCardPress?.();
    navigateToMarketDetails(
      {
        marketId: selectedMarket.id,
        series: selectedMarket.series,
        entryPoint: resolvedEntryPoint,
        title: cardTitle,
        image: imageUrl,
      },
      { throughRoot: true },
    );
  }, [
    cardTitle,
    imageUrl,
    navigateToMarketDetails,
    onCardPress,
    resolvedEntryPoint,
    selectedMarket.id,
    selectedMarket.series,
  ]);

  const handleBuyPress = useCallback(
    (token?: PredictOutcomeToken) => {
      if (!selectedOutcome || !token) {
        return;
      }

      if (selectedMarket.status !== PredictMarketStatus.OPEN) {
        return;
      }

      onBuyButtonPress?.(selectedMarket.id);
      executeGuardedAction(
        () => {
          openBuySheet({
            market: selectedMarket,
            outcome: selectedOutcome,
            outcomeToken: token,
            entryPoint: resolvedEntryPoint,
          });
        },
        {
          attemptedAction: PredictEventValues.ATTEMPTED_ACTION.PREDICT,
        },
      );
    },
    [
      executeGuardedAction,
      onBuyButtonPress,
      openBuySheet,
      resolvedEntryPoint,
      selectedMarket,
      selectedOutcome,
    ],
  );

  if (isSeriesLoading && !seriesMarkets) {
    return <PredictCryptoUpDownMarketCardSkeleton testID={testID} />;
  }

  return (
    <Box twClassName="my-2 h-[319px] rounded-xl bg-muted overflow-hidden">
      <Pressable
        testID={testID ?? PredictCryptoUpDownMarketCardSelectorsIDs.CARD}
        onPress={handleCardPress}
        accessibilityLabel={cardTitle}
        accessibilityRole="button"
        style={tw.style('absolute inset-0')}
      >
        <Box twClassName="absolute left-[-2px] right-[-2px] top-0 opacity-100">
          <Sparkline
            displayPoints={sparklineDisplayPoints}
            color={accentColor}
            targetPrice={validatedTargetPrice}
            windowSecs={chartWindowSecs}
            yMin={sparklineRange.yMin}
            yMax={sparklineRange.yMax}
          />
        </Box>
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="absolute right-2 rounded-full border bg-section px-2 py-0"
          style={tw.style(
            { top: targetLabelTop },
            {
              backgroundColor: colors.background.section,
              borderColor: colors.border.muted,
            },
          )}
        >
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextAlternative}
          >
            Target
          </Text>
          <Box twClassName="ml-1">
            <TargetDirectionGlyph
              direction={targetDirection}
              color={accentColor}
            />
          </Box>
        </Box>
        {displayTargetPrice ? (
          <Box
            twClassName="absolute right-2 rounded-full border bg-section px-2 py-0.5"
            style={tw.style(
              { top: targetLabelTop + 30 },
              {
                backgroundColor: colors.background.section,
                borderColor: colors.border.muted,
              },
            )}
          >
            <Text
              variant={TextVariant.BodyXs}
              fontWeight={FontWeight.Bold}
              style={tw.style({ color: accentColor })}
            >
              {displayTargetPrice}
            </Text>
          </Box>
        ) : null}

        <LiveStatus
          endDate={selectedMarket.endDate}
          durationMs={durationMs}
          imageUrl={imageUrl}
          accentColor={accentColor}
          trackColor={colors.border.muted}
        />

        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextDefault}
          numberOfLines={1}
          twClassName="absolute left-4 right-4 top-[197px] text-center"
        >
          {cardTitle}
        </Text>
      </Pressable>

      <OutcomeButtons
        upToken={upToken}
        downToken={downToken}
        marketStatus={selectedMarket.status as PredictMarketStatus}
        onBuyPress={handleBuyPress}
      />
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        twClassName="absolute bottom-4 left-0 right-0"
      >
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          Resets every {resetDuration}
        </Text>
      </Box>
    </Box>
  );
};

export default PredictCryptoUpDownMarketCard;
