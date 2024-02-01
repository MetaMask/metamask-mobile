import type { JsonMap, UserTraits } from '@segment/analytics-react-native';
import {
  DataDeleteDate,
  IDeleteRegulationResponse,
  IDeleteRegulationStatus,
  IMetaMetricsEvent,
} from '../../../core/Analytics/MetaMetrics.types';

export interface IUseMetricsHook {
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

  trackAnonymousEvent(
    event: IMetaMetricsEvent,
    properties?: JsonMap,
    saveDataRecording?: boolean,
  ): void;
  /**
   * track an event
   * @param event - Analytics event
   * @param properties - Object containing any event relevant traits or properties (optional)
   * @param saveDataRecording - param to skip saving the data recording flag (optional)
   */
  trackEvent(
    event: IMetaMetricsEvent,
    properties?: JsonMap,
    saveDataRecording?: boolean,
  ): void;
  /**
   * delete user's data from Segment and all related
   * destinations.
   */
  createDataDeletionTask(): Promise<IDeleteRegulationResponse>;

  checkDataDeleteStatus(): Promise<IDeleteRegulationStatus>;

  getDeleteRegulationCreationDate(): DataDeleteDate;

  getDeleteRegulationId(): string | undefined;

  isDataRecorded(): boolean;

  isInitialized(): boolean;

  init(): Promise<boolean>;
}
