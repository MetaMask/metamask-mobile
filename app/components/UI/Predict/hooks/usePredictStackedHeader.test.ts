import { renderHook, act } from '@testing-library/react-native';
import { usePredictStackedHeader } from './usePredictStackedHeader';

const mockSharedValues: { value: unknown }[] = [];

jest.mock('react-native-reanimated', () => ({
  useSharedValue: jest.fn((initialValue: unknown) => {
    const sharedValue = { value: initialValue };
    mockSharedValues.push(sharedValue);
    return sharedValue;
  }),
  useAnimatedScrollHandler: jest.fn(
    (config: { onScroll: (event: { contentOffset: { y: number } }) => void }) =>
      config,
  ),
}));

describe('usePredictStackedHeader', () => {
  beforeEach(() => {
    mockSharedValues.length = 0;
    jest.clearAllMocks();
  });

  it('initializes scrollY and titleSectionHeight shared values at 0', () => {
    const { result } = renderHook(() => usePredictStackedHeader());

    expect(result.current.scrollY.value).toBe(0);
    expect(result.current.titleSectionHeight.value).toBe(0);
  });

  it('writes the vertical content offset into scrollY on scroll', () => {
    const { result } = renderHook(() => usePredictStackedHeader());

    // The mocked useAnimatedScrollHandler returns the config object as-is.
    const handler = result.current.onScroll as unknown as {
      onScroll: (event: { contentOffset: { y: number } }) => void;
    };

    act(() => {
      handler.onScroll({ contentOffset: { y: 240 } });
    });

    expect(result.current.scrollY.value).toBe(240);
  });

  it('updates titleSectionHeight via setTitleSectionHeight', () => {
    const { result } = renderHook(() => usePredictStackedHeader());

    act(() => {
      result.current.setTitleSectionHeight(96);
    });

    expect(result.current.titleSectionHeight.value).toBe(96);
  });
});
