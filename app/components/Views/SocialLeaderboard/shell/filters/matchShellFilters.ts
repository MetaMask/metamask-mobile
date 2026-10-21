import { MARKET_CAP_RANGE } from './filterDefaults';
import type { SocialFilterFollowing, SocialShellFilters } from './types';

/** Slider bounds are USD billions; feed / trade market cap is USD. */
const BILLIONS = 1_000_000_000;

export type ShellFilterAssetClass = 'spot' | 'perps';

export const isDefaultMarketCap = (filters: SocialShellFilters): boolean =>
  filters.marketCap.min === MARKET_CAP_RANGE.min &&
  filters.marketCap.max === MARKET_CAP_RANGE.max;

export const matchesShellAssetType = (
  assetClass: ShellFilterAssetClass,
  filters: SocialShellFilters,
): boolean => {
  if (filters.type === 'tokens') {
    return assetClass === 'spot';
  }
  if (filters.type === 'perps') {
    return assetClass === 'perps';
  }
  return true;
};

export const matchesShellFollowing = ({
  following,
  isFollowing = false,
}: {
  following: SocialFilterFollowing;
  isFollowing?: boolean;
}): boolean => following === 'all' || isFollowing;

export const matchesShellMarketCap = (
  marketCapUsd: number | null | undefined,
  filters: SocialShellFilters,
): boolean => {
  if (isDefaultMarketCap(filters)) {
    return true;
  }
  // Perps (and spot fills that omitted marketCap) have nothing to test, so
  // they pass rather than disappearing when the slider moves.
  if (marketCapUsd == null) {
    return true;
  }
  const billions = marketCapUsd / BILLIONS;
  return billions >= filters.marketCap.min && billions <= filters.marketCap.max;
};
