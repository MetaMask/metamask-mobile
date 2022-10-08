import { useCallback } from 'react';
import type { JsonMap } from '@segment/analytics-react-native';
import { MetaMetrics, IMetaMetricsEvent } from '../../../core/Analytics';

const useMetaMetrics = () => {
  const trackEventHook = useCallback(
    (event: IMetaMetricsEvent, anonymous: boolean, params: JsonMap = {}) => {
      const { name, properties } = event;
      if (anonymous) {
        MetaMetrics.trackAnonymousEvent(name, { ...properties, ...params });
      } else {
        MetaMetrics.trackEvent(name, { ...properties, ...params });
      }
    },
    [],
  );

  return trackEventHook;
};

export default useMetaMetrics;
