import { useCallback } from 'react';
import { InteractionManager } from 'react-native';
import MetaMetrics from '../../core/Analytics/MetaMetrics';
import MetaMetricsEvents from '../../core/Analytics/MetaMetrics.events';
import { IMetaMetricsEvent } from '../../core/Analytics/MetaMetrics.types';

const useMetaMetrics = () => {
  const trackEventHook = useCallback(
    ({
      event,
      params = {},
    }: {
      event: IMetaMetricsEvent;
      params?: Record<string, string>;
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
