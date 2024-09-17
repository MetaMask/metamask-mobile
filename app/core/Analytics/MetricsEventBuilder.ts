import { IMetaMetricsEvent } from './MetaMetrics.types';
import { InteractionManager } from 'react-native';
import { MetaMetrics } from './index';

type JsonValue =
  | boolean
  | number
  | string
  | null
  | JsonValue[]
  | JsonMap
  | undefined;

interface JsonMap {
  [key: string]: JsonValue;

  [index: number]: JsonValue;
}

interface ITrackingEvent {
  event: IMetaMetricsEvent;
  properties: JsonMap;
  sensitiveProperties: JsonMap;
  saveDataRecording: boolean;
  track(): void;
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
 * const { createEventBuilder } = useMetrics();
 *
 * createEventBuilder(MetaMetricsEvents.MY_EVENT)
 *  .addProperties({ normalProp: 'value' })
 *  .addSensitiveProperties({ sensitiveProp: 'value' })
 *  .build().track();
 */
class MetricsEventBuilder {
  private readonly event: IMetaMetricsEvent;
  private properties: JsonMap;
  private sensitiveProperties: JsonMap;
  private saveDataRecording: boolean;

  constructor(event: IMetaMetricsEvent) {
    this.event = event;
    this.properties = {};
    this.sensitiveProperties = {};
    this.saveDataRecording = true;
  }

  /**
   * Create a new event builder
   * @param event the event for the builder to build
   */
  static createEventBuilder(event: IMetaMetricsEvent) {
    return new MetricsEventBuilder(event);
  }

  /**
   * Add regular properties (non-anonymous) to the event
   * @param properties a map of properties to add to the event
   */
  addProperties(properties: JsonMap) {
    this.properties = Object.assign({}, this.properties, properties);
    return this;
  }

  /**
   * Add sensitive properties (anonymous) to the event
   * @param properties a map of properties to add to the event
   */
  addSensitiveProperties(properties: JsonMap) {
    this.sensitiveProperties = Object.assign(
      {},
      this.sensitiveProperties,
      properties,
    );
    return this;
  }

  /**
   * Set the saveDataRecording flag
   * @param saveDataRecording the value to set the flag to, default is true
   */
  setSaveDataRecording(saveDataRecording: boolean) {
    this.saveDataRecording = saveDataRecording;
    return this;
  }

  /**
   * Build the event
   */
  build(): ITrackingEvent {
    return {
      event: this.event,
      properties: this.properties,
      sensitiveProperties: this.sensitiveProperties,
      saveDataRecording: this.saveDataRecording,
      track() {
        InteractionManager.runAfterInteractions(async () => {
          MetaMetrics.getInstance().trackEvent(this.event, {
            ...this.properties,
            ...this.sensitiveProperties,
          });
        });
      },
    };
  }
}

export default MetricsEventBuilder;
