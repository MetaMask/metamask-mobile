import { useCallback } from 'react';
import { InteractionManager } from 'react-native';
import type { JsonMap } from '@segment/analytics-react-native';
import { MetaMetrics, IMetaMetricsEvent } from '../../core/Analytics';

const useMetaMetrics = () => {
  const trackEventHook = useCallback(
    ({
      event,
      params = {},
    }: {
      event: IMetaMetricsEvent;
      params?: JsonMap;
    }) => {
      InteractionManager.runAfterInteractions(() => {
        const { name, anonymous } = event;
        if (anonymous) {
          MetaMetrics.trackEvent(name, anonymous, {});
          MetaMetrics.trackEvent(name, anonymous, params);
        } else {
          MetaMetrics.trackEvent(name, false, params);
        }
      });
    },
    [],
  );

  return trackEventHook;
};

export default useMetaMetrics;
