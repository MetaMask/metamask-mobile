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
import { getAskPricePercent } from '../../../events/shared/formatting';
import {
  appendLiveEndpoint,
  appendLiveQuoteTrail,
  useLiveQuoteTrail,
} from './liveQuoteTrail';
import {
  formatChartValue,
  PREDICT_MARKET_CHART_HEIGHT,
  PredictMarketChart,
  type PredictMarketChartPoint,
  type PredictMarketChartSeries,
} from './PredictMarketChart';
import { PredictMarketHistoryTestIds } from './PredictMarketHistory.testIds';

// `LIVE` spans minutes, so it is the only range wide enough for the live quote
// trail to read as a line rather than a moving endpoint.
const GAME_HISTORY_RANGES: readonly PredictMarketHistoryRange[] = [
  'LIVE',
  '1D',
  '1W',
  '1M',
  'ALL',
];

// Standard Events have no live trail; their line ends follow the last trade.
const STANDARD_HISTORY_RANGES: readonly PredictMarketHistoryRange[] = [
  '1D',
  '1W',
  '1M',
  'ALL',
];

// Figma's top Markets palette, in rank order. Fixed hex values that don't
// follow the theme, by product decision.
// eslint-disable-next-line @metamask/design-tokens/color-no-hex
const TOP_MARKET_SERIES_COLORS = ['#33d999', '#5980ff', '#ff9e33'] as const;

const getRangeLabel = (range: PredictMarketHistoryRange) =>
  range === 'LIVE' ? strings('predict.history.range_live') : range;

