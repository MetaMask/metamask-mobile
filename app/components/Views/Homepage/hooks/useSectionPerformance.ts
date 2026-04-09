import { useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { addBreadcrumb } from '@sentry/react-native';
import performance from 'react-native-performance';
import {
  endTrace,
  trace,
  TraceName,
  TraceOperation,
} from '../../../../util/trace';
import type { HomeSectionName } from './useHomeViewedEvent';

interface UseSectionPerformanceConfig {
  /** Section identifier — primary Sentry tag for filtering. */
  sectionId: HomeSectionName;
  /** True once meaningful content (not skeleton/spinner) is rendered. */
  contentReady: boolean;
  /** True when the section is in an empty / placeholder state. */
  isEmpty: boolean;
  /** When provided, a separate data-fetch latency span is tracked via loading transitions. */
  isLoading?: boolean;
  /** Skip all tracing when false. Use for feature-flagged sections that return null. @default true */
  enabled?: boolean;
  /** Max renders allowed within the window before logging a breadcrumb. @default 3 */
  reRenderThreshold?: number;
  /** Sliding window in ms for re-render detection. @default 500 */
  reRenderWindowMs?: number;
}

const DEFAULT_RE_RENDER_THRESHOLD = 3;
const DEFAULT_RE_RENDER_WINDOW_MS = 500;

/**
 * Reusable performance telemetry for homepage sections.
 *
 * Captures three metrics via the existing trace/endTrace Sentry integration:
 * 1. **Time to Content** — mount until `contentReady` flips true.
 * 2. **Data Fetch Latency** — `isLoading` true→false transition (opt-in).
 * 3. **Re-render Monitoring** — breadcrumb when commits exceed threshold in a window (runs in `useEffect` after paint, not during render).
 *
 * Bookkeeping is ref-based; the hook does not intentionally trigger extra re-renders.
 */
export const useSectionPerformance = ({
  sectionId,
  contentReady,
  isEmpty,
  isLoading,
  enabled = true,
  reRenderThreshold = DEFAULT_RE_RENDER_THRESHOLD,
  reRenderWindowMs = DEFAULT_RE_RENDER_WINDOW_MS,
}: UseSectionPerformanceConfig) => {
  // --- Time to Content refs ---
  const ttcTraceId = useRef(uuidv4());
  const ttcStarted = useRef(false);
  const ttcEnded = useRef(false);

  // --- Data Fetch Latency refs ---
  const fetchTraceId = useRef(uuidv4());
  const fetchStarted = useRef(false);
  const fetchEnded = useRef(false);
  const prevIsLoading = useRef<boolean | undefined>(undefined);

  // --- Re-render monitoring refs ---
  const renderTimestamps = useRef<number[]>([]);
  const hasLoggedExcessiveRenders = useRef(false);

  const contentState = isEmpty ? 'empty' : 'filled';

  // ──────────────────────────────────────────────
  // 1. Time to Content — start span on mount
  // ──────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;

    ttcTraceId.current = uuidv4();
    ttcEnded.current = false;
    trace({
      name: TraceName.HomepageSectionTimeToContent,
      op: TraceOperation.HomepageSectionPerformance,
      id: ttcTraceId.current,
      tags: { section_id: sectionId },
    });
    ttcStarted.current = true;

    return () => {
      if (ttcStarted.current && !ttcEnded.current) {
        endTrace({
          name: TraceName.HomepageSectionTimeToContent,
          id: ttcTraceId.current,
          data: { success: false, reason: 'unmounted', section_id: sectionId },
        });
        ttcStarted.current = false;
      }
      if (fetchStarted.current && !fetchEnded.current) {
        endTrace({
          name: TraceName.HomepageSectionDataFetch,
          id: fetchTraceId.current,
          data: { success: false, reason: 'unmounted', section_id: sectionId },
        });
        fetchStarted.current = false;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  // Time to Content — end span when content is ready
  useEffect(() => {
    if (enabled && contentReady && ttcStarted.current && !ttcEnded.current) {
      endTrace({
        name: TraceName.HomepageSectionTimeToContent,
        id: ttcTraceId.current,
        data: {
          success: true,
          section_id: sectionId,
          content_state: contentState,
        },
      });
      ttcEnded.current = true;
    }
  }, [enabled, contentReady, sectionId, contentState]);

  // ──────────────────────────────────────────────
  // 2. Data Fetch Latency — track isLoading transitions
  // ──────────────────────────────────────────────
  useEffect(() => {
    if (!enabled || isLoading === undefined) return;

    const wasLoading = prevIsLoading.current;
    prevIsLoading.current = isLoading;

    // Start: isLoading just became true (or was true on first observed render)
    if (isLoading && !fetchStarted.current && !fetchEnded.current) {
      fetchTraceId.current = uuidv4();
      trace({
        name: TraceName.HomepageSectionDataFetch,
        op: TraceOperation.HomepageSectionPerformance,
        id: fetchTraceId.current,
        tags: { section_id: sectionId },
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
      endTrace({
        name: TraceName.HomepageSectionDataFetch,
        id: fetchTraceId.current,
        data: {
          success: true,
          section_id: sectionId,
          content_state: contentState,
        },
      });
      fetchStarted.current = false;
      fetchEnded.current = true;
    }
  }, [enabled, isLoading, sectionId, contentState]);

  // ──────────────────────────────────────────────
  // 3. Re-render Monitoring — useEffect after commit (not during render)
  //
  // In development, React 18 Strict Mode runs mount effects twice (setup → cleanup
  // → setup), which records one extra sample vs a single logical mount. Bump the
  // effective threshold in __DEV__ so dev builds match production sensitivity.
  // ──────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;

    const effectiveReRenderThreshold = __DEV__
      ? reRenderThreshold + 1
      : reRenderThreshold;

    const now = performance.now();
    const timestamps = renderTimestamps.current;
    timestamps.push(now);

    const windowStart = now - reRenderWindowMs;
    while (timestamps.length > 0 && timestamps[0] < windowStart) {
        category: TraceOperation.HomepageSectionPerformance,
    }

    if (
      timestamps.length > effectiveReRenderThreshold &&
      !hasLoggedExcessiveRenders.current
    ) {
      hasLoggedExcessiveRenders.current = true;
      addBreadcrumb({
        category: 'homepage.section.performance',
        message: `Excessive re-renders detected in section "${sectionId}": ${timestamps.length} renders in ${reRenderWindowMs}ms`,
        level: 'warning',
        data: {
          section_id: sectionId,
          render_count: timestamps.length,
          window_ms: reRenderWindowMs,
          threshold: reRenderThreshold,
        },
      });
    }
    // Intentionally every commit — do not add deps (would miss re-renders).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  });
};
