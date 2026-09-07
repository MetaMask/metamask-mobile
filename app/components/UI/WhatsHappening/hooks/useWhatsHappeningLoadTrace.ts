import { useEffect, useMemo } from 'react';
import {
  endTrace,
  trace,
  TraceName,
  TraceOperation,
} from '../../../../util/trace';
import type { DigestCacheState } from '../../../../util/digestPerformance';
import {
  getWhatsHappeningTraceEndData,
  getWhatsHappeningTraceId,
  getWhatsHappeningTraceTags,
  type WhatsHappeningStage,
} from '../utils/whatsHappeningPerformance';
import type { WhatsHappeningSourceValue } from '../constants';

interface UseWhatsHappeningLoadTraceParams {
  name: TraceName.WhatsHappeningCarouselLoad | TraceName.WhatsHappeningViewLoad;
  enabled: boolean;
  /** When false, only close empty/error/cancel. Used when press/deeplink already started the span. */
  start?: boolean;
  source: WhatsHappeningSourceValue;
  stage: WhatsHappeningStage;
  cacheState: DigestCacheState;
  isGenerationPending: boolean;
  hasContent: boolean;
  error: string | null;
}

/**
 * Owns a What's Happening time-to-content span for one observer generation.
 * Cards and the expanded view close successful traces after first commit.
 */
export const useWhatsHappeningLoadTrace = ({
  name,
  enabled,
  start = true,
  source,
  stage,
  cacheState,
  isGenerationPending,
  hasContent,
  error,
}: UseWhatsHappeningLoadTraceParams): string | undefined => {
  const traceId = getWhatsHappeningTraceId(source, stage);

  useMemo(() => {
    if (!enabled || !start) {
      return;
    }

    trace({
      name,
      op: TraceOperation.WhatsHappeningLoad,
      id: traceId,
      tags: getWhatsHappeningTraceTags({ source, stage }, cacheState),
    });
  }, [cacheState, enabled, name, source, stage, start, traceId]);

  useEffect(() => {
    if (!enabled || isGenerationPending || hasContent) {
      return;
    }

    endTrace({
      name,
      id: traceId,
      data: getWhatsHappeningTraceEndData(error ? 'error' : 'empty'),
    });
  }, [enabled, error, hasContent, isGenerationPending, name, traceId]);

  useEffect(
    () => () => {
      if (!enabled) {
        return;
      }

      endTrace({
        name,
        id: traceId,
        data: getWhatsHappeningTraceEndData('cancelled'),
      });
    },
    [enabled, name, traceId],
  );

  return enabled ? traceId : undefined;
};
