import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Pressable } from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Line as SvgLine,
  Stop,
} from 'react-native-svg';
import { curveCatmullRom } from 'd3-shape';
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
import { AreaChart, LineChart } from 'react-native-svg-charts';
import Routes from '../../../../../constants/navigation/Routes';
import { useTheme } from '../../../../../util/theme';
import { PredictEventValues } from '../../constants/eventNames';
import { usePredictActionGuard } from '../../hooks/usePredictActionGuard';
import { useCryptoUpDownChartData } from '../../hooks/useCryptoUpDownChartData';
import { useCryptoTargetPrice } from '../../hooks/useCryptoTargetPrice';
import { useLiveMarketPrices } from '../../hooks/useLiveMarketPrices';
import { usePredictSeries } from '../../hooks/usePredictSeries';
import {
  OPEN_PREDICT_OUTCOME_STATUS,
  PredictMarketStatus,
  type PredictMarket,
  type PredictOutcome,
  type PredictOutcomeToken,
  type PredictSeries,
} from '../../types';
import type {
  PredictEntryPoint,
  PredictNavigationParamList,
} from '../../types/navigation';
import {
  getEventStartTime,
  getCryptoSymbol,
  getVariant,
  RECURRENCE_TO_DURATION_SECS,
} from '../../utils/cryptoUpDown';
import { formatPrice } from '../../utils/format';
import {
  findLiveMarket,
  findNearestMarket,
} from '../TimeSlotPicker/TimeSlotPicker.utils';
import { usePredictEntryPoint, usePredictPreviewSheet } from '../../contexts';
import TrendingFeedSessionManager from '../../../Trending/services/TrendingFeedSessionManager';
import { PredictCryptoUpDownMarketCardSelectorsIDs } from '../../Predict.testIds';
import { Skeleton } from '../../../../../component-library/components-temp/Skeleton';

const DEFAULT_DURATION_MS = 5 * 60 * 1000;
const MARKET_WINDOW_LOOKBACK = 3;
const MARKET_WINDOW_LOOKAHEAD = 10;
const SPARKLINE_POINT_LIMIT = 48;
const SPARKLINE_HEIGHT = 126;
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
const CRYPTO_ACCENT_DEFAULT = 'rgb(245, 158, 11)';
const CRYPTO_ACCENT_BY_SYMBOL: Record<string, string> = {
  BTC: 'rgb(247, 147, 26)',
};
const SPARKLINE_CURVE = curveCatmullRom.alpha(0.35);

type PredictMarketWithSeries = PredictMarket & { series: PredictSeries };

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

const getDurationMs = (market: PredictMarketWithSeries) => {
  const durationSecs = RECURRENCE_TO_DURATION_SECS[market.series.recurrence];
  return durationSecs ? durationSecs * 1000 : DEFAULT_DURATION_MS;
};

const getCurrentWindowMs = (durationMs: number) => {
  const now = Date.now();
  if (!Number.isFinite(now) || durationMs <= 0) {
    return 0;
  }
  return Math.floor(now / durationMs) * durationMs;
};

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

