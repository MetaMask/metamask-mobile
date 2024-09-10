import type { UserTraits } from '@segment/analytics-react-native';
import {
  CombinedProperties,
  DataDeleteDate,
  IDeleteRegulationResponse,
  IDeleteRegulationStatus,
  IMetaMetricsEvent,
} from '../../../core/Analytics/MetaMetrics.types';

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
  trackEvent(
    event: IMetaMetricsEvent,
    properties?: CombinedProperties,
    saveDataRecording?: boolean,
  ): void;
  createDataDeletionTask(): Promise<IDeleteRegulationResponse>;
  checkDataDeleteStatus(): Promise<IDeleteRegulationStatus>;
  getDeleteRegulationCreationDate(): DataDeleteDate;
  getDeleteRegulationId(): string | undefined;
  isDataRecorded(): boolean;
  getMetaMetricsId(): Promise<string | undefined>;
}
