import {
  IMetaMetricsEvent,
  ITrackingEvent,
  JsonMap,
  isTrackingEvent,
} from './MetaMetrics.types';

/**
 * the event tracking object to be produced by MetricsEventBuilder
 */
class TrackingEvent implements ITrackingEvent {
  readonly name: string;
  properties: JsonMap;
  sensitiveProperties: JsonMap;
  saveDataRecording: boolean;

  constructor(event: IMetaMetricsEvent) {
    this.name = event.category;
    this.properties = event.properties || {};
    this.sensitiveProperties = {};
    this.saveDataRecording = true;
  }

  get isAnonymous(): boolean {
    return !!(
      this.sensitiveProperties && Object.keys(this.sensitiveProperties).length
    );
  }

  get hasProperties(): boolean {
    return !!(
      (this.properties && Object.keys(this.properties).length) ||
      (this.sensitiveProperties &&
        Object.keys(this.sensitiveProperties).length)
    );
  }
}

/**
 * MetricsEventBuilder
 *
 * This class is used to build events for tracking
 * It allows to add properties and sensitive properties to the event
 * and to track the event
 * @example
 * import { useMetrics } from '../../../components/hooks/useMetrics';
 *
 * const { trackEvent, createEventBuilder } = useMetrics();
 *
 * trackEvent(createEventBuilder(MetaMetricsEvents.MY_EVENT)
 *  .addProperties({ normalProp: 'value' })
 *  .addSensitiveProperties({ sensitiveProp: 'value' })
 *  .build());
 */
class MetricsEventBuilder {
  readonly #trackingEvent: ITrackingEvent;

  protected constructor(event: IMetaMetricsEvent | ITrackingEvent) {
    if (isTrackingEvent(event)) {
      // Be careful that in case the event is already a ITrackingEvent
      // we don't want to create a new one so this passes the reference.
      // Changes applied to the source event will be reflected in the new event.
      // If at any point you need to clone the ITrackingEvent, it will require to
      // create a new ITrackingEvent object by copying the values.
      this.#trackingEvent = event;
      return;
    }

    this.#trackingEvent = new TrackingEvent(event);
  }

  /**
   * Create a new event builder
   * @param event the event for the builder to build
   */
  static createEventBuilder(event: IMetaMetricsEvent | ITrackingEvent) {
    return new MetricsEventBuilder(event);
  }

  #getFilteredLegacyProperties = (properties: JsonMap) => {
    const filteredProps: JsonMap = {};
    const anonymousProps: JsonMap = {};

    for (const [key, value] of Object.entries(properties)) {
      if (
        value !== null && 
        typeof value === 'object' && 
        'anonymous' in value &&
        value.anonymous === true
      ) {
        anonymousProps[key] = value.value;
      } else {
        filteredProps[key] = value;
      }
    }

    return [filteredProps, anonymousProps];
  };

  /**
   * Add regular properties (non-anonymous) to the event
   * @param properties a map of properties to add to the event
   */
  addProperties(properties: JsonMap) {

    const [filteredProps, anonymousProps] = this.#getFilteredLegacyProperties(properties);

    this.#trackingEvent.properties = {
      ...this.#trackingEvent.properties,
      ...filteredProps,
    };

    if (Object.keys(anonymousProps).length > 0) {
      this.addSensitiveProperties(anonymousProps);
    }

    return this;
  }

  /**
   * Add sensitive properties (anonymous) to the event
   * @param properties a map of properties to add to the event
   */
  addSensitiveProperties(properties: JsonMap) {
    this.#trackingEvent.sensitiveProperties = {
      ...this.#trackingEvent.sensitiveProperties,
      ...properties,
    };
    return this;
  }

  #removeProperties = (map: JsonMap, keys: string[]) => {
    for (const key of keys) {
      delete map[key];
    }
  };

  /**
   * Remove one or more non-anonymous properties from the event
   * @param propNames an array of property names to remove from the event
   */
  removeProperties(propNames: string[]) {
    this.#removeProperties(this.#trackingEvent.properties, propNames);
    return this;
  }

  /**
   * Remove one or more non-anonymous properties from the event
   * @param propNames an array of property names to remove from the event
   */
  removeSensitiveProperties(propNames: string[]) {
    this.#removeProperties(this.#trackingEvent.sensitiveProperties, propNames);
    return this;
  }

  /**
   * Set the saveDataRecording flag
   * @param saveDataRecording the value to set the flag to, default is true
   */
  setSaveDataRecording(saveDataRecording: boolean) {
    this.#trackingEvent.saveDataRecording = saveDataRecording;
    return this;
  }

  /**
   * Build the event
   */
  build(): ITrackingEvent {
    return this.#trackingEvent;
  }
}

export { MetricsEventBuilder };
