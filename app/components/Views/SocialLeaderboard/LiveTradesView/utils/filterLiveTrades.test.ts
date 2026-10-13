import { DEFAULT_FILTERS } from '../../shell/filters/filterDefaults';
import type { SocialShellFilters } from '../../shell/filters/types';
import type { LiveTradeRowModel } from '../types';
import { filterLiveTrades } from './filterLiveTrades';

const avatar = {
  positionId: 'pos',
  chain: 'ethereum',
  tokenAddress: '0x1',
  tokenImageUrl: null,
  tokenSymbol: 'PEPE',
};

const row = (
  overrides: Partial<LiveTradeRowModel> = {},
): LiveTradeRowModel => ({
  id: 'row-1',
  type: 'spot',
  traderId: 'trader-a',
  traderAddress: '0xa',
  timestampMs: Date.now(),
  author: {
    id: 'trader-a',
    username: 'alice',
    winRatePercent: 50,
    pnl30d: 50_000,
  },
  authorHandle: 'alice',
  authorImageUrl: null,
  symbol: 'PEPE',
  avatar,
  side: 'buy',
  markPriceLabel: '$0.50',
  amountLabel: '100 PEPE',
  valueLabel: '$50',
  positionId: 'pos',
  marketCapUsd: 5_200_000_000,
  ...overrides,
});

const filters = (
  patch: Partial<SocialShellFilters> = {},
): SocialShellFilters => ({
  ...DEFAULT_FILTERS,
  ...patch,
});

describe('filterLiveTrades', () => {
  const spot = row({ id: 'spot', type: 'spot', traderId: 'spot-trader' });
  const perp = row({
    id: 'perp',
    type: 'perps',
    traderId: 'perp-trader',
    direction: 'long',
    leverageLabel: '10x',
    marketCapUsd: null,
    side: undefined,
  });
  const shrimp = row({
    id: 'shrimp',
    traderId: 'shrimp-trader',
    author: {
      id: 'shrimp-trader',
      username: 'shrimp',
      winRatePercent: 40,
      pnl30d: 2_500,
    },
  });
  const whale = row({
    id: 'whale',
    traderId: 'whale-trader',
    author: {
      id: 'whale-trader',
      username: 'whale',
      winRatePercent: 80,
      pnl30d: 220_000,
    },
  });

  const all = [spot, perp, shrimp, whale];

  it('returns every row for default filters', () => {
    const result = filterLiveTrades(all, DEFAULT_FILTERS);

    expect(result).toHaveLength(4);
  });

  it('keeps only spot rows for the tokens asset chip', () => {
    const result = filterLiveTrades(all, filters({ type: 'tokens' }));

    expect(result.map((item) => item.id)).toStrictEqual([
      'spot',
      'shrimp',
      'whale',
    ]);
  });

  it('keeps only perp rows for the perps asset chip', () => {
    const result = filterLiveTrades(all, filters({ type: 'perps' }));

    expect(result.map((item) => item.id)).toStrictEqual(['perp']);
  });

  it('keeps followed traders for the following cohort', () => {
    const result = filterLiveTrades(
      all,
      filters({ traderCohort: 'following' }),
      ['spot-trader'],
    );

    expect(result.map((item) => item.id)).toStrictEqual(['spot']);
  });

  it('keeps shrimp-band traders from 30-day P&L', () => {
    const result = filterLiveTrades(all, filters({ traderCohort: 'shrimp' }));

    expect(result.map((item) => item.id)).toStrictEqual(['shrimp']);
  });

  it('keeps whale-band traders from 30-day P&L', () => {
    const result = filterLiveTrades(all, filters({ traderCohort: 'whale' }));

    expect(result.map((item) => item.id)).toStrictEqual(['whale']);
  });

  it('drops spot rows whose market cap is outside the slider', () => {
    const result = filterLiveTrades(
      all,
      filters({ marketCap: { min: 0, max: 1 } }),
    );

    expect(result.map((item) => item.id)).toStrictEqual(['perp']);
  });

  it('lets perps pass a narrowed market-cap slider because they have no cap', () => {
    const result = filterLiveTrades(
      [perp],
      filters({ marketCap: { min: 0, max: 1 } }),
    );

    expect(result).toHaveLength(1);
  });

  it('ignores verification and 24h volume because those fields are missing', () => {
    const result = filterLiveTrades(
      all,
      filters({
        verification: 'verified',
        volume24h: { min: 10, max: 20 },
      }),
    );

    expect(result).toHaveLength(4);
  });
});
