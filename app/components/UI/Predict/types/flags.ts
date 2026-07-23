import { Infer } from '@metamask/superstruct';
import { PredictFeeCollectionSchema } from '../schemas';
import type { PredictMarketListOrder } from '../constants/flags';
import { VersionGatedFeatureFlag } from '../../../../util/remoteFeatureFlag';

export type PredictFeeCollection = Infer<typeof PredictFeeCollectionSchema>;

export interface PredictLiveSportsFlag {
  enabled: boolean;
  leagues: string[];
}

export interface PredictMarketHighlight {
  category: string;
  markets?: string[];
  series?: string[];
}

export interface PredictMarketHighlightsFlag extends VersionGatedFeatureFlag {
  highlights: PredictMarketHighlight[];
}

export interface PredictExtendedSportsMarketsFlag
  extends VersionGatedFeatureFlag {
  leagues: string[];
  enabledSportsMarketTypes: string[];
  nonRegTimeSportsMarketTypes?: string[];
}

export interface PredictWorldCupStageConfig {
  key: string;
  labelKey?: string;
  label?: string;
  eventIds: string[];
}

export interface PredictWorldCupConfig extends VersionGatedFeatureFlag {
  showMainFeedBanner: boolean;
  showMainFeedTab: boolean;
  showWorldCupScreen: boolean;
  showHubV2: boolean;
  showHubBanner: boolean;
  tagSlug: string;
  gamesTagId: string;
  winnerEventId: string;
  bannerImage?: {
    url: string;
    width: number;
    height: number;
  };
  stages: PredictWorldCupStageConfig[];
}

export type PredictSportsFeedChipKind = 'games' | 'props' | 'tag';
export type PredictSportsFeedChipOrder = PredictMarketListOrder;

export interface PredictSportsFeedChipConfig {
  id: string;
  kind: PredictSportsFeedChipKind;
  titleKey?: string;
  label?: string;
  tagSlug?: string;
  /**
   * Optional raw `/events/keyset` query string without a leading `?`. When
   * present, this replaces the generated chip params, with explicit chip-level
   * order and start-time overrides still applied on top.
   */
  queryParams?: string;
  /**
   * Optional ordering override. When absent, each chip keeps its generated default.
   */
  order?: PredictSportsFeedChipOrder;
  /**
   * Optional start-time lower bound in minutes relative to request time. Applies
   * on top of generated params or `queryParams` and overrides any default
   * start-time lower bound for this chip. Use `null` to disable the lower bound.
   */
  startTimeMinMinutesAgo?: number | null;
}

export interface PredictSportsFeedTabConfig {
  id: string;
  titleKey?: string;
  label?: string;
  tagSlug?: string;
  defaultFilterId?: string;
  chips: PredictSportsFeedChipConfig[];
}

export interface PredictSportsFeedConfig extends VersionGatedFeatureFlag {
  tabs: PredictSportsFeedTabConfig[];
}

export interface PredictFeatureFlags {
  feeCollection: PredictFeeCollection;
  liveSportsLeagues: string[];
  extendedSportsMarketsLeagues: string[];
  enabledSportsMarketTypes: string[];
  nonRegTimeSportsMarketTypes: string[];
  marketHighlightsFlag: PredictMarketHighlightsFlag;
  fakOrdersEnabled: boolean;
  predictWithAnyTokenEnabled: boolean;
  predictUpDownEnabled: boolean;
  predictWorldCup: PredictWorldCupConfig;
  predictSportsFeed: PredictSportsFeedConfig;
  predictWimbledonTab: PredictWimbledonTabFlag;
  predictPortfolioEnabled: boolean;
  predictHomeRedesignEnabled: boolean;
  predictSportCardLivePricesEnabled: boolean;
}

export interface PredictHotTabFlag extends VersionGatedFeatureFlag {
  queryParams?: string; // Raw query params WITHOUT leading &: "tag_id=149&tag_id=100995&order=volume24hr"
}

export interface PredictWimbledonTabFlag extends VersionGatedFeatureFlag {
  queryParams?: string; // Raw query params WITHOUT leading &: "tag_id=100639&tag_slug=tennis&order=volume24hr"
}
