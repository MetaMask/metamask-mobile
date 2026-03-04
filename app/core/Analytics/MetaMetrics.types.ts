import type {
  UserTraits,
  GroupTraits,
  SegmentClient,
} from '@segment/analytics-react-native';
import { PublicInterface } from '@metamask/utils';
import type { ITrackingEvent } from '../../util/analytics/analytics.types';

// Re-export all types from new locations so team-owned consumers keep working.
export type {
  DataDeleteDate,
  DataDeleteRegulationId,
  IDeleteRegulationResponse,
  IDeleteRegulationStatus,
  IDeleteRegulationStatusResponse,
} from '../../util/analytics/analyticsDataDeletion.types';
export {
  DataDeleteResponseStatus,
  DataDeleteStatus,
} from '../../util/analytics/analyticsDataDeletion.types';
export type {
  IMetaMetricsEvent,
  ITrackingEvent,
  JsonMap,
  JsonValue,
} from '../../util/analytics/analytics.types';
export {
  isTrackingEvent,
  MonetizedPrimitive,
  MetaMetricsRequestedThrough,
} from '../../util/analytics/analytics.types';

/**
 * Segment client restricted to the interface used by MetaMetrics
 */
export type ISegmentClient = Pick<
  PublicInterface<SegmentClient>,
  'track' | 'identify' | 'group' | 'screen' | 'flush' | 'reset' | 'add'
>;

/**
 * MetaMetrics core interface
 */
export interface IMetaMetrics {
  /**
   * Get current MetaMetrics state
   */
  isEnabled(): boolean;
  /**
   * Enable or disable data tracking
   * @param enable
   */
  enable(enable?: boolean): Promise<void>;
  /**
   * add traits to an user
   * @param userTraits
   */
  addTraitsToUser(userTraits: UserTraits): Promise<void>;
  /**
   * add an user to a specific group
   * @param groupId
   * @param groupTraits
   */
  group(groupId: string, groupTraits?: GroupTraits): void;
  /**
   * Track an event
   *
   * @param event - Analytics event built with {@link MetricsEventBuilder}
   * @param saveDataRecording - param to skip saving the data recording flag (optional)
   */
  trackEvent(event: ITrackingEvent, saveDataRecording?: boolean): void;
  /**
   * clear the internal state of the library for the current user and group.
   */
  reset(): Promise<void>;
  /**
   * flush the queue of events
   * triggers the upload of the events
   */
  flush(): Promise<void>;

  getMetaMetricsId(): Promise<string>;
}
