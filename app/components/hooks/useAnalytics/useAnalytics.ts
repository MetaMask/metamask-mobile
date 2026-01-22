import { useMemo } from 'react';
import type { IUseAnalyticsHook } from './useAnalytics.types';
import { AnalyticsEventBuilder } from '../../../util/analytics/AnalyticsEventBuilder';
import { analytics } from '../../../util/analytics/analytics';
import { MetaMetrics } from '../../../core/Analytics';
import type { ITrackingEvent } from '../../../core/Analytics/MetaMetrics.types';
import type { AnalyticsTrackingEvent } from '../../../util/analytics/AnalyticsEventBuilder';
import type { UserTraits } from '@segment/analytics-react-native';
import type { AnalyticsUserTraits } from '@metamask/analytics-controller';

/**
 * Provides analytics utilities backed by the analytics helper to keep the
 * existing hook API while migrating off MetaMetrics internals.
 */
const useAnalytics = (): IUseAnalyticsHook =>
  useMemo(
    () => ({
      trackEvent: (
        event: ITrackingEvent | AnalyticsTrackingEvent,
        saveDataRecording?: boolean,
      ): void => {
        const analyticsEvent = AnalyticsEventBuilder.createEventBuilder(event)
          .setSaveDataRecording(saveDataRecording ?? true)
          .build();
        analytics.trackEvent(analyticsEvent);

        // Preserve data deletion behavior until MetaMetrics is fully removed.
        MetaMetrics.getInstance().updateDataRecordingFlag(
          analyticsEvent.saveDataRecording,
        );
      },
      enable: async (enable?: boolean): Promise<void> => {
        if (enable === false) {
          await analytics.optOut();
        } else {
          await analytics.optIn();
        }
      },
      addTraitsToUser: async (userTraits: UserTraits): Promise<void> => {
        analytics.identify(userTraits as unknown as AnalyticsUserTraits);
      },
      createDataDeletionTask: MetaMetrics.getInstance().createDataDeletionTask,
      checkDataDeleteStatus: MetaMetrics.getInstance().checkDataDeleteStatus,
      getDeleteRegulationCreationDate:
        MetaMetrics.getInstance().getDeleteRegulationCreationDate,
      getDeleteRegulationId: MetaMetrics.getInstance().getDeleteRegulationId,
      isDataRecorded: MetaMetrics.getInstance().isDataRecorded,
      isEnabled: (): boolean => analytics.isEnabled(),
      getMetaMetricsId: async (): Promise<string | undefined> => {
        const id = await analytics.getAnalyticsId();
        return id;
      },
      createEventBuilder: AnalyticsEventBuilder.createEventBuilder,
    }),
    [],
  );

export default useAnalytics;
