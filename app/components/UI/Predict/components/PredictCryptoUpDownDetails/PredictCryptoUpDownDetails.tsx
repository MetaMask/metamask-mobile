import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Image,
  RefreshControl,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Box,
  BoxFlexDirection,
  FontWeight,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useTheme } from '../../../../../util/theme';
import HeaderCompactStandard from '../../../../../component-library/components-temp/HeaderCompactStandard';
import TitleSubpage from '../../../../../component-library/components-temp/TitleSubpage';
import {
  PredictMarketStatus,
  type PredictMarket,
  type PredictOutcomeToken,
  type PredictSeries,
} from '../../types';
import { formatCurrencyValue, formatMarketEndDate } from '../../utils/format';
import usePredictShare from '../../hooks/usePredictShare';
import { useCryptoTargetPrice } from '../../hooks/useCryptoTargetPrice';
import { PredictCryptoUpDownDetailsSelectorsIDs } from '../../Predict.testIds';
import { usePredictSeries } from '../../hooks/usePredictSeries';
import {
  RECURRENCE_TO_DURATION_SECS,
  getCryptoSymbol,
  getEventStartTime,
  getVariant,
} from '../../utils/cryptoUpDown';
import { TimeSlotPicker } from '../TimeSlotPicker';
import { findLiveMarket } from '../TimeSlotPicker/TimeSlotPicker.utils';
import PredictCryptoUpDownChart from '../PredictCryptoUpDownChart';
import PredictMarketDetailsActions from '../../views/PredictMarketDetails/components/PredictMarketDetailsActions';
import { useOpenOutcomes } from '../../views/PredictMarketDetails/hooks/useOpenOutcomes';

const CHART_HEIGHT_MIN = 420;
const CHART_HEIGHT_MAX = 560;
const MARKET_ROLLOVER_TIMEOUT_MAX_MS = 2_147_483_647;
const NOOP = () => undefined;
const DEFAULT_CRYPTO_ACCENT_COLOR = 'rgb(245, 158, 11)';
const CRYPTO_SYMBOL_TO_ACCENT_COLOR: Record<string, string> = {
  BTC: 'rgb(247, 147, 26)',
};

const getCurrentWindowMs = (durationMs: number) => {
  const currentTimeMs = Date.now();
  if (!Number.isFinite(currentTimeMs) || durationMs <= 0) {
    return 0;
  }

  return Math.floor(currentTimeMs / durationMs) * durationMs;
};

type PredictMarketWithSeries = PredictMarket & { series: PredictSeries };

const getEndDateTime = (endDate?: string) => {
  if (!endDate) {
    return undefined;
  }

  const time = new Date(endDate).getTime();
  return Number.isFinite(time) ? time : undefined;
};

const hasMarketEnded = (market: PredictMarket) => {
  const endDateTime = getEndDateTime(market.endDate);
  return typeof endDateTime === 'number' && Date.now() >= endDateTime;
};

export interface PredictCryptoUpDownDetailsProps {
  market: PredictMarket & { series: PredictSeries };
  onBack: () => void;
  onRefresh?: () => Promise<void>;
  refreshing?: boolean;
  onBetPress?: (
    token: PredictOutcomeToken,
    market?: PredictMarket & { series: PredictSeries },
  ) => void;
  onClaimPress?: () => void;
  isClaimablePositionsLoading?: boolean;
  hasPositivePnl?: boolean;
  isMarketLoading?: boolean;
  isClaimPending?: boolean;
}

