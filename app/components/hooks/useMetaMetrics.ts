import { useCallback } from 'react';
import { InteractionManager } from 'react-native';
import { MetaMetrics, IMetaMetricsEvent } from '../../core/Analytics';

const useMetaMetrics = () => {
  const trackEventHook = useCallback(
    (event: IMetaMetricsEvent, params: any = {}) => {
      InteractionManager.runAfterInteractions(() => {
        const { name, anonymous } = event;
        if (anonymous) {
          MetaMetrics.trackEvent(name, true, params);
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
