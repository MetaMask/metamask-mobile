import type { TraceValue } from '../../../../util/trace';
import { getDigestTraceEndData } from '../../../../util/digestPerformance';
import type { WhatsHappeningSourceValue } from '../constants';

export type WhatsHappeningStage = 'carousel' | 'expanded';

export interface WhatsHappeningTelemetryContext {
  source: WhatsHappeningSourceValue;
  stage: WhatsHappeningStage;
}

export const getWhatsHappeningTraceId = (
  source: WhatsHappeningSourceValue,
  stage: WhatsHappeningStage,
) => `${source}:${stage}`;

export const getWhatsHappeningTraceTags = (
  context: WhatsHappeningTelemetryContext,
  cacheState: 'warm' | 'cold',
  extra?: Record<string, TraceValue>,
): Record<string, TraceValue> => ({
  feature: 'whats_happening',
  source: context.source,
  stage: context.stage,
  cache_state: cacheState,
  ...extra,
});

/**
 * Overview fetch is one shared React Query generation. Do not stamp
 * observer `source` / `stage` — whichever mount ran `queryFn` is not the
 * network caller.
 *
 * @param cacheState - Cache state when this generation began.
 * @param fetchKind - Overview or deeplink front-page request.
 * @returns Bounded fetch-span tags.
 */
export const getWhatsHappeningFetchTags = (
  cacheState: 'warm' | 'cold',
  fetchKind: 'overview' | 'front_page',
): Record<string, TraceValue> => ({
  feature: 'whats_happening',
  cache_state: cacheState,
  fetch_kind: fetchKind,
});

export const getWhatsHappeningTraceEndData = getDigestTraceEndData;
