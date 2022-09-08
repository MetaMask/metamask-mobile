import { useCallback } from 'react';
import type { JsonMap } from '@segment/analytics-react-native';
import { MetaMetrics, IMetaMetricsEvent } from '../../../core/Analytics';

const useMetaMetrics = () => {
  const trackEventHook = useCallback(
    (event: IMetaMetricsEvent, params: JsonMap = {}) => {
      const { name, anonymous } = event;
      MetaMetrics.trackEvent(name, anonymous, params);
    },
    [],
  );

  return trackEventHook;
};

export default useMetaMetrics;
