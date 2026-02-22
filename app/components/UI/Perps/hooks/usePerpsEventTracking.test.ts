import { renderHook, act } from '@testing-library/react-native';
import { usePerpsEventTracking } from './usePerpsEventTracking';
import { PERPS_EVENT_PROPERTY } from '../constants/eventNames';

// Mock useMetrics hook
const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn();

jest.mock('../../../hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
  MetaMetricsEvents: {},
}));

describe('usePerpsEventTracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock Date.now to return a consistent value
    jest.spyOn(Date, 'now').mockReturnValue(1234567890);

    // Setup createEventBuilder mock
    const eventBuilder = {
      addProperties: jest.fn().mockReturnThis(),
      build: jest.fn().mockReturnValue({ type: 'mock-event' }),
    };
    mockCreateEventBuilder.mockReturnValue(eventBuilder);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('track', () => {
    it('should track event with automatic timestamp', () => {
      const { result } = renderHook(() => usePerpsEventTracking());
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockEvent = 'TEST_EVENT' as any;

      act(() => {
        result.current.track(mockEvent);
      });

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(mockEvent);
      const eventBuilder = mockCreateEventBuilder.mock.results[0].value;
      expect(eventBuilder.addProperties).toHaveBeenCalledWith({
        [PERPS_EVENT_PROPERTY.TIMESTAMP]: 1234567890,
      });
      expect(eventBuilder.build).toHaveBeenCalled();
      expect(mockTrackEvent).toHaveBeenCalledWith({ type: 'mock-event' });
    });

    it('should track event with custom properties', () => {
      const { result } = renderHook(() => usePerpsEventTracking());
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockEvent = 'TEST_EVENT' as any;
      const customProps = {
        asset: 'BTC',
        leverage: 10,
        orderType: 'market',
      };

      act(() => {
        result.current.track(mockEvent, customProps);
      });

      const eventBuilder = mockCreateEventBuilder.mock.results[0].value;
      expect(eventBuilder.addProperties).toHaveBeenCalledWith({
        [PERPS_EVENT_PROPERTY.TIMESTAMP]: 1234567890,
        ...customProps,
      });
    });
  });
});
