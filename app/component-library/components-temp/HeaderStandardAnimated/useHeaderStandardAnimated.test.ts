// Third party dependencies.
import { NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { renderHook, act } from '@testing-library/react-native';

// Internal dependencies.
import useHeaderStandardAnimated from './useHeaderStandardAnimated';

jest.mock('react-native-reanimated', () => ({
  useSharedValue: jest.fn((initial: number) => ({ value: initial })),
}));

const createScrollEvent = (
  contentOffsetY: number,
): NativeSyntheticEvent<NativeScrollEvent> =>
  ({
    nativeEvent: { contentOffset: { y: contentOffsetY, x: 0 } },
  }) as NativeSyntheticEvent<NativeScrollEvent>;

describe('useHeaderStandardAnimated', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('return value', () => {
    it('returns scrollY, titleSectionHeightSv, setTitleSectionHeight, and onScroll', () => {
      const { result } = renderHook(() => useHeaderStandardAnimated());

      expect(result.current).toHaveProperty('scrollY');
      expect(result.current).toHaveProperty('titleSectionHeightSv');
      expect(result.current).toHaveProperty('setTitleSectionHeight');
      expect(result.current).toHaveProperty('onScroll');
      expect(typeof result.current.setTitleSectionHeight).toBe('function');
      expect(typeof result.current.onScroll).toBe('function');
    });

    it('initializes scrollY with value 0', () => {
      const { result } = renderHook(() => useHeaderStandardAnimated());

      expect(result.current.scrollY.value).toBe(0);
    });

    it('initializes titleSectionHeightSv with value 0', () => {
      const { result } = renderHook(() => useHeaderStandardAnimated());

      expect(result.current.titleSectionHeightSv.value).toBe(0);
    });
  });

  describe('setTitleSectionHeight', () => {
    it('updates titleSectionHeightSv.value when called', () => {
      const { result } = renderHook(() => useHeaderStandardAnimated());

      act(() => {
        result.current.setTitleSectionHeight(120);
      });

      expect(result.current.titleSectionHeightSv.value).toBe(120);
    });

    it('updates titleSectionHeightSv.value on multiple calls', () => {
      const { result } = renderHook(() => useHeaderStandardAnimated());

      act(() => {
        result.current.setTitleSectionHeight(50);
      });
      expect(result.current.titleSectionHeightSv.value).toBe(50);

      act(() => {
        result.current.setTitleSectionHeight(200);
      });
      expect(result.current.titleSectionHeightSv.value).toBe(200);
    });
  });

  describe('onScroll', () => {
    it('updates scrollY.value from event contentOffset.y', () => {
      const { result } = renderHook(() => useHeaderStandardAnimated());

      act(() => {
        result.current.onScroll(createScrollEvent(75));
      });

      expect(result.current.scrollY.value).toBe(75);
    });

    it('updates scrollY.value on multiple scroll events', () => {
      const { result } = renderHook(() => useHeaderStandardAnimated());

      act(() => {
        result.current.onScroll(createScrollEvent(10));
      });
      expect(result.current.scrollY.value).toBe(10);

      act(() => {
        result.current.onScroll(createScrollEvent(150));
      });
      expect(result.current.scrollY.value).toBe(150);
    });
  });
});
