import { Infer } from '@metamask/superstruct';
import { PredictFeeCollectionSchema } from '../schemas';
import { VersionGatedFeatureFlag } from '../../../../util/remoteFeatureFlag';
import type {
  PredictFeedBannerPosition,
  PredictFeedBannerSeverity,
} from '../constants/feedBanner';

export type PredictFeeCollection = Infer<typeof PredictFeeCollectionSchema>;

export interface PredictFeedBannerConfig extends VersionGatedFeatureFlag {
  id: string;
  title: string;
  description: string;
  position: PredictFeedBannerPosition;
  severity: PredictFeedBannerSeverity;
  dismissible: boolean;
}

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
