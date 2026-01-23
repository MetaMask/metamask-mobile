import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import { PredictGameStatus, PredictPriceHistoryInterval } from '../../types';
import { usePredictPriceHistory } from '../../hooks/usePredictPriceHistory';
import { useLiveMarketPrices } from '../../hooks/useLiveMarketPrices';
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

const getMinuteTimestamp = (timestamp: number): number =>
  Math.floor(timestamp / 60000) * 60000;

const toMilliseconds = (timestamp: number): number =>
  timestamp < 10_000_000_000 ? timestamp * 1000 : timestamp;

const toUnixSeconds = (isoString: string): number =>
  Math.floor(new Date(isoString).getTime() / 1000);

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
  providerId = 'polymarket',
  testID,
}) => {
  const game = market.game;
  const gameStatus = game?.status;
  const isGameEnded = gameStatus === 'ended';
  const isGameOngoing = gameStatus === 'ongoing';

  const tokenIds = useMemo(() => {
    const tokens = market.outcomes[0]?.tokens ?? [];
    return tokens.map((t) => t.id);
  }, [market.outcomes]);

  const seriesConfig: [GameChartSeriesConfig, GameChartSeriesConfig] | null =
    useMemo(() => {
      if (!game) return null;
      return [
        { label: game.awayTeam.abbreviation, color: game.awayTeam.color },
        { label: game.homeTeam.abbreviation, color: game.homeTeam.color },
      ];
    }, [game]);

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
      providerId,
      enabled: tokenIds.length === 2,
    });

  const { prices } = useLiveMarketPrices(tokenIds, {
    enabled: isLive && tokenIds.length === 2,
  });

  const historicalChartData: GameChartSeries[] = useMemo(() => {
    if (priceHistories.length < 2 || !seriesConfig) return [];

    return tokenIds.map((_tokenId, index) => {
      const history = priceHistories[index] ?? [];
      const config = seriesConfig[index];

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
      historicalChartData.length === 2 &&
      historicalChartData[0].data.length > 0 &&
      historicalChartData[1].data.length > 0
    ) {
      setLiveChartData(historicalChartData);
      initialDataLoadedRef.current = true;
    }
  }, [isLive, historicalChartData, isFetching]);

  const updateLiveData = useCallback(() => {
    if (!isLive || !initialDataLoadedRef.current || prices.size === 0) return;

    const now = Date.now();
    const currentMinute = getMinuteTimestamp(now);

    setLiveChartData((prevData) => {
      if (prevData.length !== 2) return prevData;

      const lastPointSeries0 = prevData[0].data[prevData[0].data.length - 1];
      if (!lastPointSeries0) return prevData;

      const lastMinute = getMinuteTimestamp(lastPointSeries0.timestamp);
      const isNewMinute = currentMinute !== lastMinute;

      const newData = prevData.map((series, index) => {
        const tokenId = tokenIds[index];
        const priceUpdate = prices.get(tokenId);
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
  }, [isLive, prices, tokenIds]);

  useEffect(() => {
    updateLiveData();
  }, [updateLiveData]);

  const handleTimeframeChange = useCallback((newTimeframe: ChartTimeframe) => {
    setTimeframe(newTimeframe);
  }, []);

  const handleRetry = useCallback(() => {
    refetch();
  }, [refetch]);

  const chartData = isLive ? liveChartData : historicalChartData;
  const hasChartData =
    chartData.length >= 2 &&
    chartData[0]?.data?.length > 0 &&
    chartData[1]?.data?.length > 0;
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
