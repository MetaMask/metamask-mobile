import { renderHook, act } from '@testing-library/react-native';
import { useRewardsDashboardHeaderScroll } from './useRewardsDashboardHeaderScroll';

jest.mock('react-native-reanimated', () => {
  const Reanimated = jest.requireActual('react-native-reanimated/mock');
  return {
    ...Reanimated,
    useAnimatedScrollHandler: (handlers: {
      onScroll?: (event: { contentOffset: { y: number } }) => void;
    }) => handlers.onScroll,
    useAnimatedStyle: (styleFactory: () => object) => styleFactory(),
    interpolate: (value: number, input: number[], output: number[]): number => {
      if (value <= input[0]) {
        return output[0];
      }
      if (value >= input[input.length - 1]) {
        return output[output.length - 1];
      }
      return output[1];
    },
    Extrapolation: { CLAMP: 'clamp' },
    runOnJS: <T extends (...args: never[]) => unknown>(fn: T) => fn,
  };
});

describe('useRewardsDashboardHeaderScroll', () => {
  it('reports title section height via setTitleSectionHeight', () => {
    const onCompactTitleVisibilityChange = jest.fn();
    const { result } = renderHook(() =>
      useRewardsDashboardHeaderScroll({ onCompactTitleVisibilityChange }),
    );

    act(() => {
      result.current.setTitleSectionHeight(48);
    });

    expect(result.current.titleSectionHeight.value).toBe(48);
  });

  it('shows the compact title once scroll passes the title section', () => {
    const onCompactTitleVisibilityChange = jest.fn();
    const { result } = renderHook(() =>
      useRewardsDashboardHeaderScroll({ onCompactTitleVisibilityChange }),
    );

    act(() => {
      result.current.setTitleSectionHeight(40);
    });

    act(() => {
      (
        result.current.onScroll as (event: {
          contentOffset: { y: number };
        }) => void
      )({ contentOffset: { y: 40 } });
    });

    expect(onCompactTitleVisibilityChange).toHaveBeenCalledWith(true);
  });

  it('keeps the compact title visible until scroll drops below the hide threshold', () => {
    const onCompactTitleVisibilityChange = jest.fn();
    const { result } = renderHook(() =>
      useRewardsDashboardHeaderScroll({ onCompactTitleVisibilityChange }),
    );

    act(() => {
      result.current.setTitleSectionHeight(40);
    });

    const onScroll = result.current.onScroll as (event: {
      contentOffset: { y: number };
    }) => void;

    act(() => {
      onScroll({ contentOffset: { y: 40 } });
    });
    onCompactTitleVisibilityChange.mockClear();

    // Still above hide threshold (0.35 * 40 = 14) — should not hide.
    act(() => {
      onScroll({ contentOffset: { y: 20 } });
    });

    expect(onCompactTitleVisibilityChange).not.toHaveBeenCalled();
  });

  it('hides the compact title when scrolled back below the hide threshold', () => {
    const onCompactTitleVisibilityChange = jest.fn();
    const { result } = renderHook(() =>
      useRewardsDashboardHeaderScroll({ onCompactTitleVisibilityChange }),
    );

    act(() => {
      result.current.setTitleSectionHeight(40);
    });

    const onScroll = result.current.onScroll as (event: {
      contentOffset: { y: number };
    }) => void;

    act(() => {
      onScroll({ contentOffset: { y: 50 } });
    });
    act(() => {
      onScroll({ contentOffset: { y: 0 } });
    });

    expect(onCompactTitleVisibilityChange).toHaveBeenLastCalledWith(false);
  });

  it('does not re-notify when compact title visibility is unchanged', () => {
    const onCompactTitleVisibilityChange = jest.fn();
    const { result } = renderHook(() =>
      useRewardsDashboardHeaderScroll({ onCompactTitleVisibilityChange }),
    );

    act(() => {
      result.current.setTitleSectionHeight(40);
    });

    const onScroll = result.current.onScroll as (event: {
      contentOffset: { y: number };
    }) => void;

    act(() => {
      onScroll({ contentOffset: { y: 50 } });
      onScroll({ contentOffset: { y: 60 } });
    });

    expect(onCompactTitleVisibilityChange).toHaveBeenCalledTimes(1);
    expect(onCompactTitleVisibilityChange).toHaveBeenCalledWith(true);
  });
});
