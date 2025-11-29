import type {
  AnalyticsEventProperties,
  AnalyticsTrackingEvent,
} from '@metamask/analytics-controller';

/**
 * Builder interface for creating analytics events
 */
interface AnalyticsEventBuilderInterface {
  /**
   * Add regular properties (non-sensitive) to the event
   * @param properties - Properties to add to the event
   */
  addProperties: (
    properties: AnalyticsEventProperties,
  ) => AnalyticsEventBuilderInterface;

  /**
   * Add sensitive properties (will be anonymized) to the event
   * @param properties - Sensitive properties to add to the event
   */
  addSensitiveProperties: (
    properties: AnalyticsEventProperties,
  ) => AnalyticsEventBuilderInterface;

  /**
   * Remove one or more non-sensitive properties from the event
   * @param propNames - Property names to remove from the event
   */
  removeProperties: (propNames: string[]) => AnalyticsEventBuilderInterface;

  /**
   * Remove one or more sensitive properties from the event
   * @param propNames - Property names to remove from the event
   */
  removeSensitiveProperties: (
    propNames: string[],
  ) => AnalyticsEventBuilderInterface;

  /**
   * Set the saveDataRecording flag
   * @param saveDataRecording - Whether to save data recording (default is false)
   */
  setSaveDataRecording: (
    saveDataRecording: boolean,
  ) => AnalyticsEventBuilderInterface;

  /**
   * Build the event
   * @returns The constructed AnalyticsTrackingEvent
   */
  build: () => AnalyticsTrackingEvent;
}

/**
 * Create an analytics tracking event object
 *
 * @param name - Event name
 * @returns AnalyticsTrackingEvent
 */
const createAnalyticsEvent = (name: string): AnalyticsTrackingEvent => ({
  name,
  properties: {},
  sensitiveProperties: {},
  saveDataRecording: false,
  get hasProperties(): boolean {
    return (
      Object.keys(this.properties).length > 0 ||
      Object.keys(this.sensitiveProperties).length > 0
    );
  },
});

/**
 * Helper function to remove properties from a map
 *
 * @param map - Properties map
 * @param keys - Keys to remove
 */
const removePropertiesFromMap = (
  map: AnalyticsEventProperties,
  keys: string[],
): void => {
  keys.forEach((key) => {
    delete map[key];
  });
};

/**
 * AnalyticsEventBuilder
 *
 * Functional builder for creating analytics events compatible with the new AnalyticsController.
 * Provides a fluent API for constructing events with properties and sensitive data.
 *
 * @example
 * import { analytics, AnalyticsEventBuilder } from './core/Analytics';
 *
 * // Simple event
 * analytics.trackEvent(
 *   AnalyticsEventBuilder.createEventBuilder('button_clicked').build()
 * );
 *
 * // Event with properties
 * analytics.trackEvent(
 *   AnalyticsEventBuilder.createEventBuilder('wallet_opened')
 *     .addProperties({ screen: 'home', network: 'mainnet' })
 *     .build()
 * );
 *
 * // Event with sensitive properties
 * analytics.trackEvent(
 *   AnalyticsEventBuilder.createEventBuilder('transaction_sent')
 *     .addProperties({ network: 'mainnet' })
 *     .addSensitiveProperties({ address: '0x123...', amount: '1.5' })
 *     .setSaveDataRecording(false)
 *     .build()
 * );
 */
const createEventBuilder = (
  eventOrName: AnalyticsTrackingEvent | string,
): AnalyticsEventBuilderInterface => {
  // Initialize the event object
  const event: AnalyticsTrackingEvent =
    typeof eventOrName === 'string'
      ? createAnalyticsEvent(eventOrName)
      : { ...eventOrName };

  // Return the builder interface
  const builder: AnalyticsEventBuilderInterface = {
    addProperties: (properties: AnalyticsEventProperties) => {
      event.properties = {
        ...event.properties,
        ...properties,
      };
      return builder;
    },

    addSensitiveProperties: (properties: AnalyticsEventProperties) => {
      event.sensitiveProperties = {
        ...event.sensitiveProperties,
        ...properties,
      };
      return builder;
    },

    removeProperties: (propNames: string[]) => {
      removePropertiesFromMap(event.properties, propNames);
      return builder;
    },

    removeSensitiveProperties: (propNames: string[]) => {
      removePropertiesFromMap(event.sensitiveProperties, propNames);
      return builder;
    },

    setSaveDataRecording: (saveDataRecording: boolean) => {
      event.saveDataRecording = saveDataRecording;
      return builder;
    },

    build: () => event,
  };

  return builder;
};

/**
 * AnalyticsEventBuilder namespace for backward compatibility
 */
export const AnalyticsEventBuilder = {
  createEventBuilder,
};
