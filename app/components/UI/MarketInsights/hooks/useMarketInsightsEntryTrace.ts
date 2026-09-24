import { useEffect, useMemo } from 'react';
import type { MarketInsightsReport } from '@metamask/ai-controllers';
import {
  endTrace,
  trace,
  TraceName,
  TraceOperation,
} from '../../../../util/trace';
import {
  getMarketInsightsTraceEndData,
  getMarketInsightsTraceId,
  getMarketInsightsTraceTags,
  type MarketInsightsAssetType,
  type MarketInsightsCacheState,
  type MarketInsightsSource,
} from '../utils/marketInsightsPerformance';

interface UseMarketInsightsEntryTraceParams {
  assetIdentifier: string | null | undefined;
  assetType: MarketInsightsAssetType;
  cacheState: MarketInsightsCacheState;
  enabled: boolean;
  error: string | null;
  isLoading: boolean;
  report: MarketInsightsReport | null;
  source: MarketInsightsSource;
}

/**
 * Owns the entry-card time-to-content trace for one asset generation.
 * The card ends successful traces after its first committed render; this hook
 * closes valid empty, error, and abandoned generations.
 */
export const useMarketInsightsEntryTrace = ({
  assetIdentifier,
  assetType,
  cacheState,
  enabled,
  error,
  isLoading,
  report,
  source,
}: UseMarketInsightsEntryTraceParams): string | undefined => {
  const traceId = assetIdentifier
    ? getMarketInsightsTraceId(assetIdentifier, source, 'entry_card')
    : undefined;

  useMemo(() => {
    if (!enabled || !traceId) {
      return;
    }

    trace({
      name: TraceName.MarketInsightsEntryCardLoad,
      op: TraceOperation.MarketInsightsLoad,
      id: traceId,
      tags: getMarketInsightsTraceTags(
        { source, stage: 'entry_card', assetType },
        cacheState,
      ),
    });
  }, [assetType, cacheState, enabled, source, traceId]);

  useEffect(() => {
    if (!enabled || !traceId || isLoading || report) {
      return;
    }

    endTrace({
      name: TraceName.MarketInsightsEntryCardLoad,
      id: traceId,
      data: getMarketInsightsTraceEndData(error ? 'error' : 'empty'),
    });
  }, [enabled, error, isLoading, report, traceId]);

  useEffect(
    () => () => {
      if (!enabled || !traceId) {
        return;
      }

      endTrace({
        name: TraceName.MarketInsightsEntryCardLoad,
        id: traceId,
        data: getMarketInsightsTraceEndData('cancelled'),
      });
    },
    [enabled, traceId],
  );

  return traceId;
};
