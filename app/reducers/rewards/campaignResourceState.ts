import type { CampaignLeaderboardDto } from '../../core/Engine/controllers/rewards-controller/types';

/** Per-campaign fetch cache entry for public campaign-scoped Redux state. */
export interface CampaignResourceCacheEntry<T> {
  data: T | null;
  loading: boolean;
  error: boolean;
}

export interface OndoCampaignLeaderboardCacheEntry
  extends CampaignResourceCacheEntry<CampaignLeaderboardDto> {
  selectedTier: string | null;
}

export function createEmptyCampaignResourceCacheEntry<
  T,
>(): CampaignResourceCacheEntry<T> {
  return {
    data: null,
    loading: false,
    error: false,
  };
}

export function createEmptyOndoCampaignLeaderboardCacheEntry(): OndoCampaignLeaderboardCacheEntry {
  return {
    data: null,
    loading: false,
    error: false,
    selectedTier: null,
  };
}

export function getOrCreateCampaignResourceCacheEntry<T>(
  map: Record<string, CampaignResourceCacheEntry<T>>,
  campaignId: string,
): CampaignResourceCacheEntry<T> {
  if (!map[campaignId]) {
    map[campaignId] = createEmptyCampaignResourceCacheEntry<T>();
  }
  return map[campaignId];
}

export function getOrCreateOndoCampaignLeaderboardCacheEntry(
  map: Record<string, OndoCampaignLeaderboardCacheEntry>,
  campaignId: string,
): OndoCampaignLeaderboardCacheEntry {
  if (!map[campaignId]) {
    map[campaignId] = createEmptyOndoCampaignLeaderboardCacheEntry();
  }
  return map[campaignId];
}
