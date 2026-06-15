import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import {
  PredictGameStatus,
  PredictMarket,
  PredictOutcome,
  PredictPriceHistoryInterval,
  PriceQuery,
  PriceUpdate,
} from '../../types';
import { usePredictPriceHistory } from '../../hooks/usePredictPriceHistory';
import {
  getPrimaryMoneylineOutcomes,
  isDrawCapableLeague,
} from '../../constants/sports';
import { useTheme } from '../../../../../util/theme';
import PredictGameChartContent from './PredictGameChartContent';
import {
  PredictGameChartProps,
  GameChartSeries,
  GameChartDataPoint,
  ChartTimeframe,
  GameChartSeriesConfig,
} from './PredictGameChart.types';

const TIMEFRAME_TO_INTERVAL: Record<
  Exclude<ChartTimeframe, 'live'>,
  PredictPriceHistoryInterval
> = {
  '1h': PredictPriceHistoryInterval.ONE_HOUR,
  '6h': PredictPriceHistoryInterval.SIX_HOUR,
  '1d': PredictPriceHistoryInterval.ONE_DAY,
  max: PredictPriceHistoryInterval.MAX,
};

const FIDELITY_BY_TIMEFRAME: Record<ChartTimeframe, number> = {
  live: 1,
  '1h': 1,
  '6h': 5,
  '1d': 15,
  max: 60,
};

const ENDED_GAME_FIDELITY = 2;
const EMPTY_LIVE_PRICES = new Map<string, PriceUpdate>();

const getMinuteTimestamp = (timestamp: number): number =>
  Math.floor(timestamp / 60000) * 60000;

const toMilliseconds = (timestamp: number): number =>
  timestamp < 10_000_000_000 ? timestamp * 1000 : timestamp;

const toUnixSeconds = (isoString: string): number =>
  Math.floor(new Date(isoString).getTime() / 1000);

const toPriceQuery = (
  outcome: PredictOutcome,
  outcomeTokenId: string,
): PriceQuery => ({
  marketId: outcome.marketId,
  outcomeId: outcome.id,
  outcomeTokenId,
  sportsMarketType: outcome.sportsMarketType,
});

export const getPredictGameChartPriceQueries = (
  market: PredictMarket,
): PriceQuery[] => {
  const game = market.game;
  const moneylineOutcomes = getPrimaryMoneylineOutcomes(market.outcomes);

  if (
    game?.league &&
    isDrawCapableLeague(game.league) &&
    moneylineOutcomes.length >= 3
  ) {
    return [...moneylineOutcomes]
      .sort((a, b) => (a.groupItemThreshold ?? 0) - (b.groupItemThreshold ?? 0))
      .flatMap((outcome) => {
        const token = outcome.tokens[0];
        return token ? [toPriceQuery(outcome, token.id)] : [];
      });
  }

  const outcome = moneylineOutcomes[0];
  return outcome
    ? outcome.tokens.map((token) => toPriceQuery(outcome, token.id))
    : [];
};

const getDefaultTimeframe = (
  gameStatus: PredictGameStatus | undefined,
): ChartTimeframe => {
  switch (gameStatus) {
    case 'ongoing':
      return 'live';
    case 'scheduled':
      return '6h';
    case 'ended':
      return 'max';
    default:
      return '6h';
  }
};

