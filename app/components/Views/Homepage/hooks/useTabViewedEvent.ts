import { useCallback, useLayoutEffect, useRef } from 'react';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { useHomepageScrollContext } from '../context/HomepageScrollContext';

export const HomeTabNames = {
  PORTFOLIO: 'portfolio',
  PERPETUALS: 'perpetuals',
  PREDICTIONS: 'predictions',
} as const;

export type HomeTabName = (typeof HomeTabNames)[keyof typeof HomeTabNames];

/**
 * Fires a `Home Viewed` Segment event with `interaction_type: 'tab_viewed'`
 * whenever the active discovery tab changes or the component mounts.
 *
 * - `visit_number` increments with each homepage visit via `visitId` from HomepageScrollContext.
 * - `active_ab_tests` is injected automatically by the analytics registry (HUB_PAGE_DISCOVERY_TABS_AB_TEST_ANALYTICS_MAPPING in abTestConfig.ts).
 */
const useTabViewedEvent = () => {
  const { entryPoint, visitId, appSessionId } = useHomepageScrollContext();
  const { trackEvent, createEventBuilder } = useAnalytics();

  const entryPointRef = useRef(entryPoint);
  const appSessionIdRef = useRef(appSessionId);
  const visitIdRef = useRef(visitId);

  // useLayoutEffect keeps refs current before paint while preserving a stable
  // trackTabViewed callback (HomepageDiscoveryTabs fires portfolio on mount only).
  useLayoutEffect(() => {
    entryPointRef.current = entryPoint;
    appSessionIdRef.current = appSessionId;
    visitIdRef.current = visitId;
  }, [entryPoint, appSessionId, visitId]);

  const trackTabViewed = useCallback(
    (name: HomeTabName) => {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.HOME_VIEWED)
          .addProperties({
            interaction_type: 'tab_viewed',
            location: 'home',
            name,
            entry_point: entryPointRef.current,
            app_session_id: appSessionIdRef.current,
            visit_number: visitIdRef.current,
          })
          .build(),
      );
    },
    [trackEvent, createEventBuilder],
  );

  return { trackTabViewed };
};

export default useTabViewedEvent;
