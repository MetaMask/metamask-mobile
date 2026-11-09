import { useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  endTrace,
  trace,
  TraceName,
  TraceOperation,
} from '../../../../../util/trace';
import {
  getSocialHardwareTierTag,
  getSocialNetworkTierTag,
  SOCIAL_TRACE_FEATURE,
  type SocialContentState,
  type SocialPerformanceContext,
  type SocialTraceTab,
} from '../../../../../util/social/socialPerformance';

interface UseSocialTabFirstContentTraceOptions {
  contentState: SocialContentState | null;
  hasUsableData: boolean;
  performance: SocialPerformanceContext | undefined;
  tab: SocialTraceTab;
}

/**
 * Measures the first terminal renderable state for one Social V1 tab.
 *
 * A hook instance emits at most one span for its mounted screen session.
 * Refreshes, filters, revisits, and later data generations cannot restart it.
 *
 * @param options - Current tab visibility, bounded device cohorts, and UI state.
 */
export const useSocialTabFirstContentTrace = ({
  contentState,
  hasUsableData,
  performance,
  tab,
}: UseSocialTabFirstContentTraceOptions): void => {
  const traceIdRef = useRef<string | null>(null);
  const startedRef = useRef(false);
  const finishedRef = useRef(false);
  const enabledRef = useRef(performance?.enabled ?? false);
  const focusedRef = useRef(performance?.isFocused ?? false);
  const activeRef = useRef(performance?.isActive ?? false);
  const hasUsableDataRef = useRef(hasUsableData);
  const hardwareTierRef = useRef(performance?.hardwareTier ?? null);
  const networkTierRef = useRef(performance?.networkTier ?? null);

  enabledRef.current = performance?.enabled ?? false;
  focusedRef.current = performance?.isFocused ?? false;
  activeRef.current = performance?.isActive ?? false;
  hasUsableDataRef.current = hasUsableData;
  hardwareTierRef.current = performance?.hardwareTier ?? null;
  networkTierRef.current = performance?.networkTier ?? null;

  useEffect(() => {
    if (
      !performance?.enabled ||
      !performance.isFocused ||
      !performance.isActive ||
      finishedRef.current ||
      startedRef.current
    ) {
      return undefined;
    }

    const traceId = uuidv4();
    traceIdRef.current = traceId;
    trace({
      name: TraceName.SocialTabTimeToContent,
      op: TraceOperation.SocialPerformance,
      id: traceId,
      tags: {
        feature: SOCIAL_TRACE_FEATURE,
        tab,
        cache_state: hasUsableDataRef.current ? 'warm' : 'cold',
        hardware_tier: getSocialHardwareTierTag(hardwareTierRef.current),
        network_tier: getSocialNetworkTierTag(networkTierRef.current),
      },
    });
    startedRef.current = true;

    return () => {
      if (
        !startedRef.current ||
        finishedRef.current ||
        traceIdRef.current === null
      ) {
        return;
      }

      const reason = !enabledRef.current
        ? 'treatment_disabled'
        : focusedRef.current && activeRef.current
          ? 'unmounted'
          : 'unfocused';
      endTrace({
        name: TraceName.SocialTabTimeToContent,
        id: traceIdRef.current,
        status: 'error',
        data: {
          success: false,
          reason,
        },
      });
      startedRef.current = false;
      finishedRef.current = true;
    };
  }, [
    performance?.enabled,
    performance?.isActive,
    performance?.isFocused,
    tab,
  ]);

  useEffect(() => {
    if (
      contentState === null ||
      !performance?.enabled ||
      !performance.isFocused ||
      !performance.isActive ||
      !startedRef.current ||
      finishedRef.current ||
      traceIdRef.current === null
    ) {
      return;
    }

    endTrace({
      name: TraceName.SocialTabTimeToContent,
      id: traceIdRef.current,
      status: contentState === 'error' ? 'error' : 'ok',
      data: {
        success: contentState !== 'error',
        content_state: contentState,
      },
    });
    startedRef.current = false;
    finishedRef.current = true;
  }, [
    contentState,
    performance?.enabled,
    performance?.isActive,
    performance?.isFocused,
  ]);
};