const PredictGameChart: React.FC<PredictGameChartProps> = ({
  market,
  livePrices = EMPTY_LIVE_PRICES,
  getLivePrice,
  livePriceVersion = 0,
  onLiveStatusChange,
  testID,
}) => {
  const game = market.game;
  const { colors } = useTheme();
  const gameStatus = game?.status;
  const isGameEnded = gameStatus === 'ended';
  const isGameOngoing = gameStatus === 'ongoing';
  const moneylineOutcomes = useMemo(
    () => getPrimaryMoneylineOutcomes(market.outcomes),
    [market.outcomes],
  );

  const tokenIds = useMemo(
    () =>
      getPredictGameChartPriceQueries(market).map(
        (query) => query.outcomeTokenId,
      ),
    [market],
  );

  const seriesConfig: GameChartSeriesConfig[] | null = useMemo(() => {
    if (!game) return null;
    if (isDrawCapableLeague(game.league) && moneylineOutcomes.length >= 3) {
      return [
        { label: game.homeTeam.abbreviation, color: game.homeTeam.color },
        { label: 'DRAW', color: colors.icon.muted },
        { label: game.awayTeam.abbreviation, color: game.awayTeam.color },
      ];
    }
    return [
      { label: game.awayTeam.abbreviation, color: game.awayTeam.color },
      { label: game.homeTeam.abbreviation, color: game.homeTeam.color },
    ];
  }, [game, moneylineOutcomes.length, colors.icon.muted]);

  const [timeframe, setTimeframe] = useState<ChartTimeframe>(() =>
    getDefaultTimeframe(gameStatus),
  );
  const [liveChartData, setLiveChartData] = useState<GameChartSeries[]>([]);
  const initialDataLoadedRef = useRef<boolean>(false);

  const isLive = timeframe === 'live' && isGameOngoing;
  const disabledTimeframeSelector = isGameEnded;

  const { startTs, endTs } = useMemo(() => {
    if (!isGameEnded || !game?.startTime) {
      return { startTs: undefined, endTs: undefined };
    }
    const start = toUnixSeconds(game.startTime);
    const end = game.endTime ? toUnixSeconds(game.endTime) : undefined;
    return { startTs: start, endTs: end };
  }, [isGameEnded, game?.startTime, game?.endTime]);

  const interval = useMemo(() => {
    if (isGameEnded) return undefined;
    if (timeframe === 'live') return PredictPriceHistoryInterval.ONE_HOUR;
    return TIMEFRAME_TO_INTERVAL[timeframe];
  }, [isGameEnded, timeframe]);

  const fidelity = isGameEnded
    ? ENDED_GAME_FIDELITY
    : FIDELITY_BY_TIMEFRAME[timeframe];

  const { priceHistories, isFetching, errors, refetch } =
    usePredictPriceHistory({
      marketIds: tokenIds,
      interval,
      startTs,
      endTs,
      fidelity,
      enabled: tokenIds.length >= 2,
    });

  useEffect(() => {
    onLiveStatusChange?.(isLive && tokenIds.length >= 2);
  }, [isLive, onLiveStatusChange, tokenIds.length]);

  const resolveLivePrice = useCallback(
    (tokenId: string): PriceUpdate | undefined =>
      getLivePrice?.(tokenId) ?? livePrices.get(tokenId),
    [getLivePrice, livePrices],
  );

  const historicalChartData: GameChartSeries[] = useMemo(() => {
    if (priceHistories.length < tokenIds.length || !seriesConfig) return [];

    return tokenIds.map((_tokenId, index) => {
      const history = priceHistories[index] ?? [];
      const config = seriesConfig[index];
      if (!config) return { label: '', color: '', data: [] };

      return {
        label: config.label,
        color: config.color,
        data: history.map((point) => ({
          timestamp:
            typeof point.timestamp === 'number'
              ? toMilliseconds(point.timestamp)
              : new Date(point.timestamp).getTime(),
          value: Number((point.price * 100).toFixed(2)),
        })),
      };
    });
  }, [priceHistories, tokenIds, seriesConfig]);

  useEffect(() => {
    if (isLive && isFetching) {
      initialDataLoadedRef.current = false;
      setLiveChartData([]);
    }
  }, [isLive, isFetching]);

  useEffect(() => {
    if (!isLive) {
      initialDataLoadedRef.current = false;
      setLiveChartData([]);
      return;
    }

    if (initialDataLoadedRef.current) {
      return;
    }

    if (isFetching) {
      return;
    }

    if (
      historicalChartData.length >= 2 &&
      historicalChartData.every((s) => s.data.length > 0)
    ) {
      setLiveChartData(historicalChartData);
      initialDataLoadedRef.current = true;
    }
  }, [isLive, historicalChartData, isFetching]);

  const updateLiveData = useCallback(() => {
    if (
      !isLive ||
      !initialDataLoadedRef.current ||
      !Number.isFinite(livePriceVersion)
    ) {
      return;
    }

    const hasLivePrice = tokenIds.some((tokenId) => resolveLivePrice(tokenId));
    if (!hasLivePrice) {
      return;
    }

    const now = Date.now();
    const currentMinute = getMinuteTimestamp(now);

    setLiveChartData((prevData) => {
      if (prevData.length < 2) return prevData;

      const lastPointSeries0 = prevData[0].data[prevData[0].data.length - 1];
      if (!lastPointSeries0) return prevData;

      const lastMinute = getMinuteTimestamp(lastPointSeries0.timestamp);
      const isNewMinute = currentMinute !== lastMinute;

      const newData = prevData.map((series, index) => {
        const tokenId = tokenIds[index];
        const priceUpdate = resolveLivePrice(tokenId);
        const existingData = [...series.data];
        const lastPoint = existingData[existingData.length - 1];

        const newValue = priceUpdate
          ? Number((priceUpdate.bestAsk * 100).toFixed(2))
          : (lastPoint?.value ?? 50);

        const newPoint: GameChartDataPoint = {
          timestamp: now,
          value: newValue,
        };

        if (isNewMinute) {
          existingData.push(newPoint);
          existingData.shift();
        } else if (existingData.length > 0) {
          existingData[existingData.length - 1] = newPoint;
        }

        return {
          ...series,
          data: existingData,
        };
      });

      return newData;
    });
  }, [isLive, livePriceVersion, resolveLivePrice, tokenIds]);

  useEffect(() => {
    updateLiveData();
  }, [updateLiveData]);

  const liveChartDataWithLatestPrices = useMemo(() => {
    if (
      !isLive ||
      liveChartData.length < 2 ||
      !Number.isFinite(livePriceVersion)
    ) {
      return liveChartData;
    }

    let hasLivePrice = false;
    const nextData = liveChartData.map((series, index) => {
      const tokenId = tokenIds[index];
      const priceUpdate = resolveLivePrice(tokenId);
      const lastPoint = series.data[series.data.length - 1];
      if (!priceUpdate || !lastPoint) {
        return series;
      }

      hasLivePrice = true;
      const nextSeriesData = [...series.data];
      nextSeriesData[nextSeriesData.length - 1] = {
        ...lastPoint,
        value: Number((priceUpdate.bestAsk * 100).toFixed(2)),
      };

      return {
        ...series,
        data: nextSeriesData,
      };
    });

    return hasLivePrice ? nextData : liveChartData;
  }, [isLive, liveChartData, livePriceVersion, resolveLivePrice, tokenIds]);

  const handleTimeframeChange = useCallback((newTimeframe: ChartTimeframe) => {
    setTimeframe(newTimeframe);
  }, []);

  const handleRetry = useCallback(() => {
    refetch();
  }, [refetch]);

  const chartData = isLive
    ? liveChartDataWithLatestPrices
    : historicalChartData;
  const hasChartData =
    chartData.length >= 2 && chartData.every((s) => s?.data?.length > 0);
  const isLoading =
    isFetching || !hasChartData || (isLive && !initialDataLoadedRef.current);

  const hasErrors = errors.some((error) => error !== null);
  const errorMessage = hasErrors
    ? (errors.find((error) => error !== null) ?? null)
    : null;

  if (!game || !seriesConfig) {
    return null;
  }

  return (
    <PredictGameChartContent
      data={chartData}
      isLoading={isLoading}
      error={errorMessage}
      onRetry={handleRetry}
      timeframe={timeframe}
      onTimeframeChange={handleTimeframeChange}
      disabledTimeframeSelector={disabledTimeframeSelector}
      testID={testID}
    />
  );
};

export default PredictGameChart;
