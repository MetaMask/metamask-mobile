import { useCallback, useRef } from 'react';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import {
  HOMEPAGE_DISCOVERY_PILL_SECTION_NAMES,
  type HomepageDiscoveryPillId,
} from '../components/HomepageDiscoveryPills/homepageDiscoveryPills.constants';
import { useHomepageScrollContext } from '../context/HomepageScrollContext';

/**
 * Fires a `Home Viewed` Segment event with `interaction_type: 'pill_tapped'`
 * when a homepage discovery pill is tapped.
 *
 * - `visit_number` increments with each homepage visit via `visitId` from HomepageScrollContext.
 * - `active_ab_tests` is injected automatically by the analytics registry (`HOMEPAGE_DISCOVERY_PILLS_AB_TEST_ANALYTICS_MAPPING` in abTestConfig.ts).
 */
const usePillViewedEvent = () => {
  const { entryPoint, visitId, appSessionId } = useHomepageScrollContext();
  const { trackEvent, createEventBuilder } = useAnalytics();

  const entryPointRef = useRef(entryPoint);
  entryPointRef.current = entryPoint;

  const appSessionIdRef = useRef(appSessionId);
  appSessionIdRef.current = appSessionId;

  const visitIdRef = useRef(visitId);
  visitIdRef.current = visitId;

  const trackPillTapped = useCallback(
    (pillId: HomepageDiscoveryPillId, position: number) => {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.HOME_VIEWED)
          .addProperties({
            interaction_type: 'pill_tapped',
            location: 'home',
            section_name: HOMEPAGE_DISCOVERY_PILL_SECTION_NAMES[pillId],
            position,
            entry_point: entryPointRef.current,
            app_session_id: appSessionIdRef.current,
            visit_number: visitIdRef.current,
          })
          .build(),
      );
    },
    [trackEvent, createEventBuilder],
  );

  return { trackPillTapped };
};

export default usePillViewedEvent;
