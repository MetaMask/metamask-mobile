import { useCallback, useEffect, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { useHomepageScrollContext } from '../context/HomepageScrollContext';

interface UseHomeSessionSummaryParams {
  totalSectionsLoaded: number;
}

/**
 * Fires a `Home Viewed` Segment event with `interaction_type: 'session_summary'`
 * when the user navigates away from the homepage. Captures:
 *
 * - `total_sections_viewed` — distinct sections that reached ≥50% visibility
 * - `total_sections_loaded` — sections enabled via feature flags
 * - `entry_point` — how the user arrived (app_opened, home_tab, navigated_back)
 * - `session_time` — seconds spent on the homepage this visit
 *
 * All session state is held in refs — no re-renders occur on scroll or blur.
 *
 * Any child component can call `skipNextSessionSummary()` from
 * `HomepageScrollContext` before navigating to a detail screen (e.g. Asset)
 * to suppress the event for that blur.
 */
const useHomeSessionSummary = ({
  totalSectionsLoaded,
}: UseHomeSessionSummaryParams) => {
  const {
    visitId,
    entryPoint,
    getViewedSectionCount,
    shouldSkipSessionSummary,
  } = useHomepageScrollContext();
  const { trackEvent, createEventBuilder } = useAnalytics();

  const sessionStartRef = useRef<number>(Date.now());

  // Reset session start time on each new visit (visitId increments on focus).
  useEffect(() => {
    sessionStartRef.current = Date.now();
  }, [visitId]);

  // Stable refs for the blur callback to avoid stale closure issues.
  const visitIdRef = useRef(visitId);
  const entryPointRef = useRef(entryPoint);
  const totalSectionsLoadedRef = useRef(totalSectionsLoaded);

  useEffect(() => {
    visitIdRef.current = visitId;
  }, [visitId]);
  useEffect(() => {
    entryPointRef.current = entryPoint;
  }, [entryPoint]);
  useEffect(() => {
    totalSectionsLoadedRef.current = totalSectionsLoaded;
  }, [totalSectionsLoaded]);

  useFocusEffect(
    useCallback(
      () => () => {
        if (visitIdRef.current === 0) return;
        if (shouldSkipSessionSummary()) return;
        const sessionTime = Math.round(
          (Date.now() - sessionStartRef.current) / 1000,
        );
        trackEvent(
          createEventBuilder(MetaMetricsEvents.HOME_VIEWED)
            .addProperties({
              interaction_type: 'session_summary',
              location: 'home',
              total_sections_viewed: getViewedSectionCount(),
              total_sections_loaded: totalSectionsLoadedRef.current,
              entry_point: entryPointRef.current,
              session_time: sessionTime,
            })
            .build(),
        );
      },
      [
        trackEvent,
        createEventBuilder,
        getViewedSectionCount,
        shouldSkipSessionSummary,
      ],
    ),
  );
};

export default useHomeSessionSummary;
