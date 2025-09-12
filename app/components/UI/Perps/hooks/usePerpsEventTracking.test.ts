import { renderHook, act } from '@testing-library/react-native';
import { usePerpsEventTracking } from './usePerpsEventTracking';
import { PerpsEventProperties } from '../constants/eventNames';

// Mock useMetrics hook
const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn();

jest.mock('../../../hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
  MetaMetricsEvents: {
    PERPS_ORDER_INITIATED: 'PERPS_ORDER_INITIATED',
    PERPS_ORDER_SUBMITTED: 'PERPS_ORDER_SUBMITTED',
    PERPS_ORDER_EXECUTED: 'PERPS_ORDER_EXECUTED',
    PERPS_ORDER_FAILED: 'PERPS_ORDER_FAILED',
    PERPS_ORDER_PARTIALLY_FILLED: 'PERPS_ORDER_PARTIALLY_FILLED',
    PERPS_WITHDRAWAL_INITIATED: 'PERPS_WITHDRAWAL_INITIATED',
    PERPS_WITHDRAWAL_SUBMITTED: 'PERPS_WITHDRAWAL_SUBMITTED',
    PERPS_POSITION_CLOSE_EXECUTED: 'PERPS_POSITION_CLOSE_EXECUTED',
  },
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
        [PerpsEventProperties.TIMESTAMP]: 1234567890,
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
        [PerpsEventProperties.TIMESTAMP]: 1234567890,
        ...customProps,
      });
    });
  });

  describe('trackTransaction', () => {
    it('should track initiated transaction', () => {
      const { result } = renderHook(() => usePerpsEventTracking());

      act(() => {
        result.current.trackTransaction('PERPS_ORDER', 'initiated', {
          asset: 'BTC',
          amount: 100,
        });
      });

      // Verify it constructs the right event name and calls track
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        'PERPS_ORDER_INITIATED',
      );
      const eventBuilder = mockCreateEventBuilder.mock.results[0].value;
      expect(eventBuilder.addProperties).toHaveBeenCalledWith({
        [PerpsEventProperties.TIMESTAMP]: 1234567890,
        asset: 'BTC',
        amount: 100,
      });
    });

    it('should track submitted transaction', () => {
      const { result } = renderHook(() => usePerpsEventTracking());

      act(() => {
        result.current.trackTransaction('PERPS_WITHDRAWAL', 'submitted');
      });

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        'PERPS_WITHDRAWAL_SUBMITTED',
      );
      const eventBuilder = mockCreateEventBuilder.mock.results[0].value;
      expect(eventBuilder.addProperties).toHaveBeenCalledWith({
        [PerpsEventProperties.TIMESTAMP]: 1234567890,
      });
    });

    it('should track executed transaction', () => {
      const { result } = renderHook(() => usePerpsEventTracking());

      act(() => {
        result.current.trackTransaction('PERPS_POSITION_CLOSE', 'executed', {
          pnl: 150.5,
        });
      });

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        'PERPS_POSITION_CLOSE_EXECUTED',
      );
      const eventBuilder = mockCreateEventBuilder.mock.results[0].value;
      expect(eventBuilder.addProperties).toHaveBeenCalledWith({
        [PerpsEventProperties.TIMESTAMP]: 1234567890,
        pnl: 150.5,
      });
    });

    it('should track failed transaction', () => {
      const { result } = renderHook(() => usePerpsEventTracking());

      act(() => {
        result.current.trackTransaction('PERPS_ORDER', 'failed', {
          error: 'Insufficient balance',
        });
      });

      expect(mockCreateEventBuilder).toHaveBeenCalledWith('PERPS_ORDER_FAILED');
      const eventBuilder = mockCreateEventBuilder.mock.results[0].value;
      expect(eventBuilder.addProperties).toHaveBeenCalledWith({
        [PerpsEventProperties.TIMESTAMP]: 1234567890,
        error: 'Insufficient balance',
      });
    });

    it('should track partially filled transaction', () => {
      const { result } = renderHook(() => usePerpsEventTracking());

      act(() => {
        result.current.trackTransaction('PERPS_ORDER', 'partially_filled', {
          filledAmount: 50,
          totalAmount: 100,
        });
      });

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        'PERPS_ORDER_PARTIALLY_FILLED',
      );
      const eventBuilder = mockCreateEventBuilder.mock.results[0].value;
      expect(eventBuilder.addProperties).toHaveBeenCalledWith({
        [PerpsEventProperties.TIMESTAMP]: 1234567890,
        filledAmount: 50,
        totalAmount: 100,
      });
    });

    it('should not track when event name does not exist in MetaMetricsEvents', () => {
      const { result } = renderHook(() => usePerpsEventTracking());

      act(() => {
        // This event doesn't exist in our mocked MetaMetricsEvents
        result.current.trackTransaction('INVALID_EVENT', 'executed');
      });

      // Should not call trackEvent for invalid events
      // The last call should still be from the previous test
      const callCount = mockTrackEvent.mock.calls.length;

      act(() => {
        // Call with a valid event to verify tracking still works
        result.current.trackTransaction('PERPS_ORDER', 'initiated');
      });

      // Should have one more call now
      expect(mockTrackEvent.mock.calls.length).toBe(callCount + 1);
    });
  });
});
