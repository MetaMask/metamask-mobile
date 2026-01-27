import {
  DataDeleteDate,
  IDeleteRegulationResponse,
  IDeleteRegulationStatus,
} from '../../../core/Analytics/MetaMetrics.types';
import {
  AnalyticsEventBuilder,
  type AnalyticsTrackingEvent,
} from '../../../util/analytics/AnalyticsEventBuilder';
import type { AnalyticsUserTraits } from '@metamask/analytics-controller';

type AnalyticsEventBuilderType = ReturnType<
  typeof AnalyticsEventBuilder.createEventBuilder
>;

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
    event: string | AnalyticsTrackingEvent,
  ): AnalyticsEventBuilderType;
}
