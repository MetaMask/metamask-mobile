import { InteractionManager } from 'react-native';
import { IMetaMetricsEvent, MetaMetrics } from '../../../core/Analytics';
import { IUseMetricsHook } from './useMetrics.types';
import { useCallback } from 'react';
import { CombinedProperties } from '../../../core/Analytics/MetaMetrics.types';

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
 * const { trackEvent } = useMetrics();
 * trackEvent(MetaMetricsEvents.ONBOARDING_STARTED);
 *
 * @example track with non-anonymous properties:
 * const { trackEvent } = useMetrics();
 * trackEvent(MetaMetricsEvents.BROWSER_SEARCH_USED, {
 *   option_chosen: 'Browser Bottom Bar Menu',
 *   number_of_tabs: undefined,
 * });
 *
 * @example you can also track with non-anonymous properties (new properties structure):
 * const { trackEvent } = useMetrics();
 * trackEvent(MetaMetricsEvents.BROWSER_SEARCH_USED, {
 *   properties: {
 *     option_chosen: 'Browser Bottom Bar Menu',
 *     number_of_tabs: undefined,
 *   },
 * });
 *
 * @example track an anonymous event (without properties)
 * const { trackEvent } = useMetrics();
 * trackEvent(MetaMetricsEvents.SWAP_COMPLETED);
 *
 * @example track an anonymous event with properties
 * trackEvent(MetaMetricsEvents.GAS_FEES_CHANGED, {
 *   sensitiveProperties: { ...parameters },
 * });
 *
 * @example track an event with both anonymous and non-anonymous properties
 * trackEvent(MetaMetricsEvents.MY_EVENT, {
 *   properties: { ...nonAnonymousParameters },
 *   sensitiveProperties: { ...anonymousParameters },
 * });
 *
 * @example a full destructuration of the hook:
 * const {
 *   trackEvent,
 *   enable,
 *   addTraitsToUser,
 *   createDataDeletionTask,
 *   checkDataDeleteStatus,
 *   getDeleteRegulationCreationDate,
 *   getDeleteRegulationId,
 *   isDataRecorded,
 *   isEnabled,
 *   getMetaMetricsId,
 * } = useMetrics();
 */
const useMetrics = (): IUseMetricsHook => {
  /**
   * Track an event - the regular way
   *
   * @param event - IMetaMetricsEvent event
   * @param properties - Object containing any event relevant traits or properties (optional)
   * @param saveDataRecording - param to skip saving the data recording flag (optional)
   *
   * @example
   * const { trackEvent } = useMetrics();
   * trackEvent(MetaMetricsEvents.ONBOARDING_STARTED);
   *
   * @example track with properties:
   * const { trackEvent } = useMetrics();
   * trackEvent(MetaMetricsEvents.BROWSER_SEARCH_USED, {
   *       option_chosen: 'Browser Bottom Bar Menu',
   *       number_of_tabs: undefined,
   *     });
   *
   * @see MetaMetrics.trackEvent
   */
  const trackEvent = useCallback(
    (
      event: IMetaMetricsEvent,
      properties: CombinedProperties = {},
      saveDataRecording = true,
    ) => {
      InteractionManager.runAfterInteractions(async () => {
        MetaMetrics.getInstance().trackEvent(
          event,
          properties,
          saveDataRecording,
        );
      });
    },
    [],
  );

  return {
    trackEvent,
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
  };
};

export default useMetrics;
