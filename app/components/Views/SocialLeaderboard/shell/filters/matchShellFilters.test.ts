import { DEFAULT_FILTERS } from './filterDefaults';
import {
  matchesShellAssetType,
  matchesShellMarketCap,
  matchesShellTraderCohort,
} from './matchShellFilters';
import type { SocialShellFilters } from './types';

const filters = (
  patch: Partial<SocialShellFilters> = {},
): SocialShellFilters => ({
  ...DEFAULT_FILTERS,
  ...patch,
});

describe('matchesShellAssetType', () => {
  it('keeps every class when type is all', () => {
    expect(matchesShellAssetType('spot', DEFAULT_FILTERS)).toBe(true);
    expect(matchesShellAssetType('perps', DEFAULT_FILTERS)).toBe(true);
  });

  it('keeps only spot for the tokens chip', () => {
    expect(matchesShellAssetType('spot', filters({ type: 'tokens' }))).toBe(
      true,
    );
    expect(matchesShellAssetType('perps', filters({ type: 'tokens' }))).toBe(
      false,
    );
  });

  it('keeps only perps for the perps chip', () => {
    expect(matchesShellAssetType('perps', filters({ type: 'perps' }))).toBe(
      true,
    );
    expect(matchesShellAssetType('spot', filters({ type: 'perps' }))).toBe(
      false,
    );
  });
});

describe('matchesShellTraderCohort', () => {
  it('keeps every trader when cohort is all', () => {
    expect(
      matchesShellTraderCohort({
        traderCohort: 'all',
        pnl30d: 2_500,
      }),
    ).toBe(true);
  });

  it('treats leftover verified as a no-op', () => {
    expect(
      matchesShellTraderCohort({
        traderCohort: 'verified',
        pnl30d: 2_500,
      }),
    ).toBe(true);
  });

  it('keeps followed traders for the following cohort', () => {
    expect(
      matchesShellTraderCohort({
        traderCohort: 'following',
        pnl30d: 50_000,
        isFollowing: true,
      }),
    ).toBe(true);
    expect(
      matchesShellTraderCohort({
        traderCohort: 'following',
        pnl30d: 50_000,
        isFollowing: false,
      }),
    ).toBe(false);
  });

  it('bands shrimp dolphin and whale from 30-day PnL', () => {
    expect(
      matchesShellTraderCohort({
        traderCohort: 'shrimp',
        pnl30d: 2_500,
      }),
    ).toBe(true);
    expect(
      matchesShellTraderCohort({
        traderCohort: 'dolphin',
        pnl30d: 50_000,
      }),
    ).toBe(true);
    expect(
      matchesShellTraderCohort({
        traderCohort: 'whale',
        pnl30d: 220_000,
      }),
    ).toBe(true);
    expect(
      matchesShellTraderCohort({
        traderCohort: 'whale',
        pnl30d: 2_500,
      }),
    ).toBe(false);
  });

  it('drops traders with no 30-day PnL from a sized cohort', () => {
    expect(
      matchesShellTraderCohort({
        traderCohort: 'shrimp',
        pnl30d: null,
      }),
    ).toBe(false);
  });
});

describe('matchesShellMarketCap', () => {
  it('keeps every row on the default slider', () => {
    expect(matchesShellMarketCap(5_200_000_000, DEFAULT_FILTERS)).toBe(true);
    expect(matchesShellMarketCap(null, DEFAULT_FILTERS)).toBe(true);
  });

  it('drops a spot cap outside the slider', () => {
    expect(
      matchesShellMarketCap(
        5_200_000_000,
        filters({ marketCap: { min: 0, max: 1 } }),
      ),
    ).toBe(false);
  });

  it('lets a missing cap pass a narrowed slider', () => {
    expect(
      matchesShellMarketCap(null, filters({ marketCap: { min: 0, max: 1 } })),
    ).toBe(true);
  });
});
