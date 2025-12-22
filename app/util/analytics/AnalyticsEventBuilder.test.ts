import {
  AnalyticsEventBuilder,
  type AnalyticsTrackingEvent,
} from './AnalyticsEventBuilder';
import type {
  IMetaMetricsEvent,
  ITrackingEvent,
} from '../../core/Analytics/MetaMetrics.types';
import type { AnalyticsEventProperties } from '@metamask/analytics-controller';

describe('AnalyticsEventBuilder', () => {
  describe('createEventBuilder', () => {
    it('creates event from string event name', () => {
      const event =
        AnalyticsEventBuilder.createEventBuilder('test_event').build();

      expect(event.name).toBe('test_event');
      expect(event.properties).toEqual({});
      expect(event.sensitiveProperties).toEqual({});
      expect(event.saveDataRecording).toBe(false);
      expect(event.isAnonymous).toBe(false);
      expect(event.hasProperties).toBe(false);
    });

    it('creates event from IMetaMetricsEvent with category', () => {
      const legacyEvent: IMetaMetricsEvent = {
        category: 'legacy_category',
        properties: { name: 'legacyEvent', action: 'legacyAction' },
      };

      const event =
        AnalyticsEventBuilder.createEventBuilder(legacyEvent).build();

      expect(event.name).toBe('legacy_category');
      expect(event.properties).toEqual({});
      expect(event.sensitiveProperties).toEqual({});
      expect(event.saveDataRecording).toBe(false);
    });

    it('creates event from ITrackingEvent with name', () => {
      const trackingEvent: ITrackingEvent = {
        name: 'tracking_event',
        properties: { prop1: 'value1' },
        sensitiveProperties: { sensitiveProp: 'sensitiveValue' },
        saveDataRecording: true,
        get isAnonymous(): boolean {
          return Object.keys(this.sensitiveProperties).length > 0;
        },
        get hasProperties(): boolean {
          return (
            Object.keys(this.properties).length > 0 ||
            Object.keys(this.sensitiveProperties).length > 0
          );
        },
      };

      const event =
        AnalyticsEventBuilder.createEventBuilder(trackingEvent).build();

      expect(event.name).toBe('tracking_event');
      // ITrackingEvent matches AnalyticsTrackingEvent structure at runtime,
      // so properties are preserved via spread operator
      expect(event.properties).toEqual({ prop1: 'value1' });
      expect(event.sensitiveProperties).toEqual({
        sensitiveProp: 'sensitiveValue',
      });
      expect(event.saveDataRecording).toBe(true);
    });

    it('creates event from AnalyticsTrackingEvent', () => {
      const existingEvent: AnalyticsTrackingEvent = {
        name: 'existing_event',
        properties: { existingProp: 'value' },
        sensitiveProperties: {},
        saveDataRecording: true,
        get isAnonymous(): boolean {
          return Object.keys(this.sensitiveProperties).length > 0;
        },
        get hasProperties(): boolean {
          return Object.keys(this.properties).length > 0;
        },
      };

      const event =
        AnalyticsEventBuilder.createEventBuilder(existingEvent).build();

      expect(event.name).toBe('existing_event');
      expect(event.properties).toEqual({ existingProp: 'value' });
      expect(event.sensitiveProperties).toEqual({});
      expect(event.saveDataRecording).toBe(true);
    });
  });

  describe('addProperties', () => {
    it('adds properties to event', () => {
      const properties: AnalyticsEventProperties = {
        prop1: 'value1',
        prop2: 42,
        prop3: true,
      };

      const event = AnalyticsEventBuilder.createEventBuilder('test_event')
        .addProperties(properties)
        .build();

      expect(event.properties).toEqual(properties);
      expect(event.hasProperties).toBe(true);
    });

    it('merges multiple property additions', () => {
      const event = AnalyticsEventBuilder.createEventBuilder('test_event')
        .addProperties({ prop1: 'value1' })
        .addProperties({ prop2: 'value2' })
        .build();

      expect(event.properties).toEqual({
        prop1: 'value1',
        prop2: 'value2',
      });
    });

    it('overwrites properties with same key', () => {
      const event = AnalyticsEventBuilder.createEventBuilder('test_event')
        .addProperties({ prop1: 'value1' })
        .addProperties({ prop1: 'value2' })
        .build();

      expect(event.properties).toEqual({ prop1: 'value2' });
    });

    it('returns builder for method chaining', () => {
      const builder = AnalyticsEventBuilder.createEventBuilder('test_event');
      const chainedBuilder = builder.addProperties({ prop1: 'value1' });

      // Builder methods return a new builder instance, but chaining works
      expect(chainedBuilder).toBeDefined();
      expect(chainedBuilder.build().properties).toEqual({ prop1: 'value1' });
      // Verify chaining works by calling another method
      const finalEvent = chainedBuilder
        .addProperties({ prop2: 'value2' })
        .build();
      expect(finalEvent.properties).toEqual({
        prop1: 'value1',
        prop2: 'value2',
      });
    });
  });

  describe('addSensitiveProperties', () => {
    it('adds sensitive properties to event', () => {
      const sensitiveProperties: AnalyticsEventProperties = {
        address: '0x123',
        amount: '1.5',
      };

      const event = AnalyticsEventBuilder.createEventBuilder('test_event')
        .addSensitiveProperties(sensitiveProperties)
        .build();

      expect(event.sensitiveProperties).toEqual(sensitiveProperties);
      expect(event.isAnonymous).toBe(true);
      expect(event.hasProperties).toBe(true);
    });

    it('merges multiple sensitive property additions', () => {
      const event = AnalyticsEventBuilder.createEventBuilder('test_event')
        .addSensitiveProperties({ address: '0x123' })
        .addSensitiveProperties({ amount: '1.5' })
        .build();

      expect(event.sensitiveProperties).toEqual({
        address: '0x123',
        amount: '1.5',
      });
    });

    it('overwrites sensitive properties with same key', () => {
      const event = AnalyticsEventBuilder.createEventBuilder('test_event')
        .addSensitiveProperties({ address: '0x123' })
        .addSensitiveProperties({ address: '0x456' })
        .build();

      expect(event.sensitiveProperties).toEqual({ address: '0x456' });
    });

    it('returns builder for method chaining', () => {
      const builder = AnalyticsEventBuilder.createEventBuilder('test_event');
      const chainedBuilder = builder.addSensitiveProperties({
        address: '0x123',
      });

      // Builder methods return a new builder instance, but chaining works
      expect(chainedBuilder).toBeDefined();
      expect(chainedBuilder.build().sensitiveProperties).toEqual({
        address: '0x123',
      });
      // Verify chaining works by calling another method
      const finalEvent = chainedBuilder
        .addSensitiveProperties({ amount: '1.5' })
        .build();
      expect(finalEvent.sensitiveProperties).toEqual({
        address: '0x123',
        amount: '1.5',
      });
    });
  });

  describe('removeProperties', () => {
    it('removes specified properties from event', () => {
      const event = AnalyticsEventBuilder.createEventBuilder('test_event')
        .addProperties({ prop1: 'value1', prop2: 'value2', prop3: 'value3' })
        .removeProperties(['prop1', 'prop3'])
        .build();

      expect(event.properties).toEqual({ prop2: 'value2' });
    });

    it('handles removing non-existent properties', () => {
      const event = AnalyticsEventBuilder.createEventBuilder('test_event')
        .addProperties({ prop1: 'value1' })
        .removeProperties(['prop2', 'prop3'])
        .build();

      expect(event.properties).toEqual({ prop1: 'value1' });
    });

    it('handles removing from empty properties', () => {
      const event = AnalyticsEventBuilder.createEventBuilder('test_event')
        .removeProperties(['prop1'])
        .build();

      expect(event.properties).toEqual({});
    });

    it('returns builder for method chaining', () => {
      const builder = AnalyticsEventBuilder.createEventBuilder(
        'test_event',
      ).addProperties({ prop1: 'value1' });
      const chainedBuilder = builder.removeProperties(['prop1']);

      // Builder methods return a new builder instance, but chaining works
      expect(chainedBuilder).toBeDefined();
      expect(chainedBuilder.build().properties).toEqual({});
      // Verify chaining works by calling another method
      const finalEvent = chainedBuilder
        .addProperties({ prop2: 'value2' })
        .build();
      expect(finalEvent.properties).toEqual({ prop2: 'value2' });
    });
  });

  describe('removeSensitiveProperties', () => {
    it('removes specified sensitive properties from event', () => {
      const event = AnalyticsEventBuilder.createEventBuilder('test_event')
        .addSensitiveProperties({
          address: '0x123',
          amount: '1.5',
          token: 'ETH',
        })
        .removeSensitiveProperties(['address', 'token'])
        .build();

      expect(event.sensitiveProperties).toEqual({ amount: '1.5' });
      expect(event.isAnonymous).toBe(true);
    });

    it('sets isAnonymous to false when all sensitive properties removed', () => {
      const event = AnalyticsEventBuilder.createEventBuilder('test_event')
        .addSensitiveProperties({ address: '0x123' })
        .removeSensitiveProperties(['address'])
        .build();

      expect(event.sensitiveProperties).toEqual({});
      expect(event.isAnonymous).toBe(false);
    });

    it('handles removing non-existent sensitive properties', () => {
      const event = AnalyticsEventBuilder.createEventBuilder('test_event')
        .addSensitiveProperties({ address: '0x123' })
        .removeSensitiveProperties(['amount', 'token'])
        .build();

      expect(event.sensitiveProperties).toEqual({ address: '0x123' });
    });

    it('returns builder for method chaining', () => {
      const builder = AnalyticsEventBuilder.createEventBuilder(
        'test_event',
      ).addSensitiveProperties({ address: '0x123' });
      const chainedBuilder = builder.removeSensitiveProperties(['address']);

      // Builder methods return a new builder instance, but chaining works
      expect(chainedBuilder).toBeDefined();
      expect(chainedBuilder.build().sensitiveProperties).toEqual({});
      // Verify chaining works by calling another method
      const finalEvent = chainedBuilder
        .addSensitiveProperties({ amount: '1.5' })
        .build();
      expect(finalEvent.sensitiveProperties).toEqual({ amount: '1.5' });
    });
  });

  describe('setSaveDataRecording', () => {
    it('sets saveDataRecording to true', () => {
      const event = AnalyticsEventBuilder.createEventBuilder('test_event')
        .setSaveDataRecording(true)
        .build();

      expect(event.saveDataRecording).toBe(true);
    });

    it('sets saveDataRecording to false', () => {
      const event = AnalyticsEventBuilder.createEventBuilder('test_event')
        .setSaveDataRecording(false)
        .build();

      expect(event.saveDataRecording).toBe(false);
    });

    it('overwrites previous saveDataRecording value', () => {
      const event = AnalyticsEventBuilder.createEventBuilder('test_event')
        .setSaveDataRecording(true)
        .setSaveDataRecording(false)
        .build();

      expect(event.saveDataRecording).toBe(false);
    });

    it('returns builder for method chaining', () => {
      const builder = AnalyticsEventBuilder.createEventBuilder('test_event');
      const chainedBuilder = builder.setSaveDataRecording(true);

      // Builder methods return a new builder instance, but chaining works
      expect(chainedBuilder).toBeDefined();
      expect(chainedBuilder.build().saveDataRecording).toBe(true);
      // Verify chaining works by calling another method
      const finalEvent = chainedBuilder.setSaveDataRecording(false).build();
      expect(finalEvent.saveDataRecording).toBe(false);
    });
  });

  describe('isAnonymous getter', () => {
    it('returns false when no sensitive properties', () => {
      const event = AnalyticsEventBuilder.createEventBuilder('test_event')
        .addProperties({ prop1: 'value1' })
        .build();

      expect(event.isAnonymous).toBe(false);
    });

    it('returns true when sensitive properties exist', () => {
      const event = AnalyticsEventBuilder.createEventBuilder('test_event')
        .addSensitiveProperties({ address: '0x123' })
        .build();

      expect(event.isAnonymous).toBe(true);
    });

    it('returns false after removing all sensitive properties', () => {
      const event = AnalyticsEventBuilder.createEventBuilder('test_event')
        .addSensitiveProperties({ address: '0x123' })
        .removeSensitiveProperties(['address'])
        .build();

      expect(event.isAnonymous).toBe(false);
    });
  });

  describe('hasProperties getter', () => {
    it('returns false when no properties exist', () => {
      const event =
        AnalyticsEventBuilder.createEventBuilder('test_event').build();

      expect(event.hasProperties).toBe(false);
    });

    it('returns true when regular properties exist', () => {
      const event = AnalyticsEventBuilder.createEventBuilder('test_event')
        .addProperties({ prop1: 'value1' })
        .build();

      expect(event.hasProperties).toBe(true);
    });

    it('returns true when sensitive properties exist', () => {
      const event = AnalyticsEventBuilder.createEventBuilder('test_event')
        .addSensitiveProperties({ address: '0x123' })
        .build();

      expect(event.hasProperties).toBe(true);
    });

    it('returns true when both property types exist', () => {
      const event = AnalyticsEventBuilder.createEventBuilder('test_event')
        .addProperties({ prop1: 'value1' })
        .addSensitiveProperties({ address: '0x123' })
        .build();

      expect(event.hasProperties).toBe(true);
    });

    it('returns false after removing all properties', () => {
      const event = AnalyticsEventBuilder.createEventBuilder('test_event')
        .addProperties({ prop1: 'value1' })
        .removeProperties(['prop1'])
        .build();

      expect(event.hasProperties).toBe(false);
    });
  });

  describe('method chaining', () => {
    it('chains all builder methods', () => {
      const event = AnalyticsEventBuilder.createEventBuilder('test_event')
        .addProperties({ prop1: 'value1' })
        .addSensitiveProperties({ address: '0x123' })
        .setSaveDataRecording(true)
        .removeProperties(['prop1'])
        .build();

      expect(event.name).toBe('test_event');
      expect(event.properties).toEqual({});
      expect(event.sensitiveProperties).toEqual({ address: '0x123' });
      expect(event.saveDataRecording).toBe(true);
      expect(event.isAnonymous).toBe(true);
    });

    it('builds multiple independent events', () => {
      const event1 = AnalyticsEventBuilder.createEventBuilder('event1')
        .addProperties({ prop1: 'value1' })
        .build();

      const event2 = AnalyticsEventBuilder.createEventBuilder('event2')
        .addProperties({ prop2: 'value2' })
        .build();

      expect(event1.name).toBe('event1');
      expect(event1.properties).toEqual({ prop1: 'value1' });
      expect(event2.name).toBe('event2');
      expect(event2.properties).toEqual({ prop2: 'value2' });
    });
  });

  describe('extractEventName', () => {
    it('extracts name from string', () => {
      const event =
        AnalyticsEventBuilder.createEventBuilder('string_event').build();

      expect(event.name).toBe('string_event');
    });

    it('extracts category from IMetaMetricsEvent', () => {
      const legacyEvent: IMetaMetricsEvent = {
        category: 'legacy_category',
      };

      const event =
        AnalyticsEventBuilder.createEventBuilder(legacyEvent).build();

      expect(event.name).toBe('legacy_category');
    });

    it('extracts name from ITrackingEvent', () => {
      const trackingEvent: ITrackingEvent = {
        name: 'tracking_event',
        properties: {},
        sensitiveProperties: {},
        saveDataRecording: false,
        get isAnonymous(): boolean {
          return false;
        },
        get hasProperties(): boolean {
          return false;
        },
      };

      const event =
        AnalyticsEventBuilder.createEventBuilder(trackingEvent).build();

      expect(event.name).toBe('tracking_event');
    });

    it('extracts name from AnalyticsTrackingEvent', () => {
      const existingEvent: AnalyticsTrackingEvent = {
        name: 'existing_event',
        properties: {},
        sensitiveProperties: {},
        saveDataRecording: false,
        get isAnonymous(): boolean {
          return false;
        },
        get hasProperties(): boolean {
          return false;
        },
      };

      const event =
        AnalyticsEventBuilder.createEventBuilder(existingEvent).build();

      expect(event.name).toBe('existing_event');
    });
  });
});
