import { useCallback } from 'react';
import { InteractionManager } from 'react-native';
import MetaMetrics from '../../core/Analytics/MetaMetrics';

const useMetaMetrics = () => {
  const trackEventHook = useCallback(
    ({
      event,
      params = {},
      anonymous = false,
    }: {
      event: string;
      params?: Record<string, string>;
      anonymous?: boolean;
    }) => {
      InteractionManager.runAfterInteractions(() => {
        if (anonymous) {
          MetaMetrics.trackEvent(event, false, {});
          MetaMetrics.trackEvent(event, true, params);
        } else {
          MetaMetrics.trackEvent(event, false, params);
        }
      });
    },
    [],
  );

  return trackEventHook;
};

export default useMetaMetrics;
