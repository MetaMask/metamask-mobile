import {
  isTrackingEvent,
  type IMetaMetricsEvent,
  type ITrackingEvent,
} from './analytics.types';

describe('isTrackingEvent', () => {
  it('returns true for an ITrackingEvent', () => {
    const event: ITrackingEvent = {
      name: 'test_event',
      properties: {},
      sensitiveProperties: {},
      get isAnonymous() {
        return false;
      },
      get hasProperties() {
        return false;
      },
    };

    expect(isTrackingEvent(event)).toBe(true);
  });

  it('returns false for an IMetaMetricsEvent', () => {
    const event: IMetaMetricsEvent = {
      category: 'test_category',
    };

    expect(isTrackingEvent(event)).toBe(false);
  });

  it('returns false when name is not a string', () => {
    const event = {
      name: 123,
      properties: {},
      sensitiveProperties: {},
    } as unknown as ITrackingEvent;

    expect(isTrackingEvent(event)).toBe(false);
  });

  it('returns false when both category and name are present', () => {
    const event = {
      category: 'test_category',
      name: 'test_name',
    } as unknown as IMetaMetricsEvent;

    expect(isTrackingEvent(event)).toBe(false);
  });
});
