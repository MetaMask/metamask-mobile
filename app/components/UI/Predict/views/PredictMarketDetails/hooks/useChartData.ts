import { useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from '../../../../../../util/theme';
import { ChartSeries } from '../../../components/PredictDetailsChart/PredictDetailsChart';
import {
  DAY_IN_MS,
  getTimestampInMs,
} from '../../../components/PredictDetailsChart/utils';
import { usePredictPriceHistory } from '../../../hooks/usePredictPriceHistory';
import {
  PredictMarketStatus,
  PredictPriceHistoryInterval,
  type PredictMarket,
  type PredictOutcome,
} from '../../../types';

const PRICE_HISTORY_TIMEFRAMES: PredictPriceHistoryInterval[] = [
  PredictPriceHistoryInterval.ONE_HOUR,
  PredictPriceHistoryInterval.SIX_HOUR,
  PredictPriceHistoryInterval.ONE_DAY,
  PredictPriceHistoryInterval.ONE_WEEK,
  PredictPriceHistoryInterval.ONE_MONTH,
  PredictPriceHistoryInterval.MAX,
];

const DEFAULT_FIDELITY_BY_INTERVAL: Partial<
  Record<PredictPriceHistoryInterval, number>
> = {
  [PredictPriceHistoryInterval.ONE_HOUR]: 5, // 5-minute resolution for 1-hour window
  [PredictPriceHistoryInterval.SIX_HOUR]: 15, // 15-minute resolution for 6-hour window
  [PredictPriceHistoryInterval.ONE_DAY]: 60, // 1-hour resolution for 1-day window
  [PredictPriceHistoryInterval.ONE_WEEK]: 240, // 4-hour resolution for 7-day window
  [PredictPriceHistoryInterval.ONE_MONTH]: 720, // 12-hour resolution for month-long window
  [PredictPriceHistoryInterval.MAX]: 1440, // 24-hour resolution for max window
};

const MAX_INTERVAL_SHORT_RANGE_THRESHOLD_DAYS = 30;
const MAX_INTERVAL_SHORT_RANGE_MS =
  MAX_INTERVAL_SHORT_RANGE_THRESHOLD_DAYS * DAY_IN_MS;
const MAX_INTERVAL_SHORT_RANGE_FIDELITY =
  DEFAULT_FIDELITY_BY_INTERVAL[PredictPriceHistoryInterval.ONE_WEEK] ?? 240;

interface UseChartDataParams {
  market: PredictMarket | null;
  hasAnyOutcomeToken: boolean;
  providerId: string;
}

interface UseChartDataResult {
  chartOpenOutcomes: PredictOutcome[];
  chartData: ChartSeries[];
  chartEmptyLabel: string | undefined;
  selectedTimeframe: PredictPriceHistoryInterval;
  handleTimeframeChange: (timeframe: string) => void;
  isPriceHistoryFetching: boolean;
  refetchPriceHistory: () => Promise<void>;
  timeframes: PredictPriceHistoryInterval[];
}

export const useChartData = ({
  market,
  hasAnyOutcomeToken,
  providerId,
}: UseChartDataParams): UseChartDataResult => {
  const { colors } = useTheme();
  const [selectedTimeframe, setSelectedTimeframe] =
    useState<PredictPriceHistoryInterval>(
      PredictPriceHistoryInterval.ONE_MONTH,
    );
  const [maxIntervalAdaptiveFidelity, setMaxIntervalAdaptiveFidelity] =
    useState<number | null>(null);
  const maxFidelityLockedRef = useRef<boolean>(false);
  const prevTimeframeRef = useRef<PredictPriceHistoryInterval | null>(null);

  useEffect(() => {
    // if market is closed
    if (market?.status === PredictMarketStatus.CLOSED) {
      // set the setSelectedTimeframe to PredictPriceHistoryInterval.MAX
      setSelectedTimeframe(PredictPriceHistoryInterval.MAX);
    }
  }, [market?.status]);

  const chartOpenOutcomes = useMemo(
    () =>
      (market?.outcomes ?? [])
        .filter((outcome) => outcome.status === 'open')
        .slice(0, 3),
    [market?.outcomes],
  );

  const chartOutcomeTokenIds = useMemo(
    () =>
      chartOpenOutcomes
        .map((outcome) => outcome?.tokens?.[0]?.id)
        .filter((tokenId): tokenId is string => Boolean(tokenId)),
    [chartOpenOutcomes],
  );

  const selectedFidelity = useMemo(() => {
    if (
      selectedTimeframe === PredictPriceHistoryInterval.MAX &&
      maxIntervalAdaptiveFidelity
    ) {
      return maxIntervalAdaptiveFidelity;
    }

    return DEFAULT_FIDELITY_BY_INTERVAL[selectedTimeframe];
  }, [selectedTimeframe, maxIntervalAdaptiveFidelity]);
  const {
    priceHistories,
    isFetching: isPriceHistoryFetching,
    errors,
    refetch: refetchPriceHistory,
  } = usePredictPriceHistory({
    marketIds: chartOutcomeTokenIds,
    interval: selectedTimeframe,
    providerId,
    fidelity: selectedFidelity,
    enabled: chartOutcomeTokenIds.length > 0,
  });

  const primaryMaxIntervalRangeMs = useMemo(() => {
    if (selectedTimeframe !== PredictPriceHistoryInterval.MAX) {
      return null;
    }

    const primaryHistory = priceHistories[0] ?? [];
    if (primaryHistory.length === 0) {
      return null;
    }

    const timestamps = primaryHistory.map((point) =>
      getTimestampInMs(point.timestamp),
    );

    return Math.max(...timestamps) - Math.min(...timestamps);
  }, [priceHistories, selectedTimeframe]);

  useEffect(() => {
    const prevTimeframe = prevTimeframeRef.current;
    const justSwitchedToMax =
      selectedTimeframe === PredictPriceHistoryInterval.MAX &&
      prevTimeframe !== PredictPriceHistoryInterval.MAX;

    // update the ref for next render
    prevTimeframeRef.current = selectedTimeframe;

    // when switching away from MAX, reset the fidelity and unlock for next MAX selection
    if (selectedTimeframe !== PredictPriceHistoryInterval.MAX) {
      if (maxIntervalAdaptiveFidelity !== null) {
        setMaxIntervalAdaptiveFidelity(null);
      }
      maxFidelityLockedRef.current = false;
      return;
    }

    // skip if already locked to prevent feedback loop
    if (maxFidelityLockedRef.current) {
      return;
    }

    // wait for fetch to complete before making decisions
    if (isPriceHistoryFetching) {
      return;
    }

    // skip if just switched to MAX - data is still from previous timeframe
    if (justSwitchedToMax) {
      return;
    }

    // wait for valid range data before making a decision
    if (
      typeof primaryMaxIntervalRangeMs !== 'number' ||
      primaryMaxIntervalRangeMs <= 0
    ) {
      return;
    }

    // make one-shot fidelity decision and lock to prevent re-evaluation
    if (primaryMaxIntervalRangeMs < MAX_INTERVAL_SHORT_RANGE_MS) {
      setMaxIntervalAdaptiveFidelity(MAX_INTERVAL_SHORT_RANGE_FIDELITY);
    }
    maxFidelityLockedRef.current = true;
  }, [
    primaryMaxIntervalRangeMs,
    maxIntervalAdaptiveFidelity,
    selectedTimeframe,
    isPriceHistoryFetching,
  ]);

  const chartData: ChartSeries[] = useMemo(() => {
    const palette = [
      colors.primary.default,
      colors.error.default,
      colors.success.default,
    ];
    return chartOutcomeTokenIds.map((_tokenId, index) => ({
      label:
        chartOpenOutcomes[index]?.groupItemTitle ||
        chartOpenOutcomes[index]?.title ||
        `Outcome ${index + 1}`,
      color:
        chartOutcomeTokenIds.length === 1
          ? colors.success.default
          : (palette[index] ?? colors.success.default),
      data: (priceHistories[index] ?? []).map((point) => ({
        timestamp: point.timestamp,
        value: Number((point.price * 100).toFixed(2)),
      })),
    }));
  }, [
    chartOutcomeTokenIds,
    chartOpenOutcomes,
    priceHistories,
    colors.primary.default,
    colors.error.default,
    colors.success.default,
  ]);

  const chartEmptyLabel = hasAnyOutcomeToken
    ? (errors.find(Boolean) ?? undefined)
    : '';

  const handleTimeframeChange = (timeframe: string) => {
    if (
      PRICE_HISTORY_TIMEFRAMES.includes(
        timeframe as PredictPriceHistoryInterval,
      )
    ) {
      setSelectedTimeframe(timeframe as PredictPriceHistoryInterval);
    }
  };

  return {
    chartOpenOutcomes,
    chartData,
    chartEmptyLabel,
    selectedTimeframe,
    handleTimeframeChange,
    isPriceHistoryFetching,
    refetchPriceHistory,
    timeframes: PRICE_HISTORY_TIMEFRAMES,
  };
};
