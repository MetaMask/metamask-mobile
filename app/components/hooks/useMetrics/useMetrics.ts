import { IUseMetricsHook } from './useMetrics.types';
import { AnalyticsEventBuilder } from '../../../util/analytics/AnalyticsEventBuilder';
import { analytics } from '../../../util/analytics/analytics';
import { MetaMetrics } from '../../../core/Analytics';
import { MetricsEventBuilder } from '../../../core/Analytics/MetricsEventBuilder';
import { useMemo } from 'react';
import type { ITrackingEvent } from '../../../core/Analytics/MetaMetrics.types';
import type { UserTraits } from '@segment/analytics-react-native';
import type { AnalyticsUserTraits } from '@metamask/analytics-controller';

/**
 * Hook to use analytics
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
 * @deprecated Use useAnalytics from
 * app/components/hooks/useAnalytics/useAnalytics to migrate
 * away from MetaMetrics.
 * @returns Analytics functions
 *
 * @example basic non-anonymous tracking with no properties:
 * const { trackEvent, createEventBuilder } = useMetrics();
 * trackEvent(
 *   createEventBuilder(MetaMetricsEvents.ONBOARDING_STARTED)
 *   .build()
 * );
 *
 * @example track with non-anonymous properties:
 * const { trackEvent, createEventBuilder } = useMetrics();
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
 * const { trackEvent, createEventBuilder } = useMetrics();
 * trackEvent(
 *   createEventBuilder(MetaMetricsEvents.SWAP_COMPLETED)
 *   .build()
 * )
 *
 * @example track an anonymous event with properties
 * const { trackEvent, createEventBuilder } = useMetrics();
 * trackEvent(
 *   createEventBuilder(MetaMetricsEvents.GAS_FEES_CHANGED)
 *   .addSensitiveProperties({ ...parameters })
 *   .build()
 * );
 *
 * @example track an event with both anonymous and non-anonymous properties
 * const { trackEvent, createEventBuilder } = useMetrics();
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
 *   getMetaMetricsId,
 *   createEventBuilder,
 * } = useMetrics();
 */
const useMetrics = (): IUseMetricsHook =>
  useMemo(
    () => ({
      trackEvent: (
        event: ITrackingEvent,
        saveDataRecording?: boolean,
      ): void => {
        // Convert ITrackingEvent to AnalyticsTrackingEvent format
        const analyticsEvent = AnalyticsEventBuilder.createEventBuilder(event)
          .setSaveDataRecording(saveDataRecording ?? true)
          .build();
        analytics.trackEvent(analyticsEvent);

        // Update data recording flag if needed
        // TODO: Remove this call when data recording flag logic is migrated out of MetaMetrics
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
      addTraitsToUser: async (userTraits: UserTraits): Promise<void> => {
        analytics.identify(userTraits as unknown as AnalyticsUserTraits);
      },
      createDataDeletionTask: MetaMetrics.getInstance().createDataDeletionTask,
      checkDataDeleteStatus: MetaMetrics.getInstance().checkDataDeleteStatus,
      getDeleteRegulationCreationDate:
        MetaMetrics.getInstance().getDeleteRegulationCreationDate,
      getDeleteRegulationId: MetaMetrics.getInstance().getDeleteRegulationId,
      isDataRecorded: MetaMetrics.getInstance().isDataRecorded,
      isEnabled: (): boolean => analytics.isEnabled(),
      getMetaMetricsId: async (): Promise<string | undefined> => {
        const id = await analytics.getAnalyticsId();
        return id;
      },
      createEventBuilder: MetricsEventBuilder.createEventBuilder,
    }),
    [],
  );

export default useMetrics;
