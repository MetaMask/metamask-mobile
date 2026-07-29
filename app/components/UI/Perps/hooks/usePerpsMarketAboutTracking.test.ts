import { renderHook, act } from '@testing-library/react-native';
import type { LayoutChangeEvent, NativeScrollEvent } from 'react-native';
import { usePerpsMarketAboutTracking } from './usePerpsMarketAboutTracking';
import { usePerpsEventTracking } from './usePerpsEventTracking';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { PERPS_EVENT_PROPERTY } from '@metamask/perps-controller';
import {
  PERPS_MARKET_ABOUT_EVENT_PROPERTY,
  PERPS_MARKET_ABOUT_INTERACTION_TYPE,
} from '../components/PerpsMarketAboutSection/PerpsMarketAboutSection.constants';

jest.mock('./usePerpsEventTracking');

const mockImperativeTrack = jest.fn();

const createLayoutEvent = (y: number, height: number): LayoutChangeEvent =>
  ({
    nativeEvent: { layout: { x: 0, y, width: 400, height } },
  }) as unknown as LayoutChangeEvent;

const createScrollEvent = (
  scrollY: number,
  viewportHeight: number,
): { nativeEvent: NativeScrollEvent } =>
  ({
    nativeEvent: {
      contentOffset: { x: 0, y: scrollY },
      layoutMeasurement: { width: 400, height: viewportHeight },
      contentSize: { width: 400, height: 2000 },
      contentInset: { top: 0, left: 0, bottom: 0, right: 0 },
      zoomScale: 1,
    },
  }) as { nativeEvent: NativeScrollEvent };

/**
 * Finds the declarative usePerpsEventTracking invocation (called with an options
 * object) so the "displayed" event configuration can be asserted.
 */
const getDeclarativeOptions = () =>
  jest
    .mocked(usePerpsEventTracking)
    .mock.calls.map((call) => call[0])
    .find((arg) => typeof arg === 'object' && arg !== null);

describe('usePerpsMarketAboutTracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(usePerpsEventTracking).mockReturnValue({
      track: mockImperativeTrack,
    } as unknown as ReturnType<typeof usePerpsEventTracking>);
  });

  describe('hasDescription', () => {
    it('is true when a non-empty description is provided', () => {
      const { result } = renderHook(() =>
        usePerpsMarketAboutTracking({
          symbol: 'BTC',
          marketType: 'crypto',
          description: 'Bitcoin is the first cryptocurrency.',
        }),
      );

      expect(result.current.hasDescription).toBe(true);
    });

    it('is false for an empty or whitespace-only description', () => {
      const { result } = renderHook(() =>
        usePerpsMarketAboutTracking({
          symbol: 'BTC',
          marketType: 'crypto',
          description: '   ',
        }),
      );

      expect(result.current.hasDescription).toBe(false);
    });
  });

  describe('displayed event (AC4)', () => {
    it('configures the declarative tracker to fire when a description exists', () => {
      renderHook(() =>
        usePerpsMarketAboutTracking({
          symbol: 'NVDA',
          marketType: 'stock',
          description: 'NVIDIA designs GPUs.',
        }),
      );

      const options = getDeclarativeOptions();
      expect(options).toEqual(
        expect.objectContaining({
          eventName: MetaMetricsEvents.PERPS_UI_INTERACTION,
          conditions: [true],
          resetKey: 'NVDA',
          properties: expect.objectContaining({
            [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
              PERPS_MARKET_ABOUT_INTERACTION_TYPE.DISPLAYED,
            [PERPS_MARKET_ABOUT_EVENT_PROPERTY.MARKET_SYMBOL]: 'NVDA',
            [PERPS_MARKET_ABOUT_EVENT_PROPERTY.MARKET_TYPE]: 'stock',
            [PERPS_MARKET_ABOUT_EVENT_PROPERTY.DESCRIPTION_LENGTH]:
              'NVIDIA designs GPUs.'.length,
          }),
        }),
      );
    });

    it('does not fire when there is no description', () => {
      renderHook(() =>
        usePerpsMarketAboutTracking({
          symbol: 'BTC',
          marketType: 'crypto',
          description: undefined,
        }),
      );

      const options = getDeclarativeOptions();
      expect(options).toEqual(expect.objectContaining({ conditions: [false] }));
    });

    it('defaults market_type to crypto when not provided', () => {
      renderHook(() =>
        usePerpsMarketAboutTracking({
          symbol: 'BTC',
          description: 'A description.',
        }),
      );

      const options = getDeclarativeOptions() as { properties: object };
      expect(options.properties).toEqual(
        expect.objectContaining({
          [PERPS_MARKET_ABOUT_EVENT_PROPERTY.MARKET_TYPE]: 'crypto',
        }),
      );
    });
  });

  describe('viewed event (AC5)', () => {
    it('fires once when the section scrolls into the viewport', () => {
      const { result } = renderHook(() =>
        usePerpsMarketAboutTracking({
          symbol: 'CL',
          marketType: 'commodity',
          description: 'Crude oil is a commodity.',
        }),
      );

      act(() => {
        result.current.handleAboutLayout(createLayoutEvent(500, 200));
      });

      // viewport bottom = 400 + 200 = 600 >= threshold (500 + 40 = 540)
      act(() => {
        result.current.handleAboutScroll(createScrollEvent(400, 200));
      });

      expect(mockImperativeTrack).toHaveBeenCalledTimes(1);
      expect(mockImperativeTrack).toHaveBeenCalledWith(
        MetaMetricsEvents.PERPS_UI_INTERACTION,
        expect.objectContaining({
          [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
            PERPS_MARKET_ABOUT_INTERACTION_TYPE.VIEWED,
          [PERPS_MARKET_ABOUT_EVENT_PROPERTY.MARKET_SYMBOL]: 'CL',
          [PERPS_MARKET_ABOUT_EVENT_PROPERTY.MARKET_TYPE]: 'commodity',
          [PERPS_MARKET_ABOUT_EVENT_PROPERTY.DESCRIPTION_LENGTH]:
            'Crude oil is a commodity.'.length,
        }),
      );
    });

    it('does not fire again on subsequent scrolls (once per session)', () => {
      const { result } = renderHook(() =>
        usePerpsMarketAboutTracking({
          symbol: 'CL',
          marketType: 'commodity',
          description: 'Crude oil is a commodity.',
        }),
      );

      act(() => {
        result.current.handleAboutLayout(createLayoutEvent(500, 200));
      });

      act(() => {
        result.current.handleAboutScroll(createScrollEvent(400, 200));
        result.current.handleAboutScroll(createScrollEvent(500, 200));
      });

      expect(mockImperativeTrack).toHaveBeenCalledTimes(1);
    });

    it('does not fire before the section is scrolled into view', () => {
      const { result } = renderHook(() =>
        usePerpsMarketAboutTracking({
          symbol: 'CL',
          marketType: 'commodity',
          description: 'Crude oil is a commodity.',
        }),
      );

      act(() => {
        result.current.handleAboutLayout(createLayoutEvent(1500, 200));
      });

      // viewport bottom = 0 + 200 = 200, far below threshold (1500 + 40)
      act(() => {
        result.current.handleAboutScroll(createScrollEvent(0, 200));
      });

      expect(mockImperativeTrack).not.toHaveBeenCalled();
    });

    it('does not fire without a layout measurement', () => {
      const { result } = renderHook(() =>
        usePerpsMarketAboutTracking({
          symbol: 'CL',
          marketType: 'commodity',
          description: 'Crude oil is a commodity.',
        }),
      );

      act(() => {
        result.current.handleAboutScroll(createScrollEvent(1000, 200));
      });

      expect(mockImperativeTrack).not.toHaveBeenCalled();
    });

    it('does not fire when there is no description', () => {
      const { result } = renderHook(() =>
        usePerpsMarketAboutTracking({
          symbol: 'BTC',
          marketType: 'crypto',
          description: undefined,
        }),
      );

      act(() => {
        result.current.handleAboutLayout(createLayoutEvent(100, 200));
      });

      act(() => {
        result.current.handleAboutScroll(createScrollEvent(1000, 200));
      });

      expect(mockImperativeTrack).not.toHaveBeenCalled();
    });

    it('re-arms the viewed event when the market (session) changes', () => {
      const { result, rerender } = renderHook(
        ({ symbol }) =>
          usePerpsMarketAboutTracking({
            symbol,
            marketType: 'crypto',
            description: 'A description.',
          }),
        { initialProps: { symbol: 'BTC' } },
      );

      act(() => {
        result.current.handleAboutLayout(createLayoutEvent(100, 200));
        result.current.handleAboutScroll(createScrollEvent(100, 200));
      });
      expect(mockImperativeTrack).toHaveBeenCalledTimes(1);

      rerender({ symbol: 'ETH' });

      act(() => {
        result.current.handleAboutLayout(createLayoutEvent(100, 200));
        result.current.handleAboutScroll(createScrollEvent(100, 200));
      });
      expect(mockImperativeTrack).toHaveBeenCalledTimes(2);
    });

    it('ignores a zero-height layout', () => {
      const { result } = renderHook(() =>
        usePerpsMarketAboutTracking({
          symbol: 'CL',
          marketType: 'commodity',
          description: 'Crude oil is a commodity.',
        }),
      );

      act(() => {
        result.current.handleAboutLayout(createLayoutEvent(100, 0));
      });

      act(() => {
        result.current.handleAboutScroll(createScrollEvent(1000, 200));
      });

      expect(mockImperativeTrack).not.toHaveBeenCalled();
    });
  });
});
