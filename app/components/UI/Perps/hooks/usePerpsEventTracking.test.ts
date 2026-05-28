import { renderHook, act } from '@testing-library/react-native';
import { usePerpsEventTracking } from './usePerpsEventTracking';
import { PERPS_EVENT_PROPERTY } from '@metamask/perps-controller';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../core/Analytics';

const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn();

jest.mock('../../../hooks/useAnalytics/useAnalytics');

describe('usePerpsEventTracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(1234567890);

    const eventBuilder = {
      addProperties: jest.fn().mockReturnThis(),
      build: jest.fn().mockReturnValue({ type: 'mock-event' }),
    };
    mockCreateEventBuilder.mockReturnValue(eventBuilder);
    jest.mocked(useAnalytics).mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: mockCreateEventBuilder,
    } as unknown as ReturnType<typeof useAnalytics>);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('track', () => {
    it('tracks event with automatic timestamp', () => {
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

    it('tracks event with custom properties', () => {
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

  describe('declarative tracking', () => {
    it('tracks again when reset key changes', () => {
      const { rerender } = renderHook(
        ({ resetKey }: { resetKey: string }) =>
          usePerpsEventTracking({
            eventName: MetaMetricsEvents.PERPS_SCREEN_VIEWED,
            resetKey,
            conditions: [true],
            properties: { asset: resetKey },
          }),
        {
          initialProps: { resetKey: 'BTC' },
        },
      );

      expect(mockTrackEvent).toHaveBeenCalledTimes(1);

      rerender({ resetKey: 'ETH' });

      expect(mockTrackEvent).toHaveBeenCalledTimes(2);
      const eventBuilder = mockCreateEventBuilder.mock.results[1].value;
      expect(eventBuilder.addProperties).toHaveBeenCalledWith({
        [PERPS_EVENT_PROPERTY.TIMESTAMP]: 1234567890,
        asset: 'ETH',
      });
    });
  });
});
