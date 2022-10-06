import { renderHook, act } from '@testing-library/react-hooks';
import useMetaMetrics from './useMetaMetrics';
import MetaMetrics from '../../../core/Analytics/MetaMetrics';

jest.mock('../../../core/Analytics/MetaMetrics', () => ({
  MetaMetrics: {
    trackEvent: () => jest.fn(),
    trackAnonymousEvent: () => jest.fn(),
  },
}));

describe('useMetaMetrics', () => {
  test('it should return a function object from hook useMetaMetrics', () => {
    const { result } = renderHook(() => useMetaMetrics());
    expect(typeof result.current).toBe('function');
  });

  test('it should call MetaMetrics.trackEvent for anonymous event', () => {
    const { result } = renderHook(() => useMetaMetrics());
    const trackEventSpy = jest.spyOn(MetaMetrics, 'trackAnonymousEvent');
    act(() => {
      result.current({ name: 'Mock Anonymous Event', anonymous: true }, {});
    });
    expect(trackEventSpy).toHaveBeenCalled();
  });

  test('it should call MetaMetrics.trackEvent for non-anonymous event', () => {
    const { result } = renderHook(() => useMetaMetrics());
    const trackEventSpy = jest.spyOn(MetaMetrics, 'trackEvent');
    act(() => {
      result.current(
        { name: 'Mock Non-Anonymous Event', anonymous: false },
        {},
      );
    });
    expect(trackEventSpy).toHaveBeenCalled();
  });
});
