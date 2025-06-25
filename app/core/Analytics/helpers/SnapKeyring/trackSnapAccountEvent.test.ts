import { IMetaMetricsEvent, MetaMetrics } from '../..';
import { trackSnapAccountEvent } from './trackSnapAccountEvent';
import { MetricsEventBuilder } from '../../MetricsEventBuilder';
import { IMetaMetrics } from '../../MetaMetrics.types';

const mockTrackEvent = jest.fn();
const mockAddProperties = jest.fn().mockReturnThis();
const mockBuild = jest.fn().mockReturnValue({ mockBuiltEvent: true });
const mockCreateEventBuilder = jest.fn().mockReturnValue({
  addProperties: mockAddProperties,
  build: mockBuild,
});

jest
  .spyOn(MetricsEventBuilder, 'createEventBuilder')
  .mockImplementation(mockCreateEventBuilder);

jest.spyOn(MetaMetrics, 'getInstance').mockReturnValue({
  trackEvent: mockTrackEvent,
  isEnabled: jest.fn(),
  enable: jest.fn(),
  addTraitsToUser: jest.fn(),
  group: jest.fn(),
  reset: jest.fn(),
  flush: jest.fn(),
  createDataDeletionTask: jest.fn(),
  checkDataDeleteStatus: jest.fn(),
  getDeleteRegulationCreationDate: jest.fn(),
  getDeleteRegulationId: jest.fn(),
  isDataRecorded: jest.fn(),
  configure: jest.fn(),
  getMetaMetricsId: jest.fn(),
} as IMetaMetrics);

describe('trackSnapAccountEvent', () => {
  const mockMetricEvent: IMetaMetricsEvent = {
    category: 'testCategory',
    properties: { name: 'testEvent' },
  };
  const mockSnapId = 'npm:@metamask/test-snap';
  const mockSnapName = 'Test Snap';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create and track an event with the correct properties', () => {
    trackSnapAccountEvent(mockMetricEvent, mockSnapId, mockSnapName);
    expect(mockCreateEventBuilder).toHaveBeenCalledWith(mockMetricEvent);
    expect(mockAddProperties).toHaveBeenCalledWith({
      account_type: 'Snap',
      snap_id: mockSnapId,
      snap_name: mockSnapName,
    });

    expect(mockBuild).toHaveBeenCalled();
    // Verify MetaMetrics trackEvent was called with the built event
    expect(mockTrackEvent).toHaveBeenCalledWith({ mockBuiltEvent: true });
  });
});
