import { useMemo } from 'react';
import type { UseAnalyticsHook } from './useAnalytics.types';
import {
  AnalyticsEventBuilder,
  type AnalyticsTrackingEvent,
} from '../../../util/analytics/AnalyticsEventBuilder';
import { analytics } from '../../../util/analytics/analytics';
import { MetaMetrics } from '../../../core/Analytics';
import type { AnalyticsUserTraits } from '@metamask/analytics-controller';

/**
 * Hook to use analytics
 *
 * Provides analytics utilities backed by the analytics helper to keep the
 * existing hook API while migrating off MetaMetrics internals.
 *
 * The hook allows to track non-anonymous and anonymous events,
 * with properties and without properties,
 * with a unique trackEvent function
 *
 * ## Regular non-anonymous events
 * Regular events are tracked with the user ID and can have properties set
 *
 * ## Anonymous events
 * Anonymous tracking track sends two events: one with the anonymous ID and one with the user ID
 * - The anonymous event includes sensitive properties so you can know **what** but not **who**
 * - The non-anonymous event has either no properties or not sensitive one so you can know **who** but not **what**
 *
 * @returns Analytics functions compatible with the useMetrics API
 *
 * @example basic non-anonymous tracking with no properties:
 * const { trackEvent, createEventBuilder } = useAnalytics();
 * trackEvent(
 *   createEventBuilder(MetaMetricsEvents.ONBOARDING_STARTED)
 *   .build()
 * );
 *
 * @example track with non-anonymous properties:
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
 * @example track an anonymous event (without properties)
 * const { trackEvent, createEventBuilder } = useAnalytics();
 * trackEvent(
 *   createEventBuilder(MetaMetricsEvents.SWAP_COMPLETED)
 *   .build()
 * )
 *
 * @example track an anonymous event with properties
 * const { trackEvent, createEventBuilder } = useAnalytics();
 * trackEvent(
 *   createEventBuilder(MetaMetricsEvents.GAS_FEES_CHANGED)
 *   .addSensitiveProperties({ ...parameters })
 *   .build()
 * );
 *
 * @example track an event with both anonymous and non-anonymous properties
 * const { trackEvent, createEventBuilder } = useAnalytics();
 * trackEvent(
 *   createEventBuilder(MetaMetricsEvents.MY_EVENT)
 *   .addProperties({ ...nonAnonymousParameters })
 *   .addSensitiveProperties({ ...anonymousParameters })
 *   .build()
 * );
 *
 * @example a full hook destructuring:
 * const {
 *   trackEvent,
 *   createEventBuilder,
 *   enable,
 *   addTraitsToUser,
 *   createDataDeletionTask,
 *   checkDataDeleteStatus,
 *   getDeleteRegulationCreationDate,
 *   getDeleteRegulationId,
 *   isDataRecorded,
 *   isEnabled,
 *   getAnalyticsId,
 * } = useAnalytics();
 */
export const useAnalytics = (): UseAnalyticsHook =>
  useMemo(
    () => ({
      trackEvent: (
        event: AnalyticsTrackingEvent,
        saveDataRecording?: boolean,
      ): void => {
        const analyticsEvent = AnalyticsEventBuilder.createEventBuilder(event)
          .setSaveDataRecording(saveDataRecording ?? true)
          .build();
        analytics.trackEvent(analyticsEvent);

        // Preserve data deletion behavior until MetaMetrics is fully removed.
        MetaMetrics.getInstance().updateDataRecordingFlag(
          analyticsEvent.saveDataRecording,
        );
      },
      enable: async (enable?: boolean): Promise<void> => {
        if (enable === false) {
          await analytics.optOut();
        } else {
          await analytics.optIn();
        }
      },
      addTraitsToUser: async (
        userTraits: AnalyticsUserTraits,
      ): Promise<void> => {
        analytics.identify(userTraits);
      },
      createDataDeletionTask: MetaMetrics.getInstance().createDataDeletionTask,
      checkDataDeleteStatus: MetaMetrics.getInstance().checkDataDeleteStatus,
      getDeleteRegulationCreationDate:
        MetaMetrics.getInstance().getDeleteRegulationCreationDate,
      getDeleteRegulationId: MetaMetrics.getInstance().getDeleteRegulationId,
      isDataRecorded: MetaMetrics.getInstance().isDataRecorded,
      isEnabled: (): boolean => analytics.isEnabled(),
      getAnalyticsId: async (): Promise<string | undefined> => {
        const id = await analytics.getAnalyticsId();
        return id;
      },
      createEventBuilder: AnalyticsEventBuilder.createEventBuilder,
    }),
    [],
  );
