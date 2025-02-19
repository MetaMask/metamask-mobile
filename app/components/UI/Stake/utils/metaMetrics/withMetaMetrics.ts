import {
  IMetaMetricsEvent,
  JsonMap,
} from '../../../../../core/Analytics/MetaMetrics.types';
import { MetricsEventBuilder } from '../../../../../core/Analytics/MetricsEventBuilder';
import { MetaMetrics } from '../../../../../core/Analytics';

interface WithMetaMetricsEvent {
  event: IMetaMetricsEvent;
  properties?: JsonMap;
}

const createEventBuilder = MetricsEventBuilder.createEventBuilder;

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
        builtEvents.forEach((event) =>
          MetaMetrics.getInstance().trackEvent(event),
        );
        return res;
      }) as Promise<ReturnType<T>>;
    }

    builtEvents.forEach((event) => MetaMetrics.getInstance().trackEvent(event));

    return result as ReturnType<T>;
  };
};
