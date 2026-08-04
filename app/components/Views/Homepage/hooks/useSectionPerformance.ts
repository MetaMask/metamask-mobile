import { useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  endTrace,
  trace,
  TraceName,
  TraceOperation,
} from '../../../../util/trace';
import type { HomeSectionName } from './useHomeViewedEvent';
import { useRenderStormMonitor } from '../../../../hooks/performance/useRenderStormMonitor';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';

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
   * When provided, tracks **full** data loading (including background work).
   * The span opens at mount and closes on the first render where this is
   * `false`, so every mount emits exactly one sample — near-zero when the
   * section is already warm — and a later refresh cycle never opens a span.
   * Can stay true after `contentReady` if the section still fetches
   * optional/secondary data.
   */
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
 * Prefix for the dev-only structured log emitted next to every Data Fetch span
 * boundary. The span itself is only observable in Sentry, so this is the sole
 * way to verify the boundary on a live device (validation recipes grep Metro).
 */
const DATA_FETCH_LOG_PREFIX = '[homepage.section.performance] data_fetch';

/**
 * Reusable performance telemetry for homepage sections.
 *
 * Captures three metrics via the existing trace/endTrace Sentry integration:
 * 1. **Time to Content** — mount until `contentReady` (valuable non-skeleton UI).
 * 2. **Data Fetch Latency** — mount until the first non-loading render (opt-in; one sample per mount, refresh excluded).
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
}: UseSectionPerformanceConfig) => {
  // --- Time to Content refs ---
  const ttcTraceId = useRef(uuidv4());
  const ttcStarted = useRef(false);
  const ttcEnded = useRef(false);

  // --- Data Fetch Latency refs ---
  const fetchTraceId = useRef(uuidv4());
  const fetchStarted = useRef(false);
  const fetchEnded = useRef(false);
  // Whether this section opted into Data Fetch tracing. Frozen at the first
  // render and used by BOTH the open and close paths, so one span never has two
  // different opt-in guards.
  const tracksDataFetch = useRef(isLoading !== undefined);
  // Sticky for the whole hook instance: the span may open at most once, so
  // re-runs of the effect below (e.g. an `enabled` false→true toggle) can never
  // open a second span at an arbitrary post-mount moment.
  const fetchSpanOpened = useRef(false);
  // Loading state on the very first render, logged with the span start so a
  // warm mount (already loaded) is distinguishable from a cold one on device.
  const isLoadingAtFirstRender = useRef(isLoading);
  // Guards the skip log so one post-mount reload logs once, not once per render.
  const skipLogged = useRef(false);

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
  // 1. Time to Content + Data Fetch Latency — start spans on mount
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

    // Data Fetch Latency — start on mount so every mount produces a sample,
    // including warm mounts that are already loaded (near-zero duration).
    if (tracksDataFetch.current && !fetchSpanOpened.current) {
      fetchSpanOpened.current = true;
      fetchTraceId.current = uuidv4();
      trace({
        name: TraceName.HomepageSectionDataFetch,
        op: TraceOperation.HomepageSectionPerformance,
        id: fetchTraceId.current,
        tags: { section_id: sectionId },
      });
      fetchStarted.current = true;
      DevLogger.log(
        `${DATA_FETCH_LOG_PREFIX} start section=${sectionId} phase=mount first_render_loading=${String(
          isLoadingAtFirstRender.current,
        )}`,
      );
    }

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
  }, [enabled, sectionId]);

  // Time to Content — end span when content is ready
  useEffect(() => {
    if (enabled && contentReady && ttcStarted.current && !ttcEnded.current) {
      endTrace({
        name: TraceName.HomepageSectionTimeToContent,
        id: ttcTraceId.current,
        data: {
          success: true,
          section_id: sectionId,
          content_state: traceContentState,
        },
      });
      ttcEnded.current = true;
    }
  }, [enabled, contentReady, sectionId, traceContentState]);

  // ──────────────────────────────────────────────
  // 2. Data Fetch Latency — end the mount-scoped span once loading is done
  // ──────────────────────────────────────────────
  useEffect(() => {
    if (!enabled || !tracksDataFetch.current) return;

    // End: first render of this mount that is no longer loading. The span is
    // opened once by the mount effect above, so neither a later refresh cycle
    // nor an `enabled` toggle can open a new span or reopen this one.
    if (!isLoading && fetchStarted.current && !fetchEnded.current) {
      endTrace({
        name: TraceName.HomepageSectionDataFetch,
        id: fetchTraceId.current,
        data: {
          success: true,
          section_id: sectionId,
          content_state: traceContentState,
        },
      });
      fetchStarted.current = false;
      fetchEnded.current = true;
      DevLogger.log(
        `${DATA_FETCH_LOG_PREFIX} end section=${sectionId} success=true content_state=${traceContentState}`,
      );
    }

    // A refresh that starts after the mount span already closed is deliberately
    // not measured — logged so the boundary is verifiable on a live device.
    if (isLoading && fetchEnded.current && !skipLogged.current) {
      skipLogged.current = true;
      DevLogger.log(
        `${DATA_FETCH_LOG_PREFIX} skip section=${sectionId} reason=post_mount_reload`,
      );
    }
  }, [enabled, isLoading, sectionId, traceContentState]);
};
