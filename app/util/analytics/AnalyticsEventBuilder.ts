import type { AnalyticsEventProperties } from '@metamask/analytics-controller';
import type {
  IMetaMetricsEvent,
  ITrackingEvent,
} from '../../core/Analytics/MetaMetrics.types';

/**
 * Analytics tracking event structure for AnalyticsController
 * Similar to ITrackingEvent but specifically for AnalyticsController usage
 */
export interface AnalyticsTrackingEvent {
  readonly name: string;
  properties: AnalyticsEventProperties;
  sensitiveProperties: AnalyticsEventProperties;
  saveDataRecording: boolean;
  get isAnonymous(): boolean;
  get hasProperties(): boolean;
}

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
const createAnalyticsEvent = (name: string): AnalyticsTrackingEvent => {
  const event: AnalyticsTrackingEvent = {
    name,
    properties: {},
    sensitiveProperties: {},
    saveDataRecording: false,
    get isAnonymous(): boolean {
      return (
        this.sensitiveProperties &&
        Object.keys(this.sensitiveProperties).length > 0
      );
    },
    get hasProperties(): boolean {
      return (
        (this.properties && Object.keys(this.properties).length > 0) ||
        (this.sensitiveProperties &&
          Object.keys(this.sensitiveProperties).length > 0)
      );
    },
  };
  return event;
};

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
 * Extract event name from various event types
 * Handles IMetaMetricsEvent (with category), ITrackingEvent (with name), string, or AnalyticsTrackingEvent
 *
 * @param eventOrName - Event name as string, or event object (IMetaMetricsEvent, ITrackingEvent, or AnalyticsTrackingEvent)
 * @returns The event name as a string
 */
const extractEventName = (
  eventOrName:
    | string
    | IMetaMetricsEvent
    | ITrackingEvent
    | AnalyticsTrackingEvent,
): string => {
  if (typeof eventOrName === 'string') {
    return eventOrName;
  }

  // Handle IMetaMetricsEvent (has category property)
  if ('category' in eventOrName && typeof eventOrName.category === 'string') {
    return eventOrName.category;
  }

  // Handle ITrackingEvent or AnalyticsTrackingEvent (has name property)
  if ('name' in eventOrName && typeof eventOrName.name === 'string') {
    return eventOrName.name;
  }

  // Fallback: convert to string
  return String(eventOrName);
};

/**
 * Create builder interface from an existing AnalyticsTrackingEvent
 */
const createBuilderFromEvent = (
  event: AnalyticsTrackingEvent,
): AnalyticsEventBuilderInterface =>
  // Return the builder interface
  ({
    addProperties: (properties: AnalyticsEventProperties) => {
      event.properties = {
        ...event.properties,
        ...properties,
      };
      return createBuilderFromEvent(event);
    },

    addSensitiveProperties: (properties: AnalyticsEventProperties) => {
      event.sensitiveProperties = {
        ...event.sensitiveProperties,
        ...properties,
      };
      return createBuilderFromEvent(event);
    },

    removeProperties: (propNames: string[]) => {
      removePropertiesFromMap(event.properties, propNames);
      return createBuilderFromEvent(event);
    },

    removeSensitiveProperties: (propNames: string[]) => {
      removePropertiesFromMap(event.sensitiveProperties, propNames);
      return createBuilderFromEvent(event);
    },

    setSaveDataRecording: (saveDataRecording: boolean) => {
      event.saveDataRecording = saveDataRecording;
      return createBuilderFromEvent(event);
    },

    build: () => event,
  });

/**
 * AnalyticsEventBuilder
 *
 * Builder for creating analytics events compatible with AnalyticsController.
 * Provides a fluent API for constructing events with properties and sensitive data.
 *
 * Events created with this builder can be used to call AnalyticsController:trackEvent
 * via messenger. The builder handles the structure needed for proper event tracking,
 * including support for anonymous events (via sensitive properties).
 *
 * Accepts the same event types as MetricsEventBuilder for easier migration:
 * - string: Event name directly
 * - IMetaMetricsEvent: Legacy event with category property
 * - ITrackingEvent: New event type with name property
 * - AnalyticsTrackingEvent: Already built analytics event
 *
 * @example
 * import { AnalyticsEventBuilder } from '@/util/analytics/AnalyticsEventBuilder';
 *
 * // Simple event with string
 * const event = AnalyticsEventBuilder.createEventBuilder('button_clicked').build();
 *
 * // Event with IMetaMetricsEvent (legacy)
 * const event = AnalyticsEventBuilder.createEventBuilder({ category: 'wallet_opened' }).build();
 *
 * // Event with ITrackingEvent
 * const event = AnalyticsEventBuilder.createEventBuilder({ name: 'transaction_sent', ... }).build();
 *
 * // Event with properties
 * const event = AnalyticsEventBuilder.createEventBuilder('wallet_opened')
 *   .addProperties({ screen: 'home', network: 'mainnet' })
 *   .build();
 */
const createEventBuilder = (
  eventOrName:
    | string
    | IMetaMetricsEvent
    | ITrackingEvent
    | AnalyticsTrackingEvent,
): AnalyticsEventBuilderInterface => {
  // Extract event name from various event types
  const eventName = extractEventName(eventOrName);

  // If it's already an AnalyticsTrackingEvent, reuse it (preserving getters)
  if (
    typeof eventOrName === 'object' &&
    eventOrName !== null &&
    'name' in eventOrName &&
    'properties' in eventOrName &&
    'sensitiveProperties' in eventOrName &&
    'saveDataRecording' in eventOrName &&
    !('category' in eventOrName)
  ) {
    const existingEvent = eventOrName as AnalyticsTrackingEvent;
    // Create new event object with explicit property assignment
    // Note: Using explicit assignment instead of spread to ensure properties
    // are correctly copied when combined with inline getters (Hermes compatibility)
    const event: AnalyticsTrackingEvent = {
      name: eventName,
      properties: existingEvent.properties,
      sensitiveProperties: existingEvent.sensitiveProperties,
      saveDataRecording: existingEvent.saveDataRecording,
      get isAnonymous(): boolean {
        return (
          this.sensitiveProperties &&
          Object.keys(this.sensitiveProperties).length > 0
        );
      },
      get hasProperties(): boolean {
        return (
          (this.properties && Object.keys(this.properties).length > 0) ||
          (this.sensitiveProperties &&
            Object.keys(this.sensitiveProperties).length > 0)
        );
      },
    };
    return createBuilderFromEvent(event);
  }

  // Create new event from extracted name
  const event = createAnalyticsEvent(eventName);
  return createBuilderFromEvent(event);
};

/**
 * AnalyticsEventBuilder namespace
 */
export const AnalyticsEventBuilder = {
  createEventBuilder,
};
