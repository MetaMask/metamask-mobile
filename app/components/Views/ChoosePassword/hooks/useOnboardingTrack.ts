import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { saveOnboardingEvent as saveEvent } from '../../../../actions/onboarding';
import type {
  IMetaMetricsEvent,
  ITrackingEvent,
  JsonMap,
} from '../../../../core/Analytics/MetaMetrics.types';
import trackOnboarding from '../../../../util/metrics/TrackOnboarding/trackOnboarding';
import { AnalyticsEventBuilder } from '../../../../util/analytics/AnalyticsEventBuilder';

export const useOnboardingTrack = () => {
  const dispatch = useDispatch();

  return useCallback(
    (event: IMetaMetricsEvent | ITrackingEvent, properties?: JsonMap) => {
      const eventBuilder = AnalyticsEventBuilder.createEventBuilder(event);
      if (properties) {
        eventBuilder.addProperties(properties);
      }
      const builtEvent = eventBuilder.build();
      trackOnboarding(builtEvent, (arg: ITrackingEvent) =>
        dispatch(saveEvent([arg])),
      );
    },
    [dispatch],
  );
};
