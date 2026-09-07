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

export const getWhatsHappeningTraceEndData = getDigestTraceEndData;
