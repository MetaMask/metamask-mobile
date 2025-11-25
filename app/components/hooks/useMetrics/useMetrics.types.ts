import type { UserTraits } from '@segment/analytics-react-native';
import {
  DataDeleteDate,
  IDeleteRegulationResponse,
  IDeleteRegulationStatus,
  IMetaMetricsEvent,
  ITrackingEvent,
} from '../../../core/Analytics/MetaMetrics.types';
import { MetricsEventBuilder } from '../../../core/Analytics/MetricsEventBuilder';

export const SourceType = {
  SDK: 'sdk',
  SDK_CONNECT_V2: 'sdk_connect_v2',
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
   * track an event
   * @param event - Analytics event build with {@link MetricsEventBuilder}
   * @param saveDataRecording - param to skip saving the data recording flag (optional)
   */
  trackEvent(event: ITrackingEvent, saveDataRecording?: boolean): void;
  createDataDeletionTask(): Promise<IDeleteRegulationResponse>;
  checkDataDeleteStatus(): Promise<IDeleteRegulationStatus>;
  getDeleteRegulationCreationDate(): DataDeleteDate;
  getDeleteRegulationId(): string | undefined;
  isDataRecorded(): boolean;
  getMetaMetricsId(): Promise<string | undefined>;
  createEventBuilder(event: IMetaMetricsEvent): MetricsEventBuilder;
  // Temporary workaround to avoid breaking all the tests that mock the useMetrics hook method
}
