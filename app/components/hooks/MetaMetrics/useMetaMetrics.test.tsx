import { renderHook } from '@testing-library/react-hooks';
import useMetaMetrics from './useMetaMetrics';

jest.mock('../../../core/Analytics', () => ({
  MetaMetrics: {
    trackEvent: () => jest.fn(),
    trackAnonymousEvent: () => jest.fn(),
  },
}));

// TODO - Add more tests when useMetaMetrics hook is actually used
describe('useMetaMetrics', () => {
  test('it should return a function object from hook useMetaMetrics', () => {
    const { result } = renderHook(() => useMetaMetrics());
    expect(typeof result.current).toBe('function');
  });
});