const styles = StyleSheet.create({
  rangeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 12,
    width: '100%',
  },
  rangeGroup: {
    flex: 1,
  },
  rangeGroupContent: {
    flexGrow: 1,
  },
  legendDot: {
    height: 8,
    width: 8,
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
  endValue?: number;
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
  ranges: readonly PredictMarketHistoryRange[];
  range: PredictMarketHistoryRange;
  onRangeChange: (range: PredictMarketHistoryRange) => void;
  series: readonly MarketHistorySeries[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  legend?: React.ReactNode;
}

const MarketHistoryContent = ({
  ranges,
  range,
  onRangeChange,
  series,
  isLoading,
  isError,
  onRetry,
  legend,
}: MarketHistoryContentProps) => {
  const chartStateStyle = { height: PREDICT_MARKET_CHART_HEIGHT };
  const chartSeries: PredictMarketChartSeries[] = series
    .filter((entry) => entry.points.length >= 2)
    .map((entry) => ({
      id: entry.id,
      label: entry.label,
      color: entry.color,
      data: entry.points,
      endValue: entry.endValue,
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
      {legend}
      {renderChartState()}

      <Box style={styles.rangeRow}>
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
          {ranges.map((option) => (
            <FilterButton
              key={option}
              value={option}
              accessibilityRole="tab"
              accessibilityState={{ selected: range === option }}
              style={styles.rangeFilter}
              testID={PredictMarketHistoryTestIds.range(option)}
            >
              {getRangeLabel(option)}
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
  /** Standard Events drop `LIVE`, and their line ends follow the last trade. */
  isStandardEvent?: boolean;
}

export const PredictMarketHistory = ({
  venueId,
  market,
  isStandardEvent = false,
}: PredictMarketHistoryProps) => {
  const { colors } = useTheme();
  const [range, setRange] = useState<PredictMarketHistoryRange>('ALL');
  const historyQuery = useMarketHistory(venueId, market.id, range);
  const yesOutcome = market.outcomes.find((outcome) => outcome.side === 'yes');
  const noOutcome = market.outcomes.find((outcome) => outcome.side === 'no');
  const isTrailEnabled = !isStandardEvent && range === 'LIVE';
  const yesTrail = useLiveQuoteTrail(market, yesOutcome, isTrailEnabled);
  const noTrail = useLiveQuoteTrail(market, noOutcome, isTrailEnabled);
  const points = historyQuery.data?.points ?? [];
  const extendPoints = (
    field: 'yesPrice' | 'noPrice',
    trail: readonly PredictMarketChartPoint[],
  ) => {
    const chartPoints = toChartPoints(points, field);
    if (!isStandardEvent) {
      return appendLiveQuoteTrail(chartPoints, trail);
    }
    const side = field === 'noPrice' ? 'no' : 'yes';
    return appendLiveEndpoint(chartPoints, market, side);
  };
  const series: MarketHistorySeries[] = [
    ...(yesOutcome
      ? [
          {
            id: yesOutcome.id,
            label: yesOutcome.label || strings('predict.market_details.yes'),
            color: colors.primary.default,
            points: extendPoints('yesPrice', yesTrail),
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
            points: extendPoints('noPrice', noTrail),
          },
        ]
      : []),
  ];

  return (
    <MarketHistoryContent
      ranges={isStandardEvent ? STANDARD_HISTORY_RANGES : GAME_HISTORY_RANGES}
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
  const homeTrail = useLiveQuoteTrail(
    home.market,
    home.outcome,
    range === 'LIVE',
  );
  const awayTrail = useLiveQuoteTrail(
    away.market,
    away.outcome,
    range === 'LIVE',
  );
  const hasCompleteData = Boolean(homeHistory.data && awayHistory.data);
  // Each line plots the last-traded probability of the Outcome that
  // carries that Team's Game Selection.
  const series: MarketHistorySeries[] = [
    {
      id: home.outcome.id,
      label: getCompactTeamLabel(home.team),
      color: home.team.primaryColor ?? colors.success.default,
      points: appendLiveQuoteTrail(
        toChartPoints(
          homeHistory.data?.points ?? [],
          home.outcome.side === 'no' ? 'noPrice' : 'yesPrice',
        ),
        homeTrail,
      ),
    },
    {
      id: away.outcome.id,
      label: getCompactTeamLabel(away.team),
      color: away.team.primaryColor ?? colors.info.default,
      points: appendLiveQuoteTrail(
        toChartPoints(
          awayHistory.data?.points ?? [],
          away.outcome.side === 'no' ? 'noPrice' : 'yesPrice',
        ),
        awayTrail,
      ),
    },
  ];

  return (
    <MarketHistoryContent
      ranges={GAME_HISTORY_RANGES}
      range={range}
      onRangeChange={setRange}
      series={series}
      isLoading={
        (homeHistory.isLoading || awayHistory.isLoading) && !hasCompleteData
      }
      isError={(homeHistory.isError || awayHistory.isError) && !hasCompleteData}
      onRetry={() =>
        [homeHistory, awayHistory].forEach((history) => history.refetch())
      }
    />
  );
};

const getYesAskProbability = (market: PredictMarket) => {
  const percent = getAskPricePercent(
    market.outcomes.find((outcome) => outcome.side === 'yes')?.askPrice,
  );
  return percent === undefined ? undefined : percent / 100;
};

const TopMarketsLegend = ({
  series,
}: {
  series: readonly MarketHistorySeries[];
}) => (
  <Box
    twClassName="flex-row flex-wrap gap-x-4 gap-y-2"
    testID={PredictMarketHistoryTestIds.LEGEND}
  >
    {series.map((entry) => (
      <Box
        key={entry.id}
        twClassName="max-w-full flex-row items-center gap-1"
        testID={PredictMarketHistoryTestIds.legendItem(entry.id)}
      >
        <Box
          style={[styles.legendDot, { backgroundColor: entry.color }]}
          twClassName="rounded-full"
        />
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          numberOfLines={1}
          ellipsizeMode="tail"
          twClassName="shrink"
        >
          {entry.label}
        </Text>
        <Text
          variant={TextVariant.BodySm}
          testID={PredictMarketHistoryTestIds.legendValue(entry.id)}
        >
          {entry.endValue === undefined
            ? '–'
            : formatChartValue(entry.endValue)}
        </Text>
      </Box>
    ))}
  </Box>
);

interface PredictTopMarketsHistoryProps {
  venueId: PredictVenueId;
  /** One to three Markets in rank order; extras are not charted. */
  markets: readonly PredictMarket[];
}

/**
 * Charts a standard Event's top Markets, one yes-price line each, with a
 * legend of their live yes ask. Each line's end label shows that same ask so
 * a Market never reads as two different percents.
 */
export const PredictTopMarketsHistory = ({
  venueId,
  markets,
}: PredictTopMarketsHistoryProps) => {
  const [range, setRange] = useState<PredictMarketHistoryRange>('ALL');
  const [first, second, third] = markets;
  // Fixed slots keep the hook order stable when fewer Markets are charted.
  const histories = [
    useMarketHistory(venueId, first?.id ?? '', range, Boolean(first)),
    useMarketHistory(venueId, second?.id ?? '', range, Boolean(second)),
    useMarketHistory(venueId, third?.id ?? '', range, Boolean(third)),
  ];
  const charted = [first, second, third].flatMap((market, index) =>
    market ? [{ market, history: histories[index] }] : [],
  );
  const hasCompleteData = charted.every(({ history }) => history.data);
  const series: MarketHistorySeries[] = charted.map(
    ({ market, history }, index) => {
      const yesOutcome = market.outcomes.find(
        (outcome) => outcome.side === 'yes',
      );
      return {
        id: market.id,
        label: yesOutcome?.label || market.question,
        color: TOP_MARKET_SERIES_COLORS[index],
        points: appendLiveEndpoint(
          toChartPoints(history.data?.points ?? [], 'yesPrice'),
          market,
          'yes',
        ),
        endValue: getYesAskProbability(market),
      };
    },
  );

  return (
    <MarketHistoryContent
      ranges={STANDARD_HISTORY_RANGES}
      range={range}
      onRangeChange={setRange}
      series={series}
      isLoading={
        charted.some(({ history }) => history.isLoading) && !hasCompleteData
      }
      isError={
        charted.some(({ history }) => history.isError) && !hasCompleteData
      }
      onRetry={() => {
        charted.forEach(({ history }) => history.refetch());
      }}
      legend={<TopMarketsLegend series={series} />}
    />
  );
};
