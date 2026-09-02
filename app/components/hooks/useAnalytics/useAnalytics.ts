import { useMemo } from 'react';
import type { UseAnalyticsHook } from './useAnalytics.types';
import {
  AnalyticsEventBuilder,
  type AnalyticsTrackingEvent,
} from '../../../util/analytics/AnalyticsEventBuilder';
import { analytics } from '../../../util/analytics/analytics';
import {
  createDataDeletionTask as createDataDeletionTaskUtil,
  checkDataDeleteStatus as checkDataDeleteStatusUtil,
  getDeleteRegulationCreationDate as getDeleteRegulationCreationDateUtil,
  getDeleteRegulationId as getDeleteRegulationIdUtil,
} from '../../../util/analytics/analyticsDataDeletion';
import type { AnalyticsUserTraits } from '@metamask/analytics-controller';

/**
 * Hook to use analytics
 *
 * Provides analytics utilities backed by the analytics helper to keep the
 * existing hook API while migrating off MetaMetrics internals.
 *
 * Track with `trackEvent` and `createEventBuilder`. Put properties on the
 * builder with `addProperties`.
 *
 * @returns Analytics functions
 *
 * @example basic tracking with no properties:
 * const { trackEvent, createEventBuilder } = useAnalytics();
 * trackEvent(
 *   createEventBuilder(MetaMetricsEvents.ONBOARDING_STARTED)
 *   .build()
 * );
 *
 * @example track with properties:
 * const { trackEvent, createEventBuilder } = useAnalytics();
 * trackEvent(
 *   createEventBuilder(MetaMetricsEvents.BROWSER_SEARCH_USED)
 *   .addProperties({
 *     option_chosen: 'Browser Bottom Bar Menu',
 *     number_of_tabs: undefined,
 *   })
 *   .build()
 * );
 *
 * @example a full hook destructuring:
 * const {
 *   trackEvent,
 *   createEventBuilder,
 *   enable,
 *   identify,
 *   createDataDeletionTask,
 *   checkDataDeleteStatus,
 *   getDeleteRegulationCreationDate,
 *   getDeleteRegulationId,
 *   isEnabled,
 *   getAnalyticsId,
 * } = useAnalytics();
 */
export const useAnalytics = (): UseAnalyticsHook =>
  useMemo(
    () => ({
      trackEvent: (event: AnalyticsTrackingEvent): void => {
        analytics.trackEvent(event);
      },
      enable: async (enable?: boolean): Promise<void> => {
        if (enable === false) {
          await analytics.optOut();
        } else {
          await analytics.optIn();
        }
      },
      identify: async (userTraits: AnalyticsUserTraits): Promise<void> => {
        analytics.identify(userTraits);
      },
      createDataDeletionTask: () => createDataDeletionTaskUtil(),
      checkDataDeleteStatus: () => checkDataDeleteStatusUtil(),
      getDeleteRegulationCreationDate: () =>
        getDeleteRegulationCreationDateUtil(),
      getDeleteRegulationId: () => getDeleteRegulationIdUtil(),
      isEnabled: (): boolean => analytics.isEnabled(),
      getAnalyticsId: async (): Promise<string | undefined> => {
        const id = await analytics.getAnalyticsId();
        return id;
      },
      createEventBuilder: AnalyticsEventBuilder.createEventBuilder,
    }),
    [],
  );
