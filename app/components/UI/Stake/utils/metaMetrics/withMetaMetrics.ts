import type {
  IMetaMetricsEvent,
  JsonMap,
} from '../../../../../core/Analytics/MetaMetrics.types';
import { AnalyticsEventBuilder } from '../../../../../util/analytics/AnalyticsEventBuilder';
import { analytics } from '../../../../../util/analytics/analytics';

export interface WithMetaMetricsEvent {
  event: IMetaMetricsEvent;
  properties?: JsonMap;
}

const createEventBuilder = AnalyticsEventBuilder.createEventBuilder;

const shouldAddProperties = (properties?: JsonMap): properties is JsonMap => {
  if (!properties) return false;
  return Object.keys(properties).length > 0;
};

const buildEvent = (e: WithMetaMetricsEvent) => {
  const eventBuilder = createEventBuilder(e.event);

  if (shouldAddProperties(e?.properties)) {
    eventBuilder.addProperties(e.properties);
  }

  return eventBuilder.build();
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const withMetaMetrics = <T extends (...args: any[]) => any>(
  func: T,
  events: WithMetaMetricsEvent | WithMetaMetricsEvent[],
) => {
  if (!Array.isArray(events)) {
    events = [events];
  }

  const builtEvents = events.map((event) => buildEvent(event));

  return (...args: Parameters<T>): ReturnType<T> | Promise<ReturnType<T>> => {
    const result = func(...args);

    if (result instanceof Promise) {
      return result.then((res) => {
        builtEvents.forEach((event) => analytics.trackEvent(event));
        return res;
      }) as Promise<ReturnType<T>>;
    }

    builtEvents.forEach((event) => analytics.trackEvent(event));

    return result as ReturnType<T>;
  };
};
