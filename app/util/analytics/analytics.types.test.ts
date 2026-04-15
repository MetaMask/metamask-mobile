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
      saveDataRecording: true,
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
});
