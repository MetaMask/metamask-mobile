// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import type { TopTrader } from '../../Homepage/Sections/TopTraders/types';
import { getTraderMetricDisplay, rankTradersByMetric } from './traderMetric';

const buildTrader = (overrides: Partial<TopTrader> = {}): TopTrader => ({
  id: 'trader-1',
  address: '0x0000000000000000000000000000000000000001',
  rank: 1,
  overallRank: 1,
  username: 'alpha.eth',
  percentageChange: 43,
  pnlValue: 45900.89,
  winRatePercent: 92,
  pnlPerChain: {},
  isFollowing: false,
  ...overrides,
});

describe('getTraderMetricDisplay', () => {
  it('shows signed USD when ranking by PnL', () => {
    expect(getTraderMetricDisplay(buildTrader(), 'pnl')).toEqual({
      label: '+$45,900.89',
      isPositive: true,
    });
  });

  it('marks a negative PnL so the row renders it in red', () => {
    expect(
      getTraderMetricDisplay(buildTrader({ pnlValue: -120 }), 'pnl').isPositive,
    ).toBe(false);
  });

  it('shows the signed ROI percentage when ranking by P&L %', () => {
    expect(getTraderMetricDisplay(buildTrader(), 'roi')).toEqual({
      label: '+43.00%',
      isPositive: true,
    });
  });

  it('marks a negative ROI so the row renders it in red', () => {
    expect(
      getTraderMetricDisplay(buildTrader({ percentageChange: -8.5 }), 'roi'),
    ).toEqual({ label: '-8.50%', isPositive: false });
  });

  it('shows an unsigned whole-number percentage when ranking by win rate', () => {
    expect(getTraderMetricDisplay(buildTrader(), 'winRate')).toEqual({
      label: '92%',
      isPositive: true,
    });
  });

  it('falls back to a dash when the window has no win-rate data', () => {
    expect(
      getTraderMetricDisplay(buildTrader({ winRatePercent: null }), 'winRate'),
    ).toEqual({ label: '\u2014', isPositive: false });
  });

  it('does not colour a zero win rate as a win', () => {
    expect(
      getTraderMetricDisplay(buildTrader({ winRatePercent: 0 }), 'winRate'),
    ).toEqual({ label: '0%', isPositive: false });
  });
});

describe('rankTradersByMetric', () => {
  // Deliberately disagreeing orders per metric: the API returns them ranked by
  // its own window, so each metric has to re-order them differently.
  const traders: TopTrader[] = [
    buildTrader({
      id: 'a',
      username: 'alpha.eth',
      pnlValue: 900,
      percentageChange: 10,
      winRatePercent: 40,
    }),
    buildTrader({
      id: 'b',
      username: 'beta.eth',
      pnlValue: 500,
      percentageChange: 80,
      winRatePercent: 90,
    }),
    buildTrader({
      id: 'c',
      username: 'gamma.eth',
      pnlValue: 700,
      percentageChange: 50,
      winRatePercent: 65,
    }),
  ];

  const idsOf = (ranked: TopTrader[]) => ranked.map((trader) => trader.id);

  it('orders by PnL, highest first', () => {
    expect(idsOf(rankTradersByMetric(traders, 'pnl'))).toEqual(['a', 'c', 'b']);
  });

  it('orders by ROI, highest first', () => {
    expect(idsOf(rankTradersByMetric(traders, 'roi'))).toEqual(['b', 'c', 'a']);
  });

  it('orders by win rate, highest first', () => {
    expect(idsOf(rankTradersByMetric(traders, 'winRate'))).toEqual([
      'b',
      'c',
      'a',
    ]);
  });

  it('renumbers rank to the displayed position and keeps the server rank', () => {
    const ranked = rankTradersByMetric(traders, 'roi');

    expect(ranked.map((trader) => trader.rank)).toEqual([1, 2, 3]);
    expect(ranked.every((trader) => trader.overallRank === 1)).toBe(true);
  });

  it('sorts traders missing the metric last instead of treating them as zero', () => {
    const withGap = [
      buildTrader({ id: 'missing', winRatePercent: null }),
      buildTrader({ id: 'lowest', winRatePercent: 1 }),
    ];

    expect(idsOf(rankTradersByMetric(withGap, 'winRate'))).toEqual([
      'lowest',
      'missing',
    ]);
  });

  it('keeps the API order for traders tied on the metric', () => {
    const tied = [
      buildTrader({ id: 'first', pnlValue: 100 }),
      buildTrader({ id: 'second', pnlValue: 100 }),
    ];

    expect(idsOf(rankTradersByMetric(tied, 'pnl'))).toEqual([
      'first',
      'second',
    ]);
  });

  it('leaves the source array untouched', () => {
    rankTradersByMetric(traders, 'roi');

    expect(idsOf(traders)).toEqual(['a', 'b', 'c']);
  });
});
