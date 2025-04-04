import {MetricsEventBuilder} from './MetricsEventBuilder';
import { IMetaMetricsEvent, JsonMap } from './MetaMetrics.types';

describe('MetricsEventBuilder', () => {
  const mockLegacyEvent: IMetaMetricsEvent = {
    category: 'legacyCategory',
    properties: { name: 'legacyEvent', action: 'legacyAction' },
  };

  const mockEvent: IMetaMetricsEvent = { category: 'name' };

  it('creates a MetricsEventBuilder with legacy event', () => {
    const event =
      MetricsEventBuilder.createEventBuilder(mockLegacyEvent).build();

    expect(event.name).toBe(mockLegacyEvent.category);
    expect(event.properties).toEqual({
      name: 'legacyEvent',
      action: 'legacyAction',
    });
    expect(event.sensitiveProperties).toEqual({});
    expect(event.saveDataRecording).toBe(true); // default true for legacy events
  });

  it('creates a tracking event from new ITrackingEvent type', () => {
    const event = MetricsEventBuilder.createEventBuilder(mockEvent)
      .addProperties({ trackingProp: 'trackingValue' })
      .addSensitiveProperties({ sensitiveProp: 'sensitiveValue' })
      .setSaveDataRecording(false)
      .build();

    expect(event.name).toBe(mockEvent.category);
    expect(event.properties).toEqual({ trackingProp: 'trackingValue' });
    expect(event.sensitiveProperties).toEqual({
      sensitiveProp: 'sensitiveValue',
    });
    expect(event.saveDataRecording).toBe(false);

    const rebuiltEvent = MetricsEventBuilder.createEventBuilder(event).build();

    expect(rebuiltEvent.name).toBe(event.name);
    expect(rebuiltEvent.properties).toEqual(event.properties);
    expect(rebuiltEvent.sensitiveProperties).toEqual(event.sensitiveProperties);
    expect(rebuiltEvent.saveDataRecording).toBe(event.saveDataRecording);
  });

  /**
   * From here, all tests are run twice to ensure that the builder is working as expected
   * - once with a IMetaMetricsEvent
   * - once with a ITrackingEvent (new event type) created from the IMetaMetricsEvent
   */

  it('adds properties', () => {
    const newProps: JsonMap = { newProp: 'newValue' };

    const event = MetricsEventBuilder.createEventBuilder(mockEvent)
      .addProperties(newProps)
      .build();
    expect(event.properties).toEqual(newProps);

    const rebuiltEvent = MetricsEventBuilder.createEventBuilder(event)
      .addProperties(newProps)
      .build();
    expect(rebuiltEvent.properties).toEqual(newProps);
  });

  it('adds sensitive properties', () => {
    const newSensitiveProps: JsonMap = {
      sensitiveNewProp: 'sensitiveNewValue',
    };

    const event = MetricsEventBuilder.createEventBuilder(mockLegacyEvent)
      .addSensitiveProperties(newSensitiveProps)
      .build();
    expect(event.sensitiveProperties).toEqual(newSensitiveProps);

    const rebuiltEvent = MetricsEventBuilder.createEventBuilder(event)
      .addSensitiveProperties(newSensitiveProps)
      .build();
    expect(rebuiltEvent.sensitiveProperties).toEqual(newSensitiveProps);
  });

  it('compares events', () => {
    const newProps: JsonMap = {
      newProp: 'newValue',
    };

    const event = MetricsEventBuilder.createEventBuilder(mockLegacyEvent)
        .addSensitiveProperties(newProps)
        .build();

    const similarEvent = MetricsEventBuilder.createEventBuilder(mockLegacyEvent)
        .addSensitiveProperties(newProps)
        .build();
    expect(similarEvent).toEqual(event);

    const differentEvent = MetricsEventBuilder.createEventBuilder(mockLegacyEvent)
        .addProperties(newProps)
        .build();
    expect(differentEvent).not.toEqual(event);
  });

  it('removes properties', () => {
    const event = MetricsEventBuilder.createEventBuilder(mockEvent)
      .addProperties({ newProp: 'newValue' })
      .removeProperties(['newProp'])
      .build();
    expect(event.properties).toEqual({});

    const rebuiltEvent = MetricsEventBuilder.createEventBuilder(event)
      .addProperties({ newProp: 'newValue' })
      .removeProperties(['newProp'])
      .build();
    expect(rebuiltEvent.properties).toEqual({});
  });

  it('removes sensitive properties', () => {
    const event = MetricsEventBuilder.createEventBuilder(mockEvent)
      .addSensitiveProperties({ sensitiveNewProp: 'sensitiveNewValue' })
      .removeSensitiveProperties(['sensitiveNewProp'])
      .build();
    expect(event.sensitiveProperties).toEqual({});

    const rebuiltEvent = MetricsEventBuilder.createEventBuilder(event)
      .addSensitiveProperties({ sensitiveNewProp: 'sensitiveNewValue' })
      .removeSensitiveProperties(['sensitiveNewProp'])
      .build();
    expect(rebuiltEvent.sensitiveProperties).toEqual({});
  });

  it('identifies anonymous events', () => {
    const event = MetricsEventBuilder.createEventBuilder(mockEvent)
      .addSensitiveProperties({ sensitiveProp: 'value' })
      .build();
    expect(event.isAnonymous).toBe(true);

    const rebuiltEvent = MetricsEventBuilder.createEventBuilder(event)
      .addSensitiveProperties({ sensitiveProp: 'value' })
      .build();
    expect(rebuiltEvent.isAnonymous).toBe(true);
  });

  it('identifies events with properties', () => {
    const event = MetricsEventBuilder.createEventBuilder(mockEvent)
      .addProperties({ normalProp: 'value' })
      .build();
    expect(event.hasProperties).toBe(true);

    const rebuiltEvent = MetricsEventBuilder.createEventBuilder(event)
      .addProperties({ normalProp: 'value' })
      .build();
    expect(rebuiltEvent.hasProperties).toBe(true);
  });

  it('identifies events without any properties', () => {
    const event = MetricsEventBuilder.createEventBuilder(mockEvent).build();
    expect(event.hasProperties).toBe(false);

    const rebuiltEvent = MetricsEventBuilder.createEventBuilder(event).build();
    expect(rebuiltEvent.hasProperties).toBe(false);
  });

  it('identifies events with sensitive properties', () => {
    const event = MetricsEventBuilder.createEventBuilder(mockEvent)
      .addSensitiveProperties({ sensitiveProp: 'value' })
      .build();
    expect(event.hasProperties).toBe(true);

    const rebuiltEvent = MetricsEventBuilder.createEventBuilder(event)
      .addSensitiveProperties({ sensitiveProp: 'value' })
      .build();
    expect(rebuiltEvent.hasProperties).toBe(true);
  });

  it('identifies events with both properties and sensitive properties', () => {
    const event = MetricsEventBuilder.createEventBuilder(mockEvent)
      .addProperties({ normalProp: 'value' })
      .addSensitiveProperties({ sensitiveProp: 'value' })
      .build();
    expect(event.hasProperties).toBe(true);

    const rebuiltEvent = MetricsEventBuilder.createEventBuilder(event)
      .addProperties({ normalProp: 'value' })
      .addSensitiveProperties({ sensitiveProp: 'value' })
      .build();
    expect(rebuiltEvent.hasProperties).toBe(true);
  });
});
