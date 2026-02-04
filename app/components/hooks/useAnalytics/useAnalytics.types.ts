import {
  DataDeleteDate,
  IDeleteRegulationResponse,
  IDeleteRegulationStatus,
  type IMetaMetricsEvent,
  type ITrackingEvent,
} from '../../../core/Analytics/MetaMetrics.types';
import {
  AnalyticsEventBuilder,
  type AnalyticsTrackingEvent,
} from '../../../util/analytics/AnalyticsEventBuilder';
import type { AnalyticsUserTraits } from '@metamask/analytics-controller';

type AnalyticsEventBuilderType = ReturnType<
  typeof AnalyticsEventBuilder.createEventBuilder
>;

/**
 * Source type constants for analytics tracking
 */
export const SourceType = {
  SDK: 'sdk',
  SDK_CONNECT_V2: 'sdk_connect_v2',
  WALLET_CONNECT: 'walletconnect',
  IN_APP_BROWSER: 'in-app browser',
  PERMISSION_SYSTEM: 'permission system',
  DAPP_DEEPLINK_URL: 'dapp-deeplink-url',
} as const;

export interface UseAnalyticsHook {
  isEnabled(): boolean;
  enable(enable?: boolean): Promise<void>;
  addTraitsToUser(userTraits: AnalyticsUserTraits): Promise<void>;
  trackEvent(event: AnalyticsTrackingEvent, saveDataRecording?: boolean): void;
  createDataDeletionTask(): Promise<IDeleteRegulationResponse>;
  checkDataDeleteStatus(): Promise<IDeleteRegulationStatus>;
  getDeleteRegulationCreationDate(): DataDeleteDate;
  getDeleteRegulationId(): string | undefined;
  isDataRecorded(): boolean;
  getAnalyticsId(): Promise<string | undefined>;
  createEventBuilder(
    event: string | IMetaMetricsEvent | ITrackingEvent | AnalyticsTrackingEvent,
  ): AnalyticsEventBuilderType;
}
