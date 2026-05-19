/* eslint-disable react/display-name */
import React from 'react';
import { View } from 'react-native';
import BreakdownDonutChart from './components/BreakdownDonutChart/BreakdownDonutChart';
import BreakdownHeroValue from './components/BreakdownHeroValue/BreakdownHeroValue';
import BreakdownLegend from './components/BreakdownLegend/BreakdownLegend';
import BreakdownDrilldownList from './components/BreakdownDrilldownList/BreakdownDrilldownList';
import type { SliceData, BreakdownData } from './types';
import { getBalanceBreakdownHeroValueMaxWidth } from './constants';
import { mockTheme } from '../../../util/theme';
import { getBalanceBreakdownSliceColors } from './utils/getBalanceBreakdownSliceColors';
import { balanceBreakdownStoryStyles } from './BalanceBreakdown.stories.styles';

const SLICE_COLORS = getBalanceBreakdownSliceColors(mockTheme.colors);

const StoryMeta = {
  title: 'Views / BalanceBreakdown',
};

export default StoryMeta;

// ─── Shared fixture data ──────────────────────────────────────────────────────

const SLICES: Record<string, SliceData> = {
  tokens: {
    key: 'tokens',
    label: 'Tokens',
    color: SLICE_COLORS.tokens,
    valueFiat: 50000,
    percentOfTotal: 0.5,
    status: 'ready',
    drilldown: [
      { key: 'eth', label: 'ETH', valueFiat: 40000 },
      { key: 'usdc', label: 'USDC', valueFiat: 7000 },
      { key: 'link', label: 'LINK', valueFiat: 3000 },
    ],
  },
  perps: {
    key: 'perps',
    label: 'Perpetuals',
    color: SLICE_COLORS.perps,
    valueFiat: 30000,
    percentOfTotal: 0.3,
    status: 'ready',
    heroSupplementalPnlText: '+$1,200.00 (+4.0%)',
    drilldown: [
      {
        key: 'perps-crypto',
        label: 'Crypto',
        sublabel: '2 positions • 67%',
        valueFiat: 20000,
        progressFraction: 0.67,
        delta: { amount: 800, label: 'session' },
      },
      {
        key: 'perps-equity',
        label: 'Stocks',
        sublabel: '1 position • 33%',
        valueFiat: 10000,
        progressFraction: 0.33,
        delta: { amount: 400, label: 'session' },
      },
    ],
  },
  predict: {
    key: 'predict',
    label: 'Predictions',
    color: SLICE_COLORS.predict,
    valueFiat: 20000,
    percentOfTotal: 0.2,
    status: 'ready',
    drilldown: [
      {
        key: 'predict-available',
        label: 'Available balance',
        valueFiat: 5000,
        progressFraction: 0.25,
      },
      {
        key: 'predict-cat-sports',
        label: 'Sports',
        sublabel: '2 positions • 50%',
        valueFiat: 10000,
        progressFraction: 0.5,
        delta: { amount: -120 },
        pnlPercentPoints: -1.2,
      },
      {
        key: 'predict-cat-crypto',
        label: 'Crypto',
        sublabel: '1 position • 25%',
        valueFiat: 5000,
        progressFraction: 0.25,
        delta: { amount: 350 },
        pnlPercentPoints: 7.5,
      },
    ],
    heroSupplementalPnlText: '+$230 (+1.15%)',
  },
  defi: {
    key: 'defi',
    label: 'DeFi',
    color: SLICE_COLORS.defi,
    valueFiat: 0,
    percentOfTotal: 0,
    status: 'ineligible',
    drilldown: [],
  },
} as Record<SliceData['key'], SliceData>;

const HERO: BreakdownData['hero'] = {
  totalFiat: 100000,
  userCurrency: 'USD',
  delta: { amount: 2345.67, percent: 0.0234, label: '24h' },
  status: 'ready',
};

// ─── Stories ──────────────────────────────────────────────────────────────────

/** Overview: donut with all four slices */
export const DonutAllSlices = {
  render: () => (
    <View style={balanceBreakdownStoryStyles.paddedCentered}>
      <BreakdownDonutChart
        slices={SLICES as Parameters<typeof BreakdownDonutChart>[0]['slices']}
        selectedSlice="all"
        onSlicePress={() => undefined}
      />
    </View>
  ),
};

/** Tokens segment selected (highlighted, others faded) */
export const DonutTokensSelected = {
  render: () => (
    <View style={balanceBreakdownStoryStyles.paddedCentered}>
      <BreakdownDonutChart
        slices={SLICES as Parameters<typeof BreakdownDonutChart>[0]['slices']}
        selectedSlice="tokens"
        onSlicePress={() => undefined}
      />
    </View>
  ),
};

/** Hero value — overview state */
export const HeroOverview = {
  render: () => (
    <View style={balanceBreakdownStoryStyles.padded}>
      <BreakdownHeroValue
        hero={HERO}
        selectedSlice="all"
        maxValueWidth={getBalanceBreakdownHeroValueMaxWidth()}
      />
    </View>
  ),
};

/** Hero value — drilldown state (Perps selected) */
export const HeroPerpsDrilldown = {
  render: () => (
    <View style={balanceBreakdownStoryStyles.padded}>
      <BreakdownHeroValue
        hero={HERO}
        selectedSlice="perps"
        selectedSliceData={SLICES.perps as SliceData}
        maxValueWidth={getBalanceBreakdownHeroValueMaxWidth()}
      />
    </View>
  ),
};

/** Legend — all slices visible */
export const LegendOverview = {
  render: () => (
    <View style={balanceBreakdownStoryStyles.padded}>
      <BreakdownLegend
        slices={SLICES as Parameters<typeof BreakdownLegend>[0]['slices']}
        hero={HERO}
        selectedSlice="all"
        onSlicePress={() => undefined}
      />
    </View>
  ),
};

/** Drilldown list — Tokens slice */
export const DrilldownTokens = {
  render: () => (
    <View style={balanceBreakdownStoryStyles.padded}>
      <BreakdownDrilldownList
        slice={SLICES.tokens as SliceData}
        hero={HERO}
      />
    </View>
  ),
};

/** Drilldown list — loading state */
export const DrilldownLoading = {
  render: () => (
    <View style={balanceBreakdownStoryStyles.padded}>
      <BreakdownDrilldownList
        slice={{ ...SLICES.tokens, status: 'loading' } as SliceData}
        hero={HERO}
      />
    </View>
  ),
};

/** Drilldown list — error state */
export const DrilldownError = {
  render: () => (
    <View style={balanceBreakdownStoryStyles.padded}>
      <BreakdownDrilldownList
        slice={{ ...SLICES.tokens, status: 'error' } as SliceData}
        hero={HERO}
      />
    </View>
  ),
};

/** Drilldown list — empty positions */
export const DrilldownEmpty = {
  render: () => (
    <View style={balanceBreakdownStoryStyles.padded}>
      <BreakdownDrilldownList
        slice={{ ...SLICES.tokens, drilldown: [] } as SliceData}
        hero={HERO}
      />
    </View>
  ),
};
