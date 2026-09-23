import type { TraceValue } from '../../../../util/trace';
import {
  getDigestTraceEndData,
  type DigestCacheState,
  type DigestResult,
} from '../../../../util/digestPerformance';

export type MarketInsightsSource = 'token_details' | 'perps' | 'unknown';
export type MarketInsightsStage = 'entry_card' | 'full_view';
export type MarketInsightsAssetType = 'token' | 'perps';
export type MarketInsightsCacheState = DigestCacheState;
export type MarketInsightsResult = DigestResult;

export interface MarketInsightsTelemetryContext {
  source: MarketInsightsSource;
  stage: MarketInsightsStage;
  assetType: MarketInsightsAssetType;
}

export const getMarketInsightsTraceId = (
  assetIdentifier: string,
  source: MarketInsightsSource,
  stage: MarketInsightsStage,
) => `${source}:${stage}:${assetIdentifier}`;

export const getMarketInsightsTraceTags = (
  context: MarketInsightsTelemetryContext,
  cacheState: MarketInsightsCacheState,
): Record<string, TraceValue> => ({
  feature: 'market_insights',
  source: context.source,
  stage: context.stage,
  asset_type: context.assetType,
  cache_state: cacheState,
});

export const getMarketInsightsTraceEndData = getDigestTraceEndData;
