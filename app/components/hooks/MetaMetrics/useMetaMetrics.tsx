import { useCallback } from 'react';
import type { JsonMap } from '@segment/analytics-react-native';
import MetaMetrics from '../../../core/Analytics/MetaMetrics';
import { IMetaMetricsEvent } from '../../../core/Analytics/MetaMetrics.types';

const useMetaMetrics = () => {
  const trackEventHook = useCallback(
    (event: IMetaMetricsEvent, params: JsonMap = {}) => {
      const { name, anonymous } = event;
      if (anonymous) {
        MetaMetrics.trackAnonymousEvent(name, params);
      } else {
        MetaMetrics.trackEvent(name, params);
      }
    },
    [],
  );

  return trackEventHook;
};

export default useMetaMetrics;
