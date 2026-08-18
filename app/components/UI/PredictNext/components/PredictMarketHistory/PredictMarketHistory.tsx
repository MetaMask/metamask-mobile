import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
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
  PredictMarketHistoryRange,
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
  rangeFilter: {
    height: 'auto',
    minHeight: 32,
    paddingVertical: 6,
  },
});

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
  const series = [
    ...(yesOutcome
      ? [
          {
            id: yesOutcome.id,
            label: yesOutcome.label || 'Yes',
            color: colors.primary.default,
            data: points.map((point) => ({
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
            label: noOutcome.label || 'No',
            color: colors.error.default,
            data: points.map((point) => ({
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
    latestPoint && initialPoint
      ? formatProbabilityChange(initialPoint.yesPrice, latestPoint.yesPrice)
      : undefined;

  return (
    <Box twClassName="gap-4" testID={PredictMarketHistoryTestIds.VIEW}>
      <Box twClassName="gap-1">
        <Text variant={TextVariant.HeadingSm}>Market history</Text>
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          Last traded Yes probability
        </Text>
        {latestProbability ? (
          <Box twClassName="flex-row items-baseline gap-2">
            <Text variant={TextVariant.DisplayMd}>{latestProbability}</Text>
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
            >
              {changeLabel}
            </Text>
          </Box>
        ) : null}
      </Box>

      {historyQuery.isLoading && !historyQuery.data ? (
        <Box
          accessible
          accessibilityLabel="Loading Market history"
          testID={PredictMarketHistoryTestIds.LOADING}
          twClassName="h-60 rounded-2xl bg-muted"
        />
      ) : historyQuery.isError && !historyQuery.data ? (
        <Box
          testID={PredictMarketHistoryTestIds.ERROR}
          twClassName="h-60 items-center justify-center gap-4 rounded-2xl bg-muted px-6"
        >
          <Text>Market history could not be loaded.</Text>
          <Button onPress={() => historyQuery.refetch()}>Retry</Button>
        </Box>
      ) : points.length < 2 ? (
        <Box
          testID={PredictMarketHistoryTestIds.EMPTY}
          twClassName="h-60 items-center justify-center rounded-2xl bg-muted px-6"
        >
          <Text color={TextColor.TextAlternative}>
            Market history is not available for this range.
          </Text>
        </Box>
      ) : (
        <PredictMarketChart
          testID={PredictMarketHistoryTestIds.CHART}
          series={series}
          height={250}
        />
      )}

      <FilterButtonGroup
        value={range}
        onChange={(value) => setRange(value as PredictMarketHistoryRange)}
        variant={FilterButtonVariant.Secondary}
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
  );
};
