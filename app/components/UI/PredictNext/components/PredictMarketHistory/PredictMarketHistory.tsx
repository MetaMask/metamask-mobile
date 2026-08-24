import React, { useState } from 'react';
import { Image, StyleSheet } from 'react-native';
import METAMASK_WORDMARK from '../../../../../images/branding/metamask-name.png';
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
import { useTheme } from '../../../../../util/theme';
import { useMarketHistory } from '../../hooks/useMarketHistory';
import type {
  PredictMarket,
  PredictMarketHistoryPoint,
  PredictMarketHistoryRange,
  PredictTeam,
  PredictVenueId,
} from '../../types';
import {
  formatProbabilityChange,
  roundProbabilityToWhole,
} from '../../utils/formatProbability';
import { PredictMarketChart } from '../PredictMarketChart';
import { PredictMarketHistoryTestIds } from './PredictMarketHistory.testIds';

const HISTORY_RANGES: readonly PredictMarketHistoryRange[] = [
  'LIVE',
  '1D',
  '1W',
  '1M',
  '1Y',
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
  points: readonly PredictMarketHistoryPoint[];
}

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
  const hasDrawableSeries =
    series.length > 0 && series.every((entry) => entry.points.length >= 2);
  const chartSeries = series.map((entry) => ({
    id: entry.id,
    label: entry.label,
    color: entry.color,
    data: entry.points.map((point) => ({
      time: Date.parse(point.timestamp),
      value: Number(point.yesPrice),
    })),
  }));

  return (
    <Box twClassName="gap-4" testID={PredictMarketHistoryTestIds.VIEW}>
      {header}

      {isLoading ? (
        <Box
          accessible
          accessibilityLabel="Loading Market history"
          testID={PredictMarketHistoryTestIds.LOADING}
          twClassName="h-44 rounded-2xl bg-muted"
        />
      ) : isError ? (
        <Box
          testID={PredictMarketHistoryTestIds.ERROR}
          twClassName="h-44 items-center justify-center gap-4 rounded-2xl bg-muted px-6"
        >
          <Text>Market history could not be loaded.</Text>
          <Button onPress={onRetry}>Retry</Button>
        </Box>
      ) : !hasDrawableSeries ? (
        <Box
          testID={PredictMarketHistoryTestIds.EMPTY}
          twClassName="h-44 items-center justify-center rounded-2xl bg-muted px-6"
        >
          <Text color={TextColor.TextAlternative}>
            Market history is not available for this range.
          </Text>
        </Box>
      ) : (
        <PredictMarketChart
          testID={PredictMarketHistoryTestIds.CHART}
          series={chartSeries}
        />
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
  const [range, setRange] = useState<PredictMarketHistoryRange>('LIVE');
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
            points,
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
              ...point,
              yesPrice: point.noPrice,
            })),
          },
        ]
      : []),
  ];
  const latestProbability = latestPoint
    ? `${roundProbabilityToWhole(latestPoint.yesPrice)}%`
    : undefined;
  const changeLabel =
    latestPoint && initialPoint
      ? formatProbabilityChange(initialPoint.yesPrice, latestPoint.yesPrice)
      : undefined;
  const header = (
    <Box twClassName="gap-1">
      <Text variant={TextVariant.HeadingSm}>Market history</Text>
      <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
        Last traded Yes probability
      </Text>
      {latestProbability ? (
        <Box twClassName="flex-row items-baseline gap-2">
          <Text variant={TextVariant.DisplayMd}>{latestProbability}</Text>
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {changeLabel}
          </Text>
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
  const [range, setRange] = useState<PredictMarketHistoryRange>('LIVE');
  const homeHistory = useMarketHistory(venueId, home.market.id, range);
  const awayHistory = useMarketHistory(venueId, away.market.id, range);
  const homePoints = homeHistory.data?.points ?? [];
  const awayPoints = awayHistory.data?.points ?? [];
  const hasCompleteData = Boolean(homeHistory.data && awayHistory.data);
  const series: MarketHistorySeries[] = [
    {
      id: home.market.id,
      label: getCompactTeamLabel(home.team),
      color: home.team.primaryColor ?? colors.success.default,
      points: homePoints,
    },
    {
      id: away.market.id,
      label: getCompactTeamLabel(away.team),
      color: away.team.primaryColor ?? colors.info.default,
      points: awayPoints,
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
