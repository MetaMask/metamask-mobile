import { useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  annotateTrace,
  endTrace,
  getTraceContext,
  trace,
  TraceName,
  TraceOperation,
} from '../../../../util/trace';
import type { HomeSectionName } from './useHomeViewedEvent';
import { useRenderStormMonitor } from '../../../../hooks/performance/useRenderStormMonitor';

interface UseSectionPerformanceConfig {
  /** Section identifier — primary Sentry tag for filtering. */
  sectionId: HomeSectionName;
  /**
   * True once the user can see **valuable** UI (real rows/cards/error), not a
   * section skeleton. May flip true while `isLoading` is still true if other
   * data continues loading in the background (see Data Fetch span).
   */
  contentReady: boolean;
  /** True when the section is in an empty / placeholder state. */
  isEmpty: boolean;
  /**
   * When set, sent as `content_state` on successful trace ends instead of
   * deriving from `isEmpty` (e.g. `error` for connection / fetch error UI).
   */
  contentStateForTrace?: 'filled' | 'empty' | 'error';
  /**
   * When provided, tracks **full** data loading (including background work) via
   * the first `isLoading` true→false transition per mount. Can stay true after
   * `contentReady` if the section still fetches optional/secondary data.
   */
  isLoading?: boolean;
  /** Skip all tracing when false. Use for feature-flagged sections that return null. @default true */
  enabled?: boolean;
  /** Max renders allowed within the window before logging a breadcrumb. @default 3 */
  reRenderThreshold?: number;
  /** Sliding window in ms for re-render detection. @default 500 */
  reRenderWindowMs?: number;
  /** Bounded cohort tags applied to the existing TTC and DFD starts. */
  tags?: Record<string, string | number | boolean>;
  /** Trace data/context applied to the existing TTC and DFD ends. */
  data?: Record<string, string | number | boolean>;
  /** Restarts TTC/DFD when one mounted surface begins a new data generation. */
  generationKey?: string;
}

const DEFAULT_RE_RENDER_THRESHOLD = 3;
const DEFAULT_RE_RENDER_WINDOW_MS = 500;
const RESERVED_METADATA_KEYS = new Set([
  'section_id',
  'success',
  'content_state',
  'reason',
]);

const sanitizeMetadata = (
  metadata?: Record<string, string | number | boolean>,
) =>
  metadata
    ? Object.fromEntries(
        Object.entries(metadata).filter(
          ([key]) => !RESERVED_METADATA_KEYS.has(key),
        ),
      )
    : undefined;

/**
 * Reusable performance telemetry for homepage sections.
 *
 * Captures three metrics via the existing trace/endTrace Sentry integration:
 * 1. **Time to Content** — mount until `contentReady` (valuable non-skeleton UI).
 * 2. **Data Fetch Latency** — first full `isLoading` cycle per mount (opt-in; refresh excluded).
 * 3. **Re-render Monitoring** — breadcrumb when commits exceed threshold in a window (runs after every commit).
 *
 * Bookkeeping is ref-based; the hook does not intentionally trigger extra re-renders.
 */
