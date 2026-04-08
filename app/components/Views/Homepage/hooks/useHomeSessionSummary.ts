import { useCallback, useEffect, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { useHomepageScrollContext } from '../context/HomepageScrollContext';
import { useHomepageTrendingAbTest } from '../context/HomepageTrendingAbTestContext';
import { HOMEPAGE_TRENDING_SECTIONS_AB_KEY } from '../abTestConfig';

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
 */
const useHomeSessionSummary = ({
  totalSectionsLoaded,
}: UseHomeSessionSummaryParams) => {
  const { visitId, entryPoint, getViewedSectionCount } =
    useHomepageScrollContext();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const { variantName, isActive } = useHomepageTrendingAbTest();

  const sessionStartRef = useRef<number>(Date.now());

  // Reset session start time on each new visit (visitId increments on focus).
  useEffect(() => {
    sessionStartRef.current = Date.now();
  }, [visitId]);

  // Stable refs so the blur callback always reads the latest values without
  // needing them in its dependency array (which would re-create the callback
  // and trigger useFocusEffect cleanup → false blur events).
  const latestRef = useRef({
    visitId,
    entryPoint,
    totalSectionsLoaded,
    isActive,
    variantName,
  });
  latestRef.current = {
    visitId,
    entryPoint,
    totalSectionsLoaded,
    isActive,
    variantName,
  };

  useFocusEffect(
    useCallback(
      () => () => {
        const snap = latestRef.current;
        if (snap.visitId === 0) return;
        const sessionTime = Math.round(
          (Date.now() - sessionStartRef.current) / 1000,
        );
        trackEvent(
          createEventBuilder(MetaMetricsEvents.HOME_VIEWED)
            .addProperties({
              interaction_type: 'session_summary',
              location: 'home',
              total_sections_viewed: getViewedSectionCount(),
              total_sections_loaded: snap.totalSectionsLoaded,
              entry_point: snap.entryPoint,
              session_time: sessionTime,
              ...(snap.isActive && {
                active_ab_tests: [
                  {
                    key: HOMEPAGE_TRENDING_SECTIONS_AB_KEY,
                    value: snap.variantName,
                  },
                ],
              }),
            })
            .build(),
        );
      },
      [trackEvent, createEventBuilder, getViewedSectionCount],
    ),
  );
};

export default useHomeSessionSummary;
