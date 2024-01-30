import { useCallback, useEffect, useState } from 'react';
import { InteractionManager } from 'react-native';
import { IMetaMetricsEvent, MetaMetrics } from '../../../core/Analytics';
import { JsonMap, type UserTraits } from '@segment/analytics-react-native';
import { IMetaMetrics } from '../../../core/Analytics/MetaMetrics.types';

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
 *   trackAnonymousEvent,
 *   enable,
 *   addTraitsToUser,
 *   group,
 *   reset,
 *   flush,
 *   createDataDeletionTask,
 *   checkDataDeleteStatus,
 *   getDeleteRegulationCreationDate,
 *   getDeleteRegulationId,
 *   isDataRecorded,
 *   isEnabled,
 * } = useMetrics();
 */
function useMetrics() {
  const [metrics, setMetrics] = useState<IMetaMetrics>();

  useEffect(() => {
    const setupMetaMetrics = async () => {
      setMetrics(await MetaMetrics.getInstance());
    };

    setupMetaMetrics();
  }, []);

  /**
   * Check if MetaMetrics is enabled
   *
   * @returns true if MetaMetrics is enabled, false otherwise
   *
   * @example
   * const { isEnabled } = useMetrics();
   * const enabled = isEnabled();
   *
   * @see MetaMetrics.isEnabled
   */
  const isEnabled = useCallback(() => metrics?.isEnabled() ?? false, [metrics]);

  /**
   * Enable or disable MetaMetrics
   *
   * async function
   *
   * @param shouldEnable - true to enable, false to disable
   *
   * @example
   * const { enable } = useMetrics();
   * await enable(true);
   *
   * @see MetaMetrics.enable
   */
  const enable = useCallback(
    (shouldEnable?: boolean) => metrics?.enable(shouldEnable),
    [metrics],
  );

  /**
   * Add traits to the current user
   *
   * async function
   *
   * @param userTraits - traits to add to the current user
   *
   * @example
   * const { addTraitsToUser } = useMetrics();
   * await addTraitsToUser({trait1: 'value1', trait2: 'value2'});
   *
   * @see MetaMetrics.addTraitsToUser
   */
  const addTraitsToUser = useCallback(
    (userTraits: UserTraits) => metrics?.addTraitsToUser(userTraits),
    [metrics],
  );

  /**
   * Add an user to a specific group
   *
   * async function
   *
   * @param groupId - group id
   * @param groupTraits - group traits
   *
   * @example
   * const { group } = useMetrics();
   * await group('group name', {trait1: 'value1', trait2: 'value2'});
   *
   * @see MetaMetrics.group
   */
  const group = useCallback(
    (groupId: string, groupTraits?: JsonMap) =>
      metrics?.group(groupId, groupTraits),
    [metrics],
  );

  /**
   * Track an anonymous event
   *
   * This will track the event twice: once with the anonymous ID and once with the user ID
   *
   * - The anynomous event has properties set so you can know *what* but not *who*
   * - The non-anonymous event has no properties so you can know *who* but not *what*
   *
   * @param event - IMetaMetricsEvent event
   * @param properties - Object containing any event relevant traits or properties (optional)
   * @param saveDataRecording - param to skip saving the data recording flag (optional)
   *
   * @example
   * const { trackAnonymousEvent } = useMetrics();
   * trackAnonymousEvent(MetaMetricsEvents.SWAP_COMPLETED);
   *
   * @see MetaMetrics.trackAnonymousEvent
   */
  const trackAnonymousEvent = useCallback(
    (
      event: IMetaMetricsEvent,
      properties: JsonMap = {},
      saveDataRecording = true,
    ) => {
      InteractionManager.runAfterInteractions(async () => {
        metrics?.trackAnonymousEvent(
          event.category,
          properties,
          saveDataRecording,
        );
      });
    },
    [metrics],
  );

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
      properties: JsonMap = {},
      saveDataRecording = true,
    ) => {
      InteractionManager.runAfterInteractions(async () => {
        metrics?.trackEvent(event.category, properties, saveDataRecording);
      });
    },
    [metrics],
  );

  /**
   * Clear the internal state of the library for the current user and reset the user ID
   *
   * async function
   *
   * @example
   * const { reset } = useMetrics();
   * await reset();
   *
   * @see MetaMetrics.reset
   */
  const reset = useCallback(() => metrics?.reset(), [metrics]);

  /**
   * Forces the Segment SDK to flush all events in the queue
   *
   * async function
   *
   * This will send all events to Segment without waiting for
   * the queue to be full or the timeout to be reached
   *
   * @example
   * const { flush } = useMetrics();
   * await flush();
   *
   * @see MetaMetrics.flush
   */
  const flush = useCallback(() => metrics?.flush(), [metrics]);

  /**
   * Create a new delete regulation for the user
   *
   * async function
   *
   * @returns Promise containing the status of the request
   *
   * @example
   * const { createDataDeletionTask } = useMetrics();
   * const response = await createDataDeletionTask();
   *
   * @see MetaMetrics.createDataDeletionTask
   */
  const createDataDeletionTask = useCallback(
    () => metrics?.createDataDeletionTask(),
    [metrics],
  );

  /**
   * Check the latest delete regulation status
   *
   * async function
   *
   * @returns Promise containing the date, delete status and collected data flag
   *
   * @example
   * const { checkDataDeleteStatus } = useMetrics();
   * const status = await checkDataDeleteStatus();
   *
   * @see MetaMetrics.checkDataDeleteStatus
   */
  const checkDataDeleteStatus = useCallback(
    () => metrics?.checkDataDeleteStatus(),
    [metrics],
  );

  /**
   * Get the latest delete regulation request date
   *
   * @returns the date as a DD/MM/YYYY string
   *
   * @example
   * const { getDeleteRegulationCreationDate } = useMetrics();
   * const date = getDeleteRegulationCreationDate();
   *
   * @see MetaMetrics.getDeleteRegulationCreationDate
   */
  const getDeleteRegulationCreationDate = useCallback(
    () => metrics?.getDeleteRegulationCreationDate(),
    [metrics],
  );

  /**
   * Get the latest delete regulation request id
   *
   * @returns the id string
   *
   * @example
   * const { getDeleteRegulationId } = useMetrics();
   * const id = getDeleteRegulationId();
   *
   * @see MetaMetrics.getDeleteRegulationId
   */
  const getDeleteRegulationId = useCallback(
    () => metrics?.getDeleteRegulationId(),
    [metrics],
  );

  /**
   * Indicate if events have been recorded since the last deletion request
   *
   * @returns true if events have been recorded since the last deletion request
   *
   * @example
   * const { isDataRecorded } = useMetrics();
   * const recorded = isDataRecorded();
   *
   * @see MetaMetrics.isDataRecorded
   */
  const isDataRecorded = useCallback(
    () => metrics?.isDataRecorded(),
    [metrics],
  );

  return {
    trackEvent,
    trackAnonymousEvent,
    enable,
    addTraitsToUser,
    group,
    reset,
    flush,
    createDataDeletionTask,
    checkDataDeleteStatus,
    getDeleteRegulationCreationDate,
    getDeleteRegulationId,
    isDataRecorded,
    isEnabled,
  };
}

export default useMetrics;
