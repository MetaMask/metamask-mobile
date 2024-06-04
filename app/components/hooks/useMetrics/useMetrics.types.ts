import type { JsonMap, UserTraits } from '@segment/analytics-react-native';
import {
  DataDeleteDate,
  IDeleteRegulationResponse,
  IDeleteRegulationStatus,
  IMetaMetricsEvent,
} from '../../../core/Analytics/MetaMetrics.types';

export enum SourceType {
  SDK = 'sdk',
  WALLET_CONNECT = 'walletconnect',
  IN_APP_BROWSER = 'in-app browser',
  PERMISSION_SYSTEM = 'permission system',
}

export interface IUseMetricsHook {
  isEnabled(): boolean;
  enable(enable?: boolean): Promise<void>;
  addTraitsToUser(userTraits: UserTraits): Promise<void>;
  trackAnonymousEvent(
    event: IMetaMetricsEvent,
    properties?: JsonMap,
    saveDataRecording?: boolean,
  ): void;
  trackEvent(
    event: IMetaMetricsEvent,
    properties?: JsonMap,
    saveDataRecording?: boolean,
  ): void;
  createDataDeletionTask(): Promise<IDeleteRegulationResponse>;
  checkDataDeleteStatus(): Promise<IDeleteRegulationStatus>;
  getDeleteRegulationCreationDate(): DataDeleteDate;
  getDeleteRegulationId(): string | undefined;
  isDataRecorded(): boolean;
  getMetaMetricsId(): Promise<string | undefined>;
}