const PredictCryptoUpDownDetails: React.FC<PredictCryptoUpDownDetailsProps> = ({
  market,
  onBack,
  onBetPress,
  onClaimPress,
  onRefresh,
  refreshing = false,
  isClaimablePositionsLoading = false,
  hasPositivePnl = false,
  isMarketLoading = false,
  isClaimPending = false,
}) => {
  const tw = useTailwind();
  const { colors } = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const chartAreaHeight = Math.min(
    CHART_HEIGHT_MAX,
    Math.max(CHART_HEIGHT_MIN, Math.round(windowHeight * 0.55)),
  );
  const [selectedMarket, setSelectedMarket] =
    useState<PredictMarketWithSeries>(market);
  const previousMarketIdRef = useRef(market.id);
  const marketRef = useRef(market);
  const [currentPrice, setCurrentPrice] = useState<number>();
  marketRef.current = market;

  const { handleSharePress } = usePredictShare({
    marketId: selectedMarket.id,
    marketSlug: selectedMarket.slug,
  });

  const recurrence = selectedMarket.series.recurrence;
  const durationSecs = RECURRENCE_TO_DURATION_SECS[recurrence] ?? 5 * 60;
  const durationMs = Number.isFinite(durationSecs)
    ? durationSecs * 1000
    : 5 * 60 * 1000;
  const selectedEndDateMs = getEndDateTime(selectedMarket.endDate);
  const [currentWindowState, setCurrentWindowState] = useState(() => ({
    durationMs,
    windowMs: getCurrentWindowMs(durationMs),
  }));
  const currentWindowMs =
    currentWindowState.durationMs === durationMs
      ? currentWindowState.windowMs
      : getCurrentWindowMs(durationMs);
  const { endDateMin, endDateMax } = useMemo(() => {
    const seriesWindowAnchorMs = Math.max(
      currentWindowMs,
      selectedEndDateMs ?? Number.NEGATIVE_INFINITY,
    );

    return {
      endDateMin: new Date(seriesWindowAnchorMs - 3 * durationMs).toISOString(),
      endDateMax: new Date(
        seriesWindowAnchorMs + 10 * durationMs,
      ).toISOString(),
    };
  }, [currentWindowMs, durationMs, selectedEndDateMs]);

  const { data: seriesMarkets } = usePredictSeries({
    seriesId: market.series.id,
    endDateMin,
    endDateMax,
  });
  const currentSeriesMarkets = useMemo(() => {
    if (!seriesMarkets?.length) {
      return undefined;
    }

    const hasCurrentSeriesMarket = seriesMarkets.some(
      (seriesMarket) =>
        seriesMarket.id === market.id ||
        seriesMarket.series?.id === market.series.id,
    );

    return hasCurrentSeriesMarket ? seriesMarkets : undefined;
  }, [market.id, market.series.id, seriesMarkets]);

  const targetPriceSymbol = getCryptoSymbol(selectedMarket);
  const targetPriceEventStartTime = getEventStartTime(
    selectedMarket.endDate,
    selectedMarket.series.recurrence,
  );
  const { data: targetPrice } = useCryptoTargetPrice({
    eventId: selectedMarket.id,
    symbol: targetPriceSymbol ?? '',
    eventStartTime: targetPriceEventStartTime ?? '',
    variant: getVariant(selectedMarket.series.recurrence),
    endDate: selectedMarket.endDate ?? '',
    enabled:
      !!targetPriceSymbol &&
      !!targetPriceEventStartTime &&
      !!selectedMarket.endDate,
  });
  const validatedTargetPrice =
    typeof targetPrice === 'number' && targetPrice > 0
      ? targetPrice
      : undefined;

  const {
    openOutcomes: selectedOpenOutcomes,
    yesPercentage: selectedYesPercentage,
  } = useOpenOutcomes({
    market: selectedMarket,
    isMarketFetching: isMarketLoading,
  });
  const canClaim = Boolean(onClaimPress && hasPositivePnl);
  const shouldRenderActions = Boolean(onBetPress || canClaim);

  const handleCurrentPriceChange = useCallback((value: number) => {
    setCurrentPrice(value);
  }, []);

  useEffect(() => {
    let isActive = true;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const scheduleNextWindowRefresh = () => {
      if (!isActive) {
        return;
      }

      const currentTimeMs = Date.now();
      const remainder =
        Number.isFinite(currentTimeMs) && durationMs > 0
          ? currentTimeMs % durationMs
          : 0;
      const timeUntilNextWindow =
        remainder > 0 ? durationMs - remainder : durationMs;

      timeout = setTimeout(() => {
        if (!isActive) {
          return;
        }

        setCurrentWindowState({
          durationMs,
          windowMs: getCurrentWindowMs(durationMs),
        });
        scheduleNextWindowRefresh();
      }, timeUntilNextWindow);
    };

    setCurrentWindowState({
      durationMs,
      windowMs: getCurrentWindowMs(durationMs),
    });
    scheduleNextWindowRefresh();

    return () => {
      isActive = false;
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [durationMs]);

  const handleBuyPress = useCallback(
    (token: PredictOutcomeToken) => {
      onBetPress?.(token, selectedMarket);
    },
    [onBetPress, selectedMarket],
  );

  useEffect(() => {
    setCurrentPrice(undefined);
  }, [selectedMarket.id]);

  const attachSeries = useCallback(
    (nextMarket: PredictMarket): PredictMarketWithSeries => ({
      ...nextMarket,
      series: nextMarket.series ?? market.series,
    }),
    [market.series],
  );

  const getNextSelectedMarket = useCallback(
    (currentMarket: PredictMarketWithSeries): PredictMarketWithSeries => {
      if (!currentSeriesMarkets?.length) {
        return currentMarket;
      }

      const currentMarketFromSeries = currentSeriesMarkets.find(
        (seriesMarket) => seriesMarket.id === currentMarket.id,
      );
      const marketToEvaluate = currentMarketFromSeries ?? currentMarket;

      if (hasMarketEnded(marketToEvaluate)) {
        const liveMarket = findLiveMarket(currentSeriesMarkets);
        if (liveMarket && liveMarket.id !== marketToEvaluate.id) {
          return attachSeries(liveMarket);
        }
      }

      return currentMarketFromSeries
        ? attachSeries(currentMarketFromSeries)
        : currentMarket;
    },
    [attachSeries, currentSeriesMarkets],
  );

  useEffect(() => {
    const nextMarket = marketRef.current;
    const propMarketChanged = previousMarketIdRef.current !== nextMarket.id;
    previousMarketIdRef.current = nextMarket.id;

    setSelectedMarket((currentMarket) => {
      if (propMarketChanged || currentMarket.id === nextMarket.id) {
        return nextMarket;
      }

      return currentMarket;
    });
  }, [market.id]);

  // Keep the selected market fresh when the series query updates, and advance
  // expired selections to the live slot when one exists.
  useEffect(() => {
    if (!currentSeriesMarkets?.length) return;

    setSelectedMarket((currentMarket) => getNextSelectedMarket(currentMarket));
  }, [currentSeriesMarkets, getNextSelectedMarket]);

  const advanceExpiredSelection = useCallback(
    (expectedMarketId?: string) => {
      setSelectedMarket((currentMarket) => {
        if (expectedMarketId && currentMarket.id !== expectedMarketId) {
          return currentMarket;
        }

        return getNextSelectedMarket(currentMarket);
      });
    },
    [getNextSelectedMarket],
  );

  useEffect(() => {
    const selectedEndDateTime = getEndDateTime(selectedMarket.endDate);
    if (
      typeof selectedEndDateTime !== 'number' ||
      !currentSeriesMarkets?.length
    ) {
      return undefined;
    }

    const selectedMarketId = selectedMarket.id;
    const nowMs = Date.now();
    if (nowMs >= selectedEndDateTime) {
      advanceExpiredSelection(selectedMarketId);
      return undefined;
    }

    const delayMs = selectedEndDateTime - nowMs + 1000;
    if (delayMs > MARKET_ROLLOVER_TIMEOUT_MAX_MS) {
      return undefined;
    }

    const timeout = setTimeout(
      () => advanceExpiredSelection(selectedMarketId),
      delayMs,
    );

    return () => clearTimeout(timeout);
  }, [
    advanceExpiredSelection,
    currentSeriesMarkets,
    selectedMarket.endDate,
    selectedMarket.id,
  ]);

  const title = selectedMarket.series.title;
  const subtitle = selectedMarket.endDate
    ? formatMarketEndDate(selectedMarket.endDate)
    : undefined;
  const currentPriceDelta =
    typeof currentPrice === 'number' && typeof validatedTargetPrice === 'number'
      ? currentPrice - validatedTargetPrice
      : undefined;
  const currentPriceDeltaColor =
    typeof currentPriceDelta !== 'number'
      ? TextColor.TextAlternative
      : currentPriceDelta >= 0
        ? TextColor.SuccessDefault
        : TextColor.ErrorDefault;
  const currentPriceAccentColor =
    CRYPTO_SYMBOL_TO_ACCENT_COLOR[targetPriceSymbol ?? ''] ??
    DEFAULT_CRYPTO_ACCENT_COLOR;

  return (
    <SafeAreaView
      style={tw.style('flex-1 bg-default')}
      edges={['left', 'right', 'top']}
      testID={PredictCryptoUpDownDetailsSelectorsIDs.SCREEN}
    >
      <HeaderCompactStandard
        onBack={onBack}
        backButtonProps={{
          testID: PredictCryptoUpDownDetailsSelectorsIDs.BACK_BUTTON,
        }}
        endButtonIconProps={[
          {
            iconName: IconName.Share,
            onPress: handleSharePress,
            testID: PredictCryptoUpDownDetailsSelectorsIDs.SHARE_BUTTON,
          },
        ]}
        testID={PredictCryptoUpDownDetailsSelectorsIDs.HEADER}
      />

      <ScrollView
        testID={PredictCryptoUpDownDetailsSelectorsIDs.SCROLL_VIEW}
        style={tw.style('flex-1')}
        contentContainerStyle={tw.style('pb-4')}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary.default}
            colors={[colors.primary.default]}
          />
        }
      >
        <Box testID={PredictCryptoUpDownDetailsSelectorsIDs.TITLE_SECTION}>
          <TitleSubpage
            startAccessory={
              <Box twClassName="w-10 h-10 rounded-lg bg-muted overflow-hidden">
                {selectedMarket.image ? (
                  <Image
                    source={{ uri: selectedMarket.image }}
                    style={tw.style('w-full h-full')}
                    resizeMode="cover"
                  />
                ) : (
                  <Box twClassName="w-full h-full bg-muted" />
                )}
              </Box>
            }
            title={title}
            bottomLabel={subtitle}
            twClassName="px-4 pt-1 pb-3"
          />
        </Box>

        <TimeSlotPicker
          markets={currentSeriesMarkets ?? []}
          selectedMarketId={selectedMarket.id}
          onMarketSelected={(m) => setSelectedMarket(attachSeries(m))}
        />

        <Box
          flexDirection={BoxFlexDirection.Row}
          twClassName="px-4 pt-5 gap-4"
          testID={PredictCryptoUpDownDetailsSelectorsIDs.PRICE_SUMMARY}
        >
          <Box twClassName="flex-1">
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              Price to beat
            </Text>
            <Text
              variant={TextVariant.HeadingLg}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextAlternative}
            >
              {formatCurrencyValue(validatedTargetPrice) ?? '--'}
            </Text>
          </Box>
          <Box twClassName="flex-1">
            <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-1">
              <Text
                variant={TextVariant.BodySm}
                fontWeight={FontWeight.Medium}
                style={tw.style({ color: currentPriceAccentColor })}
              >
                Current price
              </Text>
              {currentPriceDelta !== undefined && (
                <Text
                  variant={TextVariant.BodySm}
                  fontWeight={FontWeight.Medium}
                  color={currentPriceDeltaColor}
                >
                  {formatCurrencyValue(currentPriceDelta, { showSign: true })}
                </Text>
              )}
            </Box>
            <Text
              variant={TextVariant.HeadingLg}
              fontWeight={FontWeight.Medium}
              style={tw.style({ color: currentPriceAccentColor })}
            >
              {formatCurrencyValue(currentPrice) ?? '--'}
            </Text>
          </Box>
        </Box>

        <Box twClassName="px-4 pt-3">
          <PredictCryptoUpDownChart
            market={selectedMarket}
            targetPrice={validatedTargetPrice}
            onCurrentPriceChange={handleCurrentPriceChange}
            color={currentPriceAccentColor}
            height={chartAreaHeight}
          />
        </Box>
      </ScrollView>

      {shouldRenderActions && (
        <Box twClassName="px-4 pb-8">
          <PredictMarketDetailsActions
            isClaimablePositionsLoading={isClaimablePositionsLoading}
            hasPositivePnl={canClaim}
            marketStatus={selectedMarket.status as PredictMarketStatus}
            singleOutcomeMarket={selectedMarket.outcomes.length === 1}
            isMarketLoading={isMarketLoading}
            market={selectedMarket}
            openOutcomes={selectedOpenOutcomes}
            yesPercentage={selectedYesPercentage}
            onClaimPress={onClaimPress ?? NOOP}
            onBuyPress={handleBuyPress}
            isClaimPending={isClaimPending}
            showPayoutEstimate
          />
        </Box>
      )}
    </SafeAreaView>
  );
};

export default PredictCryptoUpDownDetails;
