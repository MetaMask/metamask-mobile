import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  useAnimatedProps,
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  ButtonBase,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
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

const SPARKLINE_POINT_LIMIT = 120;
const SPARKLINE_WINDOW_SECS = 30;
const SPARKLINE_SEED_POINT_COUNT = 24;
const SPARKLINE_CLOCK_TOLERANCE_SECS = 10;
const SPARKLINE_HEIGHT = 126;
const SPARKLINE_WIDTH = 100;
const SPARKLINE_RANGE_PADDING_RATIO = 0.12;
const SPARKLINE_CONTENT_INSET = { top: 6, bottom: 0, left: 0, right: 0 };
const TARGET_LABEL_OFFSET = 12;
const TARGET_LABEL_MIN_TOP = 12;
const TARGET_LABEL_MAX_TOP = 68;
const PROGRESS_RING_SIZE = 54;
const PROGRESS_RING_STROKE_WIDTH = 4;
const PROGRESS_RING_RADIUS =
  (PROGRESS_RING_SIZE - PROGRESS_RING_STROKE_WIDTH) / 2;
const PROGRESS_RING_CIRCUMFERENCE = 2 * Math.PI * PROGRESS_RING_RADIUS;
const FALLBACK_SPARKLINE_DATA = [
  0.42, 0.72, 0.86, 0.79, 0.46, 0.58, 0.5, 0.18, 0.28, 0.12, 0.24, 0.62, 0.58,
  0.42, 0.24, 0.14, 0.2, 0.28, 0.3,
];
const FALLBACK_SPARKLINE_POINTS = FALLBACK_SPARKLINE_DATA.map(
  (value, index) => ({
    time:
      -SPARKLINE_WINDOW_SECS +
      (index / (FALLBACK_SPARKLINE_DATA.length - 1)) * SPARKLINE_WINDOW_SECS,
    value,
  }),
);
const CRYPTO_ACCENT_DEFAULT = 'rgb(245, 158, 11)';
const CRYPTO_ACCENT_BY_SYMBOL: Record<string, string> = {
  BTC: 'rgb(247, 147, 26)',
};
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedLine = Animated.createAnimatedComponent(SvgLine);

type SparklinePoint = LivelinePoint;

