import { analytics } from '../../util/analytics/analytics';
import { AnalyticsEventBuilder } from '../../util/analytics/AnalyticsEventBuilder';
import { trackSnapEvent } from './SnapsMethodMiddleware';

jest.mock('../../util/analytics/analytics', () => ({
  analytics: { trackEvent: jest.fn() },
}));

const mockBuiltEvent = {
  name: 'snap_action',
  properties: { snap_id: 'npm:@metamask/test' },
};
const mockEventBuilder = {
  addProperties: jest.fn().mockReturnThis(),
  addSensitiveProperties: jest.fn().mockReturnThis(),
  build: jest.fn().mockReturnValue(mockBuiltEvent),
};

jest.mock('../../util/analytics/AnalyticsEventBuilder', () => ({
  AnalyticsEventBuilder: {
    createEventBuilder: jest.fn(() => mockEventBuilder),
  },
}));

describe('trackSnapEvent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('forwards event name, properties, and sensitiveProperties to analytics', () => {
    const payload = {
      event: 'snap_action',
      properties: { snap_id: 'npm:@metamask/test', action: 'install' },
      sensitiveProperties: { wallet_address: '0xabc' },
    };

    trackSnapEvent(payload);

    expect(AnalyticsEventBuilder.createEventBuilder).toHaveBeenCalledWith(
      payload.event,
    );
    expect(mockEventBuilder.addProperties).toHaveBeenCalledWith(
      payload.properties,
    );
    expect(mockEventBuilder.addSensitiveProperties).toHaveBeenCalledWith(
      payload.sensitiveProperties,
    );
    expect(mockEventBuilder.build).toHaveBeenCalled();
    expect(analytics.trackEvent).toHaveBeenCalledWith(mockBuiltEvent);
  });

  it('passes empty objects when no properties are provided', () => {
    const payload = {
      event: 'snap_minimal',
      properties: {},
      sensitiveProperties: {},
    };

    trackSnapEvent(payload);

    expect(AnalyticsEventBuilder.createEventBuilder).toHaveBeenCalledWith(
      'snap_minimal',
    );
    expect(mockEventBuilder.addProperties).toHaveBeenCalledWith({});
    expect(mockEventBuilder.addSensitiveProperties).toHaveBeenCalledWith({});
    expect(analytics.trackEvent).toHaveBeenCalledWith(mockBuiltEvent);
  });
});
