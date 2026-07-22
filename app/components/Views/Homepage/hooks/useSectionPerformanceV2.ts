import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { v4 as uuidv4 } from 'uuid';
import {
  endTrace,
  trace,
  TraceName,
  TraceOperation,
  type TraceValue,
} from '../../../../util/trace';
import { useHomepageScrollContext } from '../context/HomepageScrollContext';
import { useHomepageSectionPerformanceContext } from '../performance/HomepageSectionPerformanceContext';
import type { HomeSectionMode } from '../types';
import type { HomeSectionName } from './useHomeViewedEvent';

export type HomepageSectionPerformanceV2ContentState =
  | 'filled'
  | 'empty'
  | 'error';

export type HomepageSectionPerformanceV2CacheState =
  | 'cold'
  | 'warm'
  | 'unknown';

interface UseSectionPerformanceV2Config {
  sectionId: HomeSectionName;
  contentReady: boolean;
  isEmpty: boolean;
  contentStateForTrace?: HomepageSectionPerformanceV2ContentState;
  isLoading?: boolean;
  dataReady?: boolean;
  enabled?: boolean;
  requiresLayout?: boolean;
  sectionMode?: HomeSectionMode;
  sectionVariant?: string;
  itemCount?: number;
  cacheState?: HomepageSectionPerformanceV2CacheState;
  extraTags?: Record<string, TraceValue>;
}

export const HOMEPAGE_SECTION_PERFORMANCE_V2_TIMEOUT_MS = 30_000;
const INSTRUMENTATION_VERSION = '2';

export const useSectionPerformanceV2 = ({
  sectionId,
  contentReady,
  isEmpty,
  contentStateForTrace,
  isLoading,
  dataReady,
  enabled = true,
  requiresLayout = true,
  sectionMode = 'default',
  sectionVariant = 'default',
  itemCount,
  cacheState = 'unknown',
  extraTags,
}: UseSectionPerformanceV2Config) => {
  const { activeSession } = useHomepageSectionPerformanceContext();
  const { appSessionId, entryPoint, visitId } = useHomepageScrollContext();
  const [hasContentLayout, setHasContentLayout] = useState(false);

  const contentTraceId = useRef(uuidv4());
  const dataTraceId = useRef(uuidv4());
  const contentTraceStarted = useRef(false);
  const dataTraceStarted = useRef(false);
  const contentTraceEnded = useRef(false);
  const dataTraceEnded = useRef(false);
  const timeoutId = useRef<ReturnType<typeof setTimeout> | null>(null);
  const baseTagsRef = useRef<Record<string, TraceValue>>({});
  const endContentTraceRef = useRef<(reason?: string) => void>(() => undefined);
  const endDataTraceRef = useRef<(reason?: string) => void>(() => undefined);

  const traceContentState =
    contentStateForTrace ?? (isEmpty ? 'empty' : 'filled');
  const traceDataReady =
    dataReady ?? (isLoading === undefined ? contentReady : !isLoading);
  const shouldMeasure = Boolean(enabled && activeSession);
  const shouldEndContent =
    shouldMeasure && contentReady && (!requiresLayout || hasContentLayout);

  const baseTags = useMemo(
    () => ({
      instrumentation_version: INSTRUMENTATION_VERSION,
      section_id: sectionId,
      section_mode: sectionMode,
      section_variant: sectionVariant,
      session_trigger: activeSession?.trigger ?? 'unknown',
      homepage_perf_session_id: activeSession?.id ?? 'none',
      app_session_id: appSessionId,
      entry_point: entryPoint,
      visit_id: visitId,
      ...extraTags,
    }),
    [
      activeSession?.id,
      activeSession?.trigger,
      appSessionId,
      entryPoint,
      extraTags,
      sectionId,
      sectionMode,
      sectionVariant,
      visitId,
    ],
  );

  const endData = useCallback(
    (reason?: string) => {
      const success =
        traceContentState !== 'error' &&
        reason !== 'timeout' &&
        reason !== 'unmounted' &&
        reason !== 'blurred';

      return {
        success,
        section_id: sectionId,
        instrumentation_version: INSTRUMENTATION_VERSION,
        content_state: traceContentState,
        cache_state: cacheState,
        ...(itemCount !== undefined ? { item_count: itemCount } : {}),
        ...(reason ? { reason } : {}),
      };
    },
    [cacheState, itemCount, sectionId, traceContentState],
  );

  const endContentTrace = useCallback(
    (reason?: string) => {
      if (!contentTraceStarted.current || contentTraceEnded.current) {
        return;
      }

      endTrace({
        name: TraceName.HomepageSectionTimeToContentV2,
        id: contentTraceId.current,
        data: endData(reason),
      });
      contentTraceEnded.current = true;
    },
    [endData],
  );

  const endDataTrace = useCallback(
    (reason?: string) => {
      if (!dataTraceStarted.current || dataTraceEnded.current) {
        return;
      }

      endTrace({
        name: TraceName.HomepageSectionDataReadyV2,
        id: dataTraceId.current,
        data: endData(reason),
      });
      dataTraceEnded.current = true;
    },
    [endData],
  );

  useEffect(() => {
    baseTagsRef.current = baseTags;
  }, [baseTags]);

  useEffect(() => {
    endContentTraceRef.current = endContentTrace;
    endDataTraceRef.current = endDataTrace;
  }, [endContentTrace, endDataTrace]);

  useEffect(() => {
    if (!shouldMeasure || !activeSession) {
      return undefined;
    }

    contentTraceId.current = uuidv4();
    dataTraceId.current = uuidv4();
    contentTraceStarted.current = true;
    dataTraceStarted.current = true;
    contentTraceEnded.current = false;
    dataTraceEnded.current = false;
    setHasContentLayout(false);

    trace({
      name: TraceName.HomepageSectionTimeToContentV2,
      op: TraceOperation.HomepageSectionPerformanceV2,
      id: contentTraceId.current,
      startTime: activeSession.startTime,
      tags: baseTagsRef.current,
    });
    trace({
      name: TraceName.HomepageSectionDataReadyV2,
      op: TraceOperation.HomepageSectionPerformanceV2,
      id: dataTraceId.current,
      startTime: activeSession.startTime,
      tags: baseTagsRef.current,
    });

    timeoutId.current = setTimeout(() => {
      endContentTraceRef.current('timeout');
      endDataTraceRef.current('timeout');
    }, HOMEPAGE_SECTION_PERFORMANCE_V2_TIMEOUT_MS);

    return () => {
      if (timeoutId.current) {
        clearTimeout(timeoutId.current);
        timeoutId.current = null;
      }
      endContentTraceRef.current('unmounted');
      endDataTraceRef.current('unmounted');
      contentTraceStarted.current = false;
      dataTraceStarted.current = false;
    };
  }, [activeSession, sectionId, shouldMeasure]);

  useEffect(() => {
    if (!shouldEndContent) {
      return;
    }

    const reason =
      traceContentState === 'error'
        ? 'error'
        : !requiresLayout
          ? 'hidden_empty'
          : undefined;
    endContentTrace(reason);
  }, [endContentTrace, requiresLayout, shouldEndContent, traceContentState]);

  useEffect(() => {
    if (!shouldMeasure || !traceDataReady) {
      return;
    }

    endDataTrace(traceContentState === 'error' ? 'error' : undefined);
  }, [endDataTrace, shouldMeasure, traceDataReady, traceContentState]);

  const onContentLayout = useCallback((event?: LayoutChangeEvent) => {
    if (event && event.nativeEvent.layout.height <= 0) {
      return;
    }
    setHasContentLayout(true);
  }, []);

  return { onContentLayout };
};
