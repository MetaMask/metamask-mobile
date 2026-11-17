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
  /**
   * Close a caller-started span when this observer is inactive. Used for
   * expanded View Load so a deeplink/press span cannot outlive a flagged-off
   * or unmounted detail observer. Must stay false on carousel observers that
   * also call this hook with `start: false`.
   */
  closeWhenDisabled?: boolean;
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
  closeWhenDisabled = false,
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
    if (!enabled) {
      if (closeWhenDisabled) {
        endTrace({
          name,
          id: traceId,
          data: getWhatsHappeningTraceEndData('cancelled'),
        });
      }
      return;
    }

    if (isGenerationPending || hasContent) {
      return;
    }

    endTrace({
      name,
      id: traceId,
      data: getWhatsHappeningTraceEndData(error ? 'error' : 'empty'),
    });
  }, [
    closeWhenDisabled,
    enabled,
    error,
    hasContent,
    isGenerationPending,
    name,
    traceId,
  ]);

  useEffect(
    () => () => {
      if (!enabled && !closeWhenDisabled) {
        return;
      }

      endTrace({
        name,
        id: traceId,
        data: getWhatsHappeningTraceEndData('cancelled'),
      });
    },
    [closeWhenDisabled, enabled, name, traceId],
  );

  return enabled ? traceId : undefined;
};
