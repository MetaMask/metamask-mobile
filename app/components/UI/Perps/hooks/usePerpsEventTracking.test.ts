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

    mockCreateEventBuilder.mockImplementation(() => ({
      addProperties: jest.fn().mockReturnThis(),
      build: jest.fn().mockReturnValue({ type: 'mock-event' }),
    }));
    jest.mocked(useAnalytics).mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: mockCreateEventBuilder,
    } as unknown as ReturnType<typeof useAnalytics>);
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

    it('tracks Asset Viewed when PERPS_SCREEN_VIEWED is tracked', () => {
      const { result } = renderHook(() => usePerpsEventTracking());
      const customProps = { screen_type: 'home' };

      act(() => {
        result.current.track(
          MetaMetricsEvents.PERPS_SCREEN_VIEWED,
          customProps,
        );
      });

      expect(mockTrackEvent).toHaveBeenCalledTimes(2);
      expect(mockCreateEventBuilder.mock.calls[0][0]).toBe(
        MetaMetricsEvents.PERPS_SCREEN_VIEWED,
      );
      expect(mockCreateEventBuilder.mock.calls[1][0]).toBe(
        MetaMetricsEvents.ASSET_VIEWED,
      );

      const perpsBuilder = mockCreateEventBuilder.mock.results[0].value;
      const assetBuilder = mockCreateEventBuilder.mock.results[1].value;
      expect(perpsBuilder.addProperties).toHaveBeenCalledWith({
        [PERPS_EVENT_PROPERTY.TIMESTAMP]: 1234567890,
        ...customProps,
      });
      expect(assetBuilder.addProperties).toHaveBeenCalledWith({
        [PERPS_EVENT_PROPERTY.TIMESTAMP]: 1234567890,
        screen_type: 'home',
        trade_type: 'Perps',
        implementation_type: 'native',
      });
    });
  });
});
