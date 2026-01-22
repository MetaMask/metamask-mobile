import type { UserTraits } from '@segment/analytics-react-native';
import {
  DataDeleteDate,
  IDeleteRegulationResponse,
  IDeleteRegulationStatus,
  IMetaMetricsEvent,
  ITrackingEvent,
} from '../../../core/Analytics/MetaMetrics.types';
import {
  AnalyticsEventBuilder,
  type AnalyticsTrackingEvent,
} from '../../../util/analytics/AnalyticsEventBuilder';

type AnalyticsEventBuilderType = ReturnType<
  typeof AnalyticsEventBuilder.createEventBuilder
>;

export interface IUseAnalyticsHook {
  isEnabled(): boolean;
  enable(enable?: boolean): Promise<void>;
  addTraitsToUser(userTraits: UserTraits): Promise<void>;
  trackEvent(
    event: ITrackingEvent | AnalyticsTrackingEvent,
    saveDataRecording?: boolean,
  ): void;
  createDataDeletionTask(): Promise<IDeleteRegulationResponse>;
  checkDataDeleteStatus(): Promise<IDeleteRegulationStatus>;
  getDeleteRegulationCreationDate(): DataDeleteDate;
  getDeleteRegulationId(): string | undefined;
  isDataRecorded(): boolean;
  getMetaMetricsId(): Promise<string | undefined>;
  createEventBuilder(
    event: IMetaMetricsEvent | ITrackingEvent,
  ): AnalyticsEventBuilderType;
}
