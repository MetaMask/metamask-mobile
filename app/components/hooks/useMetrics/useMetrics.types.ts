import type { UserTraits } from '@segment/analytics-react-native';
import {
  CombinedProperties,
  DataDeleteDate,
  IDeleteRegulationResponse,
  IDeleteRegulationStatus,
  IMetaMetricsEvent,
} from '../../../core/Analytics/MetaMetrics.types';
import {
  MetricsEventBuilder,
  ITrackingEvent,
} from '../../../core/Analytics/MetricsEventBuilder';

export const SourceType = {
  SDK: 'sdk',
  WALLET_CONNECT: 'walletconnect',
  IN_APP_BROWSER: 'in-app browser',
  PERMISSION_SYSTEM: 'permission system',
  DAPP_DEEPLINK_URL: 'dapp-deeplink-url',
};

export interface IUseMetricsHook {
  isEnabled(): boolean;
  enable(enable?: boolean): Promise<void>;
  addTraitsToUser(userTraits: UserTraits): Promise<void>;

  /**
   * @deprecated use {@link trackEvent(ITrackingEvent, boolean)}
   */
  trackEvent(
    event: IMetaMetricsEvent,
    properties?: CombinedProperties,
    saveDataRecording?: boolean,
  ): void;
  /**
   * track an event
   * @param event - Analytics event build with {@link MetricsEventBuilder}
   * @param saveDataRecording - param to skip saving the data recording flag (optional)
   */
  trackEvent(
    // New signature
    event: ITrackingEvent,
    saveDataRecording?: boolean,
  ): void;
  createDataDeletionTask(): Promise<IDeleteRegulationResponse>;
  checkDataDeleteStatus(): Promise<IDeleteRegulationStatus>;
  getDeleteRegulationCreationDate(): DataDeleteDate;
  getDeleteRegulationId(): string | undefined;
  isDataRecorded(): boolean;
  getMetaMetricsId(): Promise<string | undefined>;
  createEventBuilder(event: IMetaMetricsEvent): MetricsEventBuilder;
}
