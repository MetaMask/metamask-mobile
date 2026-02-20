import { IMetaMetricsEvent } from '../..';
import { trackSnapAccountEvent } from './trackSnapAccountEvent';
import { analytics } from '../../../../util/analytics/analytics';
import { AnalyticsEventBuilder } from '../../../../util/analytics/AnalyticsEventBuilder';

const mockTrackEvent = jest.fn();
const mockAddProperties = jest.fn().mockReturnThis();
const mockBuild = jest.fn().mockReturnValue({ mockBuiltEvent: true });
const mockCreateEventBuilder = jest.fn().mockReturnValue({
  addProperties: mockAddProperties,
  build: mockBuild,
});

jest.mock('../../../../util/analytics/analytics', () => ({
  analytics: {
    trackEvent: jest.fn(),
  },
}));

jest.mock('../../../../util/analytics/AnalyticsEventBuilder', () => ({
  AnalyticsEventBuilder: {
    createEventBuilder: jest.fn(),
  },
}));

describe('trackSnapAccountEvent', () => {
  const mockMetricEvent: IMetaMetricsEvent = {
    category: 'testCategory',
    properties: { name: 'testEvent' },
  };
  const mockSnapId = 'npm:@metamask/test-snap';
  const mockSnapName = 'Test Snap';

  beforeEach(() => {
    jest.clearAllMocks();
    (analytics.trackEvent as jest.Mock).mockImplementation(mockTrackEvent);
    (AnalyticsEventBuilder.createEventBuilder as jest.Mock).mockImplementation(
      mockCreateEventBuilder,
    );
  });

  it('creates and tracks an event with snap account properties', () => {
    trackSnapAccountEvent(mockMetricEvent, mockSnapId, mockSnapName);
    expect(mockCreateEventBuilder).toHaveBeenCalledWith(mockMetricEvent);
    expect(mockAddProperties).toHaveBeenCalledWith({
      account_type: 'Snap',
      snap_id: mockSnapId,
      snap_name: mockSnapName,
    });

    expect(mockBuild).toHaveBeenCalled();
    expect(mockTrackEvent).toHaveBeenCalledWith({ mockBuiltEvent: true });
  });
});
