import { useCallback } from 'react';
import type { JsonMap } from '@segment/analytics-react-native';
import { MetaMetrics, IMetaMetricsEvent } from '../../../core/Analytics';

const useMetaMetrics = () => {
  const trackEventHook = useCallback(
    (event: IMetaMetricsEvent, params: JsonMap = {}) => {
      const { name, anonymous } = event;
      if (anonymous) {
        MetaMetrics.trackEvent(name, true, params);
      } else {
        MetaMetrics.trackEvent(name, false, params);
      }
    },
    [],
  );

  return trackEventHook;
};

export default useMetaMetrics;