export const useSectionPerformance = ({
  sectionId,
  contentReady,
  isEmpty,
  contentStateForTrace,
  isLoading,
  enabled = true,
  reRenderThreshold = DEFAULT_RE_RENDER_THRESHOLD,
  reRenderWindowMs = DEFAULT_RE_RENDER_WINDOW_MS,
  tags,
  data,
  generationKey,
}: UseSectionPerformanceConfig) => {
  const nextTagsRef = useRef(sanitizeMetadata(tags));
  nextTagsRef.current = sanitizeMetadata(tags);
  const nextDataRef = useRef(sanitizeMetadata(data));
  nextDataRef.current = sanitizeMetadata(data);
  const pendingGenerationKeyRef = useRef(generationKey);
  pendingGenerationKeyRef.current = generationKey;
  const activeGenerationKeyRef = useRef(generationKey);
  const tagsRef = useRef(nextTagsRef.current);
  const dataRef = useRef(nextDataRef.current);
  if (activeGenerationKeyRef.current === generationKey) {
    tagsRef.current = nextTagsRef.current;
    dataRef.current = nextDataRef.current;
  }

  const annotateLatestTags = (name: TraceName, id: string) => {
    if (!tagsRef.current) {
      return;
    }
    annotateTrace(getTraceContext({ name, id }), tagsRef.current);
  };

  // --- Time to Content refs ---
  const ttcTraceId = useRef(uuidv4());
  const ttcStarted = useRef(false);
  const ttcEnded = useRef(false);

  // --- Data Fetch Latency refs ---
  const fetchTraceId = useRef(uuidv4());
  const fetchStarted = useRef(false);
  const fetchEnded = useRef(false);
  const prevIsLoading = useRef<boolean | undefined>(undefined);

  const traceContentState =
    contentStateForTrace ?? (isEmpty ? 'empty' : 'filled');

  useRenderStormMonitor({
    id: sectionId,
    category: TraceOperation.HomepageSectionPerformance,
    entityLabel: 'section',
    breadcrumbData: { section_id: sectionId },
    enabled,
    reRenderThreshold,
    reRenderWindowMs,
  });

  // ──────────────────────────────────────────────
  // 1. Time to Content — start span on mount
  // ──────────────────────────────────────────────
  useEffect(() => {
    activeGenerationKeyRef.current = generationKey;
    tagsRef.current = nextTagsRef.current;
    dataRef.current = nextDataRef.current;
    fetchStarted.current = false;
    fetchEnded.current = false;
    prevIsLoading.current = undefined;
    if (!enabled) return;

    const startedGenerationKey = generationKey;
    ttcTraceId.current = uuidv4();
    ttcEnded.current = false;
    trace({
      name: TraceName.HomepageSectionTimeToContent,
      op: TraceOperation.HomepageSectionPerformance,
      id: ttcTraceId.current,
      tags: { ...tagsRef.current, section_id: sectionId },
      data: { ...tagsRef.current, section_id: sectionId },
    });
    ttcStarted.current = true;

    return () => {
      if (ttcStarted.current && !ttcEnded.current) {
        annotateLatestTags(
          TraceName.HomepageSectionTimeToContent,
          ttcTraceId.current,
        );
        endTrace({
          name: TraceName.HomepageSectionTimeToContent,
          id: ttcTraceId.current,
          data: {
            ...tagsRef.current,
            ...dataRef.current,
            success: false,
            reason:
              pendingGenerationKeyRef.current === startedGenerationKey
                ? 'unmounted'
                : 'generation_changed',
            section_id: sectionId,
          },
        });
        ttcStarted.current = false;
      }
      if (fetchStarted.current && !fetchEnded.current) {
        annotateLatestTags(
          TraceName.HomepageSectionDataFetch,
          fetchTraceId.current,
        );
        endTrace({
          name: TraceName.HomepageSectionDataFetch,
          id: fetchTraceId.current,
          data: {
            ...tagsRef.current,
            ...dataRef.current,
            success: false,
            reason:
              pendingGenerationKeyRef.current === startedGenerationKey
                ? 'unmounted'
                : 'generation_changed',
            section_id: sectionId,
          },
        });
        fetchStarted.current = false;
      }
    };
  }, [enabled, generationKey, sectionId]);

  // Time to Content — end span when content is ready
  useEffect(() => {
    if (enabled && contentReady && ttcStarted.current && !ttcEnded.current) {
      annotateLatestTags(
        TraceName.HomepageSectionTimeToContent,
        ttcTraceId.current,
      );
      endTrace({
        name: TraceName.HomepageSectionTimeToContent,
        id: ttcTraceId.current,
        data: {
          ...tagsRef.current,
          ...dataRef.current,
          success: true,
          section_id: sectionId,
          content_state: traceContentState,
        },
      });
      ttcEnded.current = true;
    }
  }, [enabled, contentReady, sectionId, traceContentState, data]);

  // ──────────────────────────────────────────────
  // 2. Data Fetch Latency — track isLoading transitions
  // ──────────────────────────────────────────────
  useEffect(() => {
    if (!enabled || isLoading === undefined) return;

    const wasLoading = prevIsLoading.current;
    prevIsLoading.current = isLoading;

    // Start: first loading spell only (subsequent refresh cycles are not traced)
    if (isLoading && !fetchStarted.current && !fetchEnded.current) {
      fetchTraceId.current = uuidv4();
      trace({
        name: TraceName.HomepageSectionDataFetch,
        op: TraceOperation.HomepageSectionPerformance,
        id: fetchTraceId.current,
        tags: { ...tagsRef.current, section_id: sectionId },
        data: { ...tagsRef.current, section_id: sectionId },
      });
      fetchStarted.current = true;
    }

    // End: isLoading transitioned from true → false
    if (
      wasLoading === true &&
      !isLoading &&
      fetchStarted.current &&
      !fetchEnded.current
    ) {
      annotateLatestTags(
        TraceName.HomepageSectionDataFetch,
        fetchTraceId.current,
      );
      endTrace({
        name: TraceName.HomepageSectionDataFetch,
        id: fetchTraceId.current,
        data: {
          ...tagsRef.current,
          ...dataRef.current,
          success: true,
          section_id: sectionId,
          content_state: traceContentState,
        },
      });
      fetchStarted.current = false;
      fetchEnded.current = true;
    }
  }, [enabled, isLoading, sectionId, traceContentState, data]);
};
