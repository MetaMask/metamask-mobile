import { MetricsEventBuilder } from './MetricsEventBuilder';
import { IMetaMetricsEvent, JsonMap } from './MetaMetrics.types';

describe('MetricsEventBuilder', () => {
  const mockLegacyEvent: IMetaMetricsEvent = {
    category: 'legacyCategory',
    properties: { name: 'legacyEvent', action: 'legacyAction' },
  };

  it('creates a MetricsEventBuilder with legacy event', () => {
    const event =
      MetricsEventBuilder.createEventBuilder(mockLegacyEvent).build();

    expect(event.name).toBe(mockLegacyEvent.category);
    expect(event.properties).toEqual({});
    expect(event.sensitiveProperties).toEqual({});
    expect(event.saveDataRecording).toBe(true); // default true for legacy events
  });

  it('creates a tracking event from new ITrackingEvent type', () => {
    const trackingEvent = MetricsEventBuilder.createEventBuilder(
      mockLegacyEvent,
    )
      .addProperties({ trackingProp: 'trackingValue' })
      .addSensitiveProperties({ sensitiveProp: 'sensitiveValue' })
      .setSaveDataRecording(false)
      .build();

    expect(trackingEvent.name).toBe(mockLegacyEvent.category);
    expect(trackingEvent.properties).toEqual({ trackingProp: 'trackingValue' });
    expect(trackingEvent.sensitiveProperties).toEqual({
      sensitiveProp: 'sensitiveValue',
    });
    expect(trackingEvent.saveDataRecording).toBe(false);

    const rebuiltEvent =
      MetricsEventBuilder.createEventBuilder(trackingEvent).build();

    expect(rebuiltEvent.name).toBe(trackingEvent.name);
    expect(rebuiltEvent.properties).toEqual(trackingEvent.properties);
    expect(rebuiltEvent.sensitiveProperties).toEqual(
      trackingEvent.sensitiveProperties,
    );
    expect(rebuiltEvent.saveDataRecording).toBe(
      trackingEvent.saveDataRecording,
    );
  });

  it('adds properties', () => {
    const newProps: JsonMap = { newProp: 'newValue' };

    const legacyEvent = MetricsEventBuilder.createEventBuilder(mockLegacyEvent)
      .addProperties(newProps)
      .build();
    expect(legacyEvent.properties).toEqual(newProps);

    const trackingEvent = MetricsEventBuilder.createEventBuilder(
      mockLegacyEvent,
    )
      .addProperties(newProps)
      .build();
    expect(trackingEvent.properties).toEqual(newProps);
  });

  it('adds sensitive properties', () => {
    const newSensitiveProps: JsonMap = {
      sensitiveNewProp: 'sensitiveNewValue',
    };

    const legacyEvent = MetricsEventBuilder.createEventBuilder(mockLegacyEvent)
      .addSensitiveProperties(newSensitiveProps)
      .build();
    expect(legacyEvent.sensitiveProperties).toEqual(newSensitiveProps);

    const trackingEvent = MetricsEventBuilder.createEventBuilder(
      mockLegacyEvent,
    )
      .addSensitiveProperties(newSensitiveProps)
      .build();
    expect(trackingEvent.sensitiveProperties).toEqual(newSensitiveProps);
  });

  it('removes properties', () => {
    const legacyEvent = MetricsEventBuilder.createEventBuilder(mockLegacyEvent)
      .addProperties({ newProp: 'newValue' })
      .removeProperties(['newProp'])
      .build();
    expect(legacyEvent.properties).toEqual({});

    const trackingEvent = MetricsEventBuilder.createEventBuilder(
      mockLegacyEvent,
    )
      .addProperties({ newProp: 'newValue' })
      .removeProperties(['newProp'])
      .build();
    expect(trackingEvent.properties).toEqual({});
  });

  it('removes sensitive properties', () => {
    const legacyEvent = MetricsEventBuilder.createEventBuilder(mockLegacyEvent)
      .addSensitiveProperties({ sensitiveNewProp: 'sensitiveNewValue' })
      .removeSensitiveProperties(['sensitiveNewProp'])
      .build();
    expect(legacyEvent.sensitiveProperties).toEqual({});

    const trackingEvent = MetricsEventBuilder.createEventBuilder(
      mockLegacyEvent,
    )
      .addSensitiveProperties({ sensitiveNewProp: 'sensitiveNewValue' })
      .removeSensitiveProperties(['sensitiveNewProp'])
      .build();
    expect(trackingEvent.sensitiveProperties).toEqual({});
  });

  it('identifies anonymous events', () => {
    const legacyEvent = MetricsEventBuilder.createEventBuilder(mockLegacyEvent)
      .addSensitiveProperties({ sensitiveProp: 'value' })
      .build();
    expect(legacyEvent.isAnonymous).toBe(true);

    const trackingEvent = MetricsEventBuilder.createEventBuilder(
      mockLegacyEvent,
    )
      .addSensitiveProperties({ sensitiveProp: 'value' })
      .build();
    expect(trackingEvent.isAnonymous).toBe(true);
  });

  it('identifies events with properties', () => {
    const legacyEvent = MetricsEventBuilder.createEventBuilder(mockLegacyEvent)
      .addProperties({ normalProp: 'value' })
      .build();
    expect(legacyEvent.hasProperties).toBe(true);

    const trackingEvent = MetricsEventBuilder.createEventBuilder(
      mockLegacyEvent,
    )
      .addProperties({ normalProp: 'value' })
      .build();
    expect(trackingEvent.hasProperties).toBe(true);
  });
});
