import type { TraceValue } from '../../../../util/trace';

export type MarketInsightsSource = 'token_details' | 'perps' | 'unknown';
export type MarketInsightsStage = 'entry_card' | 'full_view';
export type MarketInsightsAssetType = 'token' | 'perps';
export type MarketInsightsCacheState = 'warm' | 'cold';
export type MarketInsightsResult = 'success' | 'empty' | 'error' | 'cancelled';

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

export const getMarketInsightsTraceEndData = (
  result: MarketInsightsResult,
): Record<string, TraceValue> => ({
  result,
  success: result === 'success' || result === 'empty',
  ...(result !== 'cancelled'
    ? {
        content_state:
          result === 'success'
            ? 'filled'
            : result === 'empty'
              ? 'empty'
              : 'error',
      }
    : {}),
  ...(result === 'cancelled' ? { reason: 'owner_cancelled' } : {}),
});
