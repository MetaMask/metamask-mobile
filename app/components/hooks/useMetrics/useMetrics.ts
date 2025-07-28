import { IUseMetricsHook } from './useMetrics.types';
import { MetricsEventBuilder } from '../../../core/Analytics/MetricsEventBuilder';
import { MetaMetrics } from '../../../core/Analytics';
import { useMemo } from 'react';

/**
 * Hook to use MetaMetrics
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
 * @returns MetaMetrics functions
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
      trackEvent: MetaMetrics.getInstance().trackEvent,
      enable: MetaMetrics.getInstance().enable,
      addTraitsToUser: MetaMetrics.getInstance().addTraitsToUser,
      createDataDeletionTask: MetaMetrics.getInstance().createDataDeletionTask,
      checkDataDeleteStatus: MetaMetrics.getInstance().checkDataDeleteStatus,
      getDeleteRegulationCreationDate:
        MetaMetrics.getInstance().getDeleteRegulationCreationDate,
      getDeleteRegulationId: MetaMetrics.getInstance().getDeleteRegulationId,
      isDataRecorded: MetaMetrics.getInstance().isDataRecorded,
      isEnabled: MetaMetrics.getInstance().isEnabled,
      getMetaMetricsId: MetaMetrics.getInstance().getMetaMetricsId,
      createEventBuilder: MetricsEventBuilder.createEventBuilder,
    }),
    [],
  );

export default useMetrics;
