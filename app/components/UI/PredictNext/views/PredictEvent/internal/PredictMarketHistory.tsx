import React, { useState } from 'react';
import { Image, StyleSheet } from 'react-native';
import METAMASK_WORDMARK from '../../../../../../images/branding/metamask-name.png';
import {
  Box,
  Button,
  FilterButton,
  FilterButtonGroup,
  FilterButtonVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import { useTheme } from '../../../../../../util/theme';
import { useMarketHistory } from '../../../hooks/useMarketHistory';
import type {
  PredictMarket,
  PredictMarketHistoryPoint,
  PredictMarketHistoryRange,
  PredictOutcome,
  PredictTeam,
  PredictVenueId,
} from '../../../types';
import {
  PREDICT_MARKET_CHART_HEIGHT,
  PredictMarketChart,
  type PredictMarketChartPoint,
  type PredictMarketChartSeries,
} from './PredictMarketChart';
import { PredictMarketHistoryTestIds } from './PredictMarketHistory.testIds';

const HISTORY_RANGES: readonly PredictMarketHistoryRange[] = [
  '1D',
  '1W',
  '1M',
  'ALL',
];

const styles = StyleSheet.create({
  rangeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 24,
    marginTop: 12,
    width: '100%',
  },
  wordmark: {
    height: 24,
    resizeMode: 'contain',
    width: 49,
  },
  rangeGroup: {
    flex: 1,
  },
  rangeGroupContent: {
    flexGrow: 1,
  },
  rangeFilter: {
    flex: 1,
    height: 34,
    minHeight: 34,
    minWidth: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
});

interface MarketHistorySeries {
  id: string;
  label: string;
  color: string;
  points: readonly PredictMarketChartPoint[];
}

const toChartPoints = (
  points: readonly PredictMarketHistoryPoint[],
  field: 'yesPrice' | 'noPrice',
): PredictMarketChartPoint[] =>
  points.map((point) => ({
    time: Date.parse(point.timestamp),
    value: Number(point[field]),
  }));

interface MarketHistoryContentProps {
  range: PredictMarketHistoryRange;
  onRangeChange: (range: PredictMarketHistoryRange) => void;
  series: readonly MarketHistorySeries[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

const MarketHistoryContent = ({
  range,
  onRangeChange,
  series,
  isLoading,
  isError,
  onRetry,
}: MarketHistoryContentProps) => {
  const { colors } = useTheme();
  const chartStateStyle = { height: PREDICT_MARKET_CHART_HEIGHT };
  const chartSeries: PredictMarketChartSeries[] = series
    .filter((entry) => entry.points.length >= 2)
    .map((entry) => ({
      id: entry.id,
      label: entry.label,
      color: entry.color,
      data: entry.points,
    }));
  const hasDrawableSeries = chartSeries.length > 0;

  const renderChartState = () => {
    if (isLoading) {
      return (
        <Box
          accessible
          accessibilityLabel={strings(
            'predict.history.loading_accessibility_label',
          )}
          accessibilityRole="progressbar"
          testID={PredictMarketHistoryTestIds.LOADING}
          style={chartStateStyle}
          twClassName="rounded-2xl bg-muted"
        />
      );
    }

    if (isError) {
      return (
        <Box
          testID={PredictMarketHistoryTestIds.ERROR}
          style={chartStateStyle}
          twClassName="items-center justify-center gap-4 rounded-2xl bg-muted px-6"
        >
          <Text
            accessibilityRole="alert"
            testID={PredictMarketHistoryTestIds.ERROR_MESSAGE}
          >
            {strings('predict.history.unable_to_load')}
          </Text>
          <Button testID={PredictMarketHistoryTestIds.RETRY} onPress={onRetry}>
            {strings('predict.error.retry')}
          </Button>
        </Box>
      );
    }

    if (!hasDrawableSeries) {
      return (
        <Box
          testID={PredictMarketHistoryTestIds.EMPTY}
          style={chartStateStyle}
          twClassName="items-center justify-center rounded-2xl bg-muted px-6"
        >
          <Text
            color={TextColor.TextAlternative}
            testID={PredictMarketHistoryTestIds.EMPTY_MESSAGE}
          >
            {strings('predict.history.unavailable_for_range')}
          </Text>
        </Box>
      );
    }

    return (
      <Box twClassName="-ml-4">
        <PredictMarketChart
          testID={PredictMarketHistoryTestIds.CHART}
          series={chartSeries}
        />
      </Box>
    );
  };

  return (
    <Box twClassName="gap-4" testID={PredictMarketHistoryTestIds.VIEW}>
      {renderChartState()}

      <Box style={styles.rangeRow}>
        <Image
          accessibilityIgnoresInvertColors
          source={METAMASK_WORDMARK}
          style={[styles.wordmark, { tintColor: colors.text.muted }]}
        />
        <FilterButtonGroup
          value={range}
          onChange={(value) =>
            onRangeChange(value as PredictMarketHistoryRange)
          }
          variant={FilterButtonVariant.Secondary}
          style={styles.rangeGroup}
          contentContainerStyle={styles.rangeGroupContent}
          testID={PredictMarketHistoryTestIds.RANGES}
        >
          {HISTORY_RANGES.map((option) => (
            <FilterButton
              key={option}
              value={option}
              accessibilityRole="tab"
              accessibilityState={{ selected: range === option }}
              style={styles.rangeFilter}
              testID={PredictMarketHistoryTestIds.range(option)}
            >
              {option}
            </FilterButton>
          ))}
        </FilterButtonGroup>
      </Box>
    </Box>
  );
};

interface PredictMarketHistoryProps {
  venueId: PredictVenueId;
  market: PredictMarket;
}

export const PredictMarketHistory = ({
  venueId,
  market,
}: PredictMarketHistoryProps) => {
  const { colors } = useTheme();
  const [range, setRange] = useState<PredictMarketHistoryRange>('ALL');
  const historyQuery = useMarketHistory(venueId, market.id, range);
  const yesOutcome = market.outcomes.find((outcome) => outcome.side === 'yes');
  const noOutcome = market.outcomes.find((outcome) => outcome.side === 'no');
  const points = historyQuery.data?.points ?? [];
  const series: MarketHistorySeries[] = [
    ...(yesOutcome
      ? [
          {
            id: yesOutcome.id,
            label: yesOutcome.label || strings('predict.market_details.yes'),
            color: colors.primary.default,
            points: toChartPoints(points, 'yesPrice'),
          },
        ]
      : []),
    ...(noOutcome
      ? [
          {
            id: noOutcome.id,
            label:
              noOutcome.label && noOutcome.label !== yesOutcome?.label
                ? noOutcome.label
                : strings('predict.market_details.no'),
            color: colors.error.default,
            points: toChartPoints(points, 'noPrice'),
          },
        ]
      : []),
  ];

  return (
    <MarketHistoryContent
      range={range}
      onRangeChange={setRange}
      series={series}
      isLoading={historyQuery.isLoading && !historyQuery.data}
      isError={historyQuery.isError && !historyQuery.data}
      onRetry={() => historyQuery.refetch()}
    />
  );
};

interface PredictGameMarketHistoryProps {
  venueId: PredictVenueId;
  home: { market: PredictMarket; outcome: PredictOutcome; team: PredictTeam };
  away: { market: PredictMarket; outcome: PredictOutcome; team: PredictTeam };
}

const getCompactTeamLabel = (team: PredictTeam) => {
  const words = team.name.trim().split(/\s+/);
  return words.at(-1) || team.abbreviation || team.name;
};

export const PredictGameMarketHistory = ({
  venueId,
  home,
  away,
}: PredictGameMarketHistoryProps) => {
  const { colors } = useTheme();
  const [range, setRange] = useState<PredictMarketHistoryRange>('ALL');
  const homeHistory = useMarketHistory(venueId, home.market.id, range);
  const awayHistory = useMarketHistory(venueId, away.market.id, range);
  const hasCompleteData = Boolean(homeHistory.data && awayHistory.data);
  // Each line plots the last-traded probability of the Outcome that
  // carries that Team's Game Selection.
  const series: MarketHistorySeries[] = [
    {
      id: home.outcome.id,
      label: getCompactTeamLabel(home.team),
      color: home.team.primaryColor ?? colors.success.default,
      points: toChartPoints(
        homeHistory.data?.points ?? [],
        home.outcome.side === 'no' ? 'noPrice' : 'yesPrice',
      ),
    },
    {
      id: away.outcome.id,
      label: getCompactTeamLabel(away.team),
      color: away.team.primaryColor ?? colors.info.default,
      points: toChartPoints(
        awayHistory.data?.points ?? [],
        away.outcome.side === 'no' ? 'noPrice' : 'yesPrice',
      ),
    },
  ];

  return (
    <MarketHistoryContent
      range={range}
      onRangeChange={setRange}
      series={series}
      isLoading={
        (homeHistory.isLoading || awayHistory.isLoading) && !hasCompleteData
      }
      isError={(homeHistory.isError || awayHistory.isError) && !hasCompleteData}
      onRetry={() => {
        homeHistory.refetch();
        awayHistory.refetch();
      }}
    />
  );
};