interface PredictCryptoUpDownMarketCardProps {
  market: PredictMarketWithSeries;
  testID?: string;
  entryPoint?: PredictEntryPoint;
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

const getSparklineDisplayPoints = (points: SparklinePoint[]) => {
  const finitePoints = points.filter(
    (point) =>
      Number.isFinite(point.time) &&
      Number.isFinite(point.value) &&
      point.time > 0,
  );

  if (finitePoints.length < 2) {
    return FALLBACK_SPARKLINE_POINTS;
  }

  const latestTime = finitePoints.at(-1)?.time ?? 0;
  const windowStart = latestTime - SPARKLINE_WINDOW_SECS;
  const visiblePoints = finitePoints.filter(
    (point) => point.time >= windowStart,
  );

  if (visiblePoints.length >= SPARKLINE_SEED_POINT_COUNT) {
    return downsampleSparklinePoints(visiblePoints);
  }

  const firstVisibleTime = visiblePoints[0]?.time ?? latestTime;
  const seedSource = finitePoints
    .filter((point) => point.time < firstVisibleTime)
    .slice(-SPARKLINE_SEED_POINT_COUNT);

  if (seedSource.length === 0) {
    return downsampleSparklinePoints(
      visiblePoints.length >= 2 ? visiblePoints : finitePoints.slice(-2),
    );
  }

  const seedEndTime = Math.max(windowStart, firstVisibleTime - 0.001);
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

const getSparklineRange = (points: SparklinePoint[], targetPrice?: number) => {
  const displayPoints = points.length >= 2 ? points : FALLBACK_SPARKLINE_POINTS;
  const displayData = displayPoints.map((point) => point.value);
  const values =
    typeof targetPrice === 'number' && Number.isFinite(targetPrice)
      ? [...displayData, targetPrice]
      : displayData;
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
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
    ((yMax - value) / (yMax - yMin)) * drawableHeight
  );
};

const getSparklineX = (time: number, now: number) => {
  'worklet';
  const windowStart = now - SPARKLINE_WINDOW_SECS;
  return Math.min(
    Math.max(
      ((time - windowStart) / SPARKLINE_WINDOW_SECS) * SPARKLINE_WIDTH,
      0,
    ),
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
    ((yMax - value) / (yMax - yMin)) * drawableHeight
  );
};

const buildSmoothLinePath = (
  points: SparklinePoint[],
  now: number,
  yMin: number,
  yMax: number,
) => {
  'worklet';
  if (points.length < 2) {
    return '';
  }

  const screenPoints = points.map((point) => ({
    x: getSparklineX(point.time, now),
    y: getSparklineYWorklet(point.value, yMin, yMax),
  }));
  const lastPoint = points[points.length - 1];
  const liveTipX = getSparklineX(now, now);

  if (liveTipX - screenPoints[screenPoints.length - 1].x > 0.1) {
    screenPoints.push({
      x: liveTipX,
      y: getSparklineYWorklet(lastPoint.value, yMin, yMax),
    });
  }

  let path = `M${screenPoints[0].x},${screenPoints[0].y}`;

  for (let index = 0; index < screenPoints.length - 1; index++) {
    const current = screenPoints[index];
    const next = screenPoints[index + 1];
    const previous = screenPoints[index - 1] ?? current;
    const afterNext = screenPoints[index + 2] ?? next;
    const cp1x = current.x + (next.x - previous.x) / 6;
    const cp1y = current.y + (next.y - previous.y) / 6;
    const cp2x = next.x - (afterNext.x - current.x) / 6;
    const cp2y = next.y - (afterNext.y - current.y) / 6;
    path += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${next.x},${next.y}`;
  }

  return path;
};

const buildSmoothAreaPath = (
  points: SparklinePoint[],
  now: number,
  yMin: number,
  yMax: number,
) => {
  'worklet';
  const linePath = buildSmoothLinePath(points, now, yMin, yMax);

  if (!linePath) {
    return '';
  }

  const firstX = getSparklineX(points[0].time, now);
  const lastX = getSparklineX(now, now);

  return `M${firstX},${SPARKLINE_HEIGHT} ${linePath.replace(
    /^M/,
    'L',
  )} L${lastX},${SPARKLINE_HEIGHT} Z`;
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

const Sparkline = ({
  points,
  color,
  targetPrice,
}: {
  points: SparklinePoint[];
  color: string;
  targetPrice?: number;
}) => {
  const tw = useTailwind();
  const displayPoints = getSparklineDisplayPoints(points);
  const { yMin, yMax } = getSparklineRange(displayPoints, targetPrice);
  const latestTime = displayPoints.at(-1)?.time ?? 0;
  const shouldUseWallClock =
    latestTime > 0 &&
    Math.abs(Date.now() / 1000 - latestTime) <= SPARKLINE_CLOCK_TOLERANCE_SECS;
  const animatedPoints = useSharedValue<SparklinePoint[]>(displayPoints);
  const animatedYMin = useSharedValue(yMin);
  const animatedYMax = useSharedValue(yMax);
  const animatedTargetPrice = useSharedValue(targetPrice ?? Number.NaN);
  const animatedNow = useSharedValue(latestTime);
  const animatedUseWallClock = useSharedValue(shouldUseWallClock);

  useEffect(() => {
    animatedPoints.value = displayPoints;
    animatedYMin.value = yMin;
    animatedYMax.value = yMax;
    animatedTargetPrice.value = targetPrice ?? Number.NaN;
    animatedUseWallClock.value = shouldUseWallClock;
    if (!shouldUseWallClock || latestTime > animatedNow.value) {
      animatedNow.value = latestTime;
    }
  }, [
    animatedNow,
    animatedPoints,
    animatedTargetPrice,
    animatedUseWallClock,
    animatedYMax,
    animatedYMin,
    displayPoints,
    latestTime,
    shouldUseWallClock,
    targetPrice,
    yMax,
    yMin,
  ]);

  useFrameCallback(() => {
    if (animatedUseWallClock.value) {
      animatedNow.value = Date.now() / 1000;
    }
  });

  const areaAnimatedProps = useAnimatedProps(() => ({
    d: buildSmoothAreaPath(
      animatedPoints.value,
      animatedNow.value,
      animatedYMin.value,
      animatedYMax.value,
    ),
  }));

  const lineAnimatedProps = useAnimatedProps(() => ({
    d: buildSmoothLinePath(
      animatedPoints.value,
      animatedNow.value,
      animatedYMin.value,
      animatedYMax.value,
    ),
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
      twClassName="h-[126px] w-full"
    >
      <Svg
        style={tw.style(`h-[${SPARKLINE_HEIGHT}px] w-full`)}
        viewBox={`0 0 ${SPARKLINE_WIDTH} ${SPARKLINE_HEIGHT}`}
        preserveAspectRatio="none"
      >
        <Defs key="crypto-feed-sparkline-gradient">
          <LinearGradient
            id="cryptoFeedSparklineGradient"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <Stop offset="0" stopColor={color} stopOpacity={0.62} />
            <Stop offset="0.48" stopColor={color} stopOpacity={0.28} />
            <Stop offset="0.78" stopColor={color} stopOpacity={0.1} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <AnimatedPath
          animatedProps={areaAnimatedProps}
          fill="url(#cryptoFeedSparklineGradient)"
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
          x1={56}
          x2={82}
          stroke={color}
          strokeOpacity={0.7}
          strokeWidth={1}
          animatedProps={targetLineAnimatedProps}
        />
      </Svg>
    </Box>
  );
};

const ProgressLogo = ({
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
};

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
  const [windowMs, setWindowMs] = useState(() =>
    getCurrentSeriesWindowMs(durationMs),
  );
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    setWindowMs(getCurrentSeriesWindowMs(durationMs));
  }, [durationMs]);

  useEffect(() => {
    const interval = setInterval(() => {
      setNowMs(Date.now());
      const nextWindowMs = getCurrentSeriesWindowMs(durationMs);
      setWindowMs((currentWindowMs) =>
        currentWindowMs === nextWindowMs ? currentWindowMs : nextWindowMs,
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [durationMs]);

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
  const tokenIds = useMemo(
    () =>
      [upToken?.id, downToken?.id].filter((id): id is string => Boolean(id)),
    [downToken?.id, upToken?.id],
  );
  const { getPrice } = useLiveMarketPrices(tokenIds, {
    enabled: selectedMarket.status === PredictMarketStatus.OPEN,
  });
  const upPrice = getLivePrice(upToken, getPrice);
  const downPrice = getLivePrice(downToken, getPrice);
  const upPercentage =
    typeof upPrice === 'number' && Number.isFinite(upPrice)
      ? Math.round(upPrice * 100)
      : undefined;
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
    undefined,
    validatedTargetPrice,
  );
  const sparklinePoints = useMemo(() => chartData.data, [chartData.data]);
  const latestPrice =
    chartData.data.at(-1)?.value ??
    (chartData.value > 0 ? chartData.value : undefined);
  const targetLineTop = getTargetLineTop({
    targetPrice: validatedTargetPrice,
    ...getSparklineRange(
      getSparklineDisplayPoints(sparklinePoints),
      validatedTargetPrice,
    ),
  });
  const targetLabelTop = clamp(
    targetLineTop - TARGET_LABEL_OFFSET,
    TARGET_LABEL_MIN_TOP,
    TARGET_LABEL_MAX_TOP,
  );
  const targetDirectionIcon =
    typeof latestPrice === 'number' &&
    typeof validatedTargetPrice === 'number' &&
    latestPrice > validatedTargetPrice
      ? IconName.ArrowDown
      : IconName.ArrowUp;
  const countdown = formatSeriesMarketCountdown(selectedMarket.endDate, nowMs);
  const progressRemaining = getSeriesMarketProgressRemaining(
    selectedMarket.endDate,
    durationMs,
    nowMs,
  );
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
            points={sparklinePoints}
            color={accentColor}
            targetPrice={validatedTargetPrice}
          />
        </Box>
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="absolute right-2 rounded-md bg-section px-2 py-0"
          style={tw.style(
            { top: targetLabelTop },
            { backgroundColor: colors.background.section },
          )}
        >
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextAlternative}
          >
            Target
          </Text>
          <Icon
            name={targetDirectionIcon}
            size={IconSize.Xs}
            color={IconColor.IconAlternative}
            style={tw.style('ml-1')}
          />
        </Box>
        {displayTargetPrice ? (
          <Box
            twClassName="absolute right-2 rounded bg-section px-1 py-0.5"
            style={tw.style(
              { top: targetLabelTop + 30 },
              { backgroundColor: colors.background.section },
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

        <Box twClassName="absolute left-0 right-0 top-[112px] items-center px-4">
          <ProgressLogo
            imageUrl={imageUrl}
            progress={progressRemaining}
            color={accentColor}
            trackColor={colors.border.muted}
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

      <Box
        flexDirection={BoxFlexDirection.Row}
        twClassName="absolute left-4 right-4 top-[235px] z-10 gap-2"
      >
        <ButtonBase
          testID={PredictCryptoUpDownMarketCardSelectorsIDs.UP_BUTTON}
          onPress={() => handleBuyPress(upToken)}
          twClassName="h-10 flex-1 rounded-lg bg-success-muted"
          disabled={!upToken}
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
          onPress={() => handleBuyPress(downToken)}
          twClassName="h-10 flex-1 rounded-lg bg-error-muted"
          disabled={!downToken}
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
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        twClassName="absolute bottom-4 left-0 right-0 gap-1"
      >
        <Icon
          name={IconName.Refresh}
          size={IconSize.Md}
          color={IconColor.IconAlternative}
        />
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          Resets every {Math.round(durationMs / 60_000)} min
        </Text>
      </Box>
    </Box>
  );
};

export default PredictCryptoUpDownMarketCard;
