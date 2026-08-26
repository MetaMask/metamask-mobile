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
import { useTheme } from '../../../../../../util/theme';
import { useMarketHistory } from '../../../hooks/useMarketHistory';
import type {
  PredictMarket,
  PredictMarketHistoryRange,
  PredictTeam,
  PredictVenueId,
} from '../../../types';
import {
  formatProbabilityChange,
  roundProbabilityToWhole,
} from '../../../utils/formatProbability';
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
  points: readonly { timestamp: string; yesPrice: string }[],
): PredictMarketChartPoint[] =>
  points.map((point) => ({
    time: Date.parse(point.timestamp),
    value: Number(point.yesPrice),
  }));

interface MarketHistoryContentProps {
  range: PredictMarketHistoryRange;
  onRangeChange: (range: PredictMarketHistoryRange) => void;
  series: readonly MarketHistorySeries[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  header?: React.ReactNode;
}

const MarketHistoryContent = ({
  range,
  onRangeChange,
  series,
  isLoading,
  isError,
  onRetry,
  header,
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

  return (
    <Box twClassName="gap-4" testID={PredictMarketHistoryTestIds.VIEW}>
      {header}

      {isLoading ? (
        <Box
          accessible
          accessibilityLabel="Loading Market history"
          accessibilityRole="progressbar"
          testID={PredictMarketHistoryTestIds.LOADING}
          style={chartStateStyle}
          twClassName="rounded-2xl bg-muted"
        />
      ) : isError ? (
        <Box
          testID={PredictMarketHistoryTestIds.ERROR}
          style={chartStateStyle}
          twClassName="items-center justify-center gap-4 rounded-2xl bg-muted px-6"
        >
          <Text
            accessibilityRole="alert"
            testID={PredictMarketHistoryTestIds.ERROR_MESSAGE}
          >
            Market history could not be loaded.
          </Text>
          <Button testID={PredictMarketHistoryTestIds.RETRY} onPress={onRetry}>
            Retry
          </Button>
        </Box>
      ) : !hasDrawableSeries ? (
        <Box
          testID={PredictMarketHistoryTestIds.EMPTY}
          style={chartStateStyle}
          twClassName="items-center justify-center rounded-2xl bg-muted px-6"
        >
          <Text color={TextColor.TextAlternative}>
            Market history is not available for this range.
          </Text>
        </Box>
      ) : (
        <Box twClassName="-ml-4">
          <PredictMarketChart
            testID={PredictMarketHistoryTestIds.CHART}
            series={chartSeries}
          />
        </Box>
      )}

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
  const latestPoint = points[points.length - 1];
  const initialPoint = points[0];
  const series: MarketHistorySeries[] = [
    ...(yesOutcome
      ? [
          {
            id: yesOutcome.id,
            label: yesOutcome.label || 'Yes',
            color: colors.primary.default,
            points: points.map((point) => ({
              time: Date.parse(point.timestamp),
              value: Number(point.yesPrice),
            })),
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
                : 'No',
            color: colors.error.default,
            points: points.map((point) => ({
              time: Date.parse(point.timestamp),
              value: Number(point.noPrice),
            })),
          },
        ]
      : []),
  ];
  const latestProbability = latestPoint
    ? `${roundProbabilityToWhole(latestPoint.yesPrice)}%`
    : undefined;
  const changeLabel =
    points.length >= 2 && latestPoint && initialPoint
      ? formatProbabilityChange(initialPoint.yesPrice, latestPoint.yesPrice)
      : undefined;
  const header = (
    <Box twClassName="gap-1">
      <Text variant={TextVariant.HeadingSm}>Market history</Text>
      <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
        Latest Yes probability
      </Text>
      {latestProbability ? (
        <Box twClassName="flex-row items-baseline gap-2">
          <Text variant={TextVariant.DisplayMd}>{latestProbability}</Text>
          {changeLabel ? (
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
            >
              {changeLabel}
            </Text>
          ) : null}
        </Box>
      ) : null}
    </Box>
  );

  return (
    <MarketHistoryContent
      range={range}
      onRangeChange={setRange}
      series={series}
      isLoading={historyQuery.isLoading && !historyQuery.data}
      isError={historyQuery.isError && !historyQuery.data}
      onRetry={() => historyQuery.refetch()}
      header={header}
    />
  );
};

interface PredictGameMarketHistoryProps {
  venueId: PredictVenueId;
  home: { market: PredictMarket; team: PredictTeam };
  away: { market: PredictMarket; team: PredictTeam };
}

const getCompactTeamLabel = (team: PredictTeam) => {
  const words = team.name.trim().split(/\s+/);
  return words[words.length - 1] || team.abbreviation || team.name;
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
  // The Predict API merges both team markets of a game into complementary
  // series, so each line plots its own market's history unchanged.
  const series: MarketHistorySeries[] = [
    {
      id: home.market.id,
      label: getCompactTeamLabel(home.team),
      color: home.team.primaryColor ?? colors.success.default,
      points: toChartPoints(homeHistory.data?.points ?? []),
    },
    {
      id: away.market.id,
      label: getCompactTeamLabel(away.team),
      color: away.team.primaryColor ?? colors.info.default,
      points: toChartPoints(awayHistory.data?.points ?? []),
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
