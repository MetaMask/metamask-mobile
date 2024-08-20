import { InteractionManager } from 'react-native';
import { IMetaMetricsEvent, MetaMetrics } from '../../../core/Analytics';
import { JsonMap } from '@segment/analytics-react-native';
import { IUseMetricsHook } from './useMetrics.types';
import { useCallback } from 'react';
import { EventProperties } from '../../../core/Analytics/MetaMetrics.types';

/**
 * Hook to use MetaMetrics
 *
 * @returns MetaMetrics functions
 *
 * @example Most of the time, the only function you will need is trackEvent:
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
      properties: JsonMap | EventProperties = {},
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