const formatCountdown = (endDate?: string, nowMs = Date.now()) => {
  if (!endDate) {
    return '--:--';
  }

  const remainingMs = new Date(endDate).getTime() - nowMs;
  if (!Number.isFinite(remainingMs) || remainingMs <= 0) {
    return '00:00';
  }

  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const getProgressRemaining = (
  endDate: string | undefined,
  durationMs: number,
  nowMs: number,
) => {
  if (!endDate || durationMs <= 0) {
    return 0;
  }

  const remainingMs = new Date(endDate).getTime() - nowMs;
  if (!Number.isFinite(remainingMs)) {
    return 0;
  }

  return Math.max(0, Math.min(remainingMs / durationMs, 1));
};

const attachSeries = (
  market: PredictMarket,
  series: PredictSeries,
): PredictMarketWithSeries => ({
  ...market,
  series: market.series ?? series,
});

const resolveSelectedMarket = (
  sourceMarket: PredictMarketWithSeries,
  seriesMarkets?: PredictMarket[],
) => {
  if (!seriesMarkets?.length) {
    return sourceMarket;
  }

  const liveMarket = findLiveMarket(seriesMarkets);
  return attachSeries(
    liveMarket ?? findNearestMarket(seriesMarkets) ?? sourceMarket,
    sourceMarket.series,
  );
};

const getSparklineDisplayData = (data: number[]) =>
  data.length >= 2 ? data : FALLBACK_SPARKLINE_DATA;

const getSparklineRange = (data: number[], targetPrice?: number) => {
  const displayData = data.length >= 2 ? data : FALLBACK_SPARKLINE_DATA;
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

  const drawableHeight =
    SPARKLINE_HEIGHT -
    SPARKLINE_CONTENT_INSET.top -
    SPARKLINE_CONTENT_INSET.bottom;

  return (
    SPARKLINE_CONTENT_INSET.top +
    ((yMax - targetPrice) / (yMax - yMin)) * drawableHeight
  );
};

const TargetLine = ({
  targetPrice,
  color,
  y,
}: {
  targetPrice?: number;
  color: string;
  y?: (value: number) => number;
}) => {
  if (
    typeof targetPrice !== 'number' ||
    !Number.isFinite(targetPrice) ||
    typeof y !== 'function'
  ) {
    return null;
  }

  return (
    <SvgLine
      x1="56%"
      x2="82%"
      y1={y(targetPrice)}
      y2={y(targetPrice)}
      stroke={color}
      strokeOpacity={0.7}
      strokeWidth={1}
    />
  );
};

const Sparkline = ({
  data,
  color,
  targetPrice,
}: {
  data: number[];
  color: string;
  targetPrice?: number;
}) => {
  const tw = useTailwind();
  const displayData = getSparklineDisplayData(data);
  const { yMin, yMax } = getSparklineRange(data, targetPrice);

  return (
    <Box
      testID={PredictCryptoUpDownMarketCardSelectorsIDs.SPARKLINE}
      twClassName="h-[126px] w-full"
    >
      <AreaChart
        style={tw.style(`h-[${SPARKLINE_HEIGHT}px] w-full`)}
        data={displayData}
        svg={{ fill: 'url(#cryptoFeedSparklineGradient)' }}
        contentInset={SPARKLINE_CONTENT_INSET}
        yMin={yMin}
        yMax={yMax}
        numberOfTicks={2}
        curve={SPARKLINE_CURVE}
      >
        <Defs key="crypto-feed-sparkline-gradient">
          <LinearGradient
            id="cryptoFeedSparklineGradient"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <Stop offset="0" stopColor={color} stopOpacity={0.42} />
            <Stop offset="0.42" stopColor={color} stopOpacity={0.22} />
            <Stop offset="0.82" stopColor={color} stopOpacity={0.04} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </LinearGradient>
        </Defs>
      </AreaChart>
      <LineChart
        style={tw.style(`absolute inset-0 h-[${SPARKLINE_HEIGHT}px] w-full`)}
        data={displayData}
        svg={{ stroke: color, strokeWidth: 3 }}
        contentInset={SPARKLINE_CONTENT_INSET}
        yMin={yMin}
        yMax={yMax}
        numberOfTicks={2}
        curve={SPARKLINE_CURVE}
      >
        <TargetLine targetPrice={targetPrice} color={color} />
      </LineChart>
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
  const durationMs = getDurationMs(market);
  const [windowMs, setWindowMs] = useState(() =>
    getCurrentWindowMs(durationMs),
  );
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    setWindowMs(getCurrentWindowMs(durationMs));
  }, [durationMs]);

  useEffect(() => {
    const interval = setInterval(() => {
      setNowMs(Date.now());
      const nextWindowMs = getCurrentWindowMs(durationMs);
      setWindowMs((currentWindowMs) =>
        currentWindowMs === nextWindowMs ? currentWindowMs : nextWindowMs,
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [durationMs]);

  const seriesQueryParams = useMemo(
    () => ({
      seriesId: market.series.id,
      endDateMin: new Date(
        windowMs - MARKET_WINDOW_LOOKBACK * durationMs,
      ).toISOString(),
      endDateMax: new Date(
        windowMs + MARKET_WINDOW_LOOKAHEAD * durationMs,
      ).toISOString(),
    }),
    [durationMs, market.series.id, windowMs],
  );

  const { data: seriesMarkets, isLoading: isSeriesLoading } =
    usePredictSeries(seriesQueryParams);
  const selectedMarket = useMemo(
    () => resolveSelectedMarket(market, seriesMarkets),
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
  const sparklineData = useMemo(
    () =>
      chartData.data
        .slice(-SPARKLINE_POINT_LIMIT)
        .map((point) => point.value)
        .filter((value) => Number.isFinite(value)),
    [chartData.data],
  );
  const latestPrice =
    chartData.data.at(-1)?.value ??
    (chartData.value > 0 ? chartData.value : undefined);
  const targetLineTop = getTargetLineTop({
    targetPrice: validatedTargetPrice,
    ...getSparklineRange(sparklineData, validatedTargetPrice),
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
  const countdown = formatCountdown(selectedMarket.endDate, nowMs);
  const progressRemaining = getProgressRemaining(
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
    navigation.navigate(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_DETAILS,
      params: {
        marketId: selectedMarket.id,
        entryPoint: resolvedEntryPoint,
        title: cardTitle,
        image: imageUrl,
      },
    });
  }, [
    cardTitle,
    imageUrl,
    navigation,
    onCardPress,
    resolvedEntryPoint,
    selectedMarket.id,
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
            data={sparklineData}
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
