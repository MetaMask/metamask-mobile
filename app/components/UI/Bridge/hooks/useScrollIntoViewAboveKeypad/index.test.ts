import { act, renderHook } from '@testing-library/react-native';
import type {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
} from 'react-native';
import {
  KEYPAD_TARGET_MARGIN,
  useScrollIntoViewAboveKeypad,
  type MeasureInWindow,
} from './index';

const SCROLL_VIEW_TOP = 100;

const createLayoutEvent = (layout: { y?: number; height?: number }) =>
  ({
    nativeEvent: { layout: { x: 0, y: 0, width: 0, height: 0, ...layout } },
  }) as LayoutChangeEvent;

const createScrollEvent = (y: number) =>
  ({
    nativeEvent: { contentOffset: { x: 0, y } },
  }) as NativeSyntheticEvent<NativeScrollEvent>;

const setup = ({
  isTargetActive = true,
  targetTop = 0,
  targetHeight = 32,
}: {
  isTargetActive?: boolean;
  targetTop?: number;
  targetHeight?: number;
} = {}) => {
  const scrollTo = jest.fn();
  const scrollViewRef = {
    current: {
      scrollTo,
      getNativeScrollRef: () => ({
        measureInWindow: (callback: (x: number, y: number) => void) =>
          callback(0, SCROLL_VIEW_TOP),
      }),
    } as unknown as ScrollView,
  };
  const measureTarget = jest.fn<void, Parameters<MeasureInWindow>>((callback) =>
    callback(0, targetTop, 80, targetHeight),
  );

  const hook = renderHook(
    (props: { isTargetActive: boolean }) =>
      useScrollIntoViewAboveKeypad({
        isTargetActive: props.isTargetActive,
        scrollViewRef,
        measureTarget,
      }),
    { initialProps: { isTargetActive } },
  );

  return { ...hook, scrollTo, measureTarget };
};

describe('useScrollIntoViewAboveKeypad', () => {
  it('scrolls by the hidden height when the keypad covers the target', () => {
    // The target starts exactly at the keypad's top edge, so all of its height
    // plus the margin is hidden.
    const { result, scrollTo } = setup({ targetTop: SCROLL_VIEW_TOP + 100 });

    act(() => {
      result.current.keypadLayoutProps.onLayout(createLayoutEvent({ y: 100 }));
    });

    expect(scrollTo).toHaveBeenCalledWith({
      y: 32 + KEYPAD_TARGET_MARGIN,
      animated: true,
    });
  });

  it('adds the current scroll offset to the distance scrolled', () => {
    const { result, scrollTo } = setup({ targetTop: SCROLL_VIEW_TOP + 100 });

    act(() => {
      result.current.onScroll(createScrollEvent(50));
      result.current.keypadLayoutProps.onLayout(createLayoutEvent({ y: 100 }));
    });

    expect(scrollTo).toHaveBeenCalledWith({
      y: 50 + 32 + KEYPAD_TARGET_MARGIN,
      animated: true,
    });
  });

  it('does not scroll when the target is already above the keypad', () => {
    const { result, scrollTo } = setup({ targetTop: SCROLL_VIEW_TOP + 10 });

    act(() => {
      result.current.keypadLayoutProps.onLayout(createLayoutEvent({ y: 500 }));
    });

    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('does not scroll when the target is not the active field', () => {
    const { result, scrollTo, measureTarget } = setup({
      isTargetActive: false,
      targetTop: SCROLL_VIEW_TOP + 100,
    });

    act(() => {
      result.current.keypadLayoutProps.onLayout(createLayoutEvent({ y: 100 }));
    });

    expect(measureTarget).not.toHaveBeenCalled();
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('does not scroll before the keypad has been laid out', () => {
    const { scrollTo, measureTarget } = setup({
      targetTop: SCROLL_VIEW_TOP + 100,
    });

    expect(measureTarget).not.toHaveBeenCalled();
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('scrolls once the target becomes active while the keypad is already open', () => {
    const { result, rerender, scrollTo } = setup({
      isTargetActive: false,
      targetTop: SCROLL_VIEW_TOP + 100,
    });

    act(() => {
      result.current.keypadLayoutProps.onLayout(createLayoutEvent({ y: 100 }));
    });
    expect(scrollTo).not.toHaveBeenCalled();

    rerender({ isTargetActive: true });

    expect(scrollTo).toHaveBeenCalledTimes(1);
  });

  it('scrolls again when the keypad reopens at the same position', () => {
    const { result, scrollTo } = setup({ targetTop: SCROLL_VIEW_TOP + 100 });

    act(() => {
      result.current.keypadLayoutProps.onLayout(createLayoutEvent({ y: 100 }));
    });
    act(() => {
      result.current.keypadLayoutProps.onClose();
    });
    act(() => {
      result.current.keypadLayoutProps.onLayout(createLayoutEvent({ y: 100 }));
    });

    expect(scrollTo).toHaveBeenCalledTimes(2);
  });

  describe('content size', () => {
    it('waits for the content to grow by the keypad overlap before scrolling', () => {
      const { result, scrollTo } = setup({ targetTop: SCROLL_VIEW_TOP + 500 });

      act(() => {
        result.current.onScrollViewLayout(createLayoutEvent({ height: 600 }));
        result.current.onContentSizeChange(0, 700);
      });
      act(() => {
        result.current.keypadLayoutProps.onLayout(
          createLayoutEvent({ y: 350 }),
        );
      });

      // The padding is rendered but the native content has not grown yet.
      expect(result.current.keypadOverlap).toBe(250);
      expect(scrollTo).not.toHaveBeenCalled();

      act(() => {
        result.current.onContentSizeChange(0, 950);
      });

      expect(scrollTo).toHaveBeenCalledTimes(1);
    });

    it('scrolls straight away when no padding is needed', () => {
      const { result, scrollTo } = setup({ targetTop: SCROLL_VIEW_TOP + 640 });

      act(() => {
        result.current.onScrollViewLayout(createLayoutEvent({ height: 600 }));
        result.current.onContentSizeChange(0, 700);
      });
      // The keypad starts below the scroll view, so no padding is added.
      act(() => {
        result.current.keypadLayoutProps.onLayout(
          createLayoutEvent({ y: 650 }),
        );
      });

      expect(result.current.keypadOverlap).toBe(0);
      expect(scrollTo).toHaveBeenCalledTimes(1);
    });

    it('measures a new baseline once the keypad closes', () => {
      const { result, scrollTo } = setup({ targetTop: SCROLL_VIEW_TOP + 500 });

      act(() => {
        result.current.onScrollViewLayout(createLayoutEvent({ height: 600 }));
        result.current.onContentSizeChange(0, 700);
      });
      act(() => {
        result.current.keypadLayoutProps.onLayout(
          createLayoutEvent({ y: 350 }),
        );
      });
      act(() => {
        result.current.onContentSizeChange(0, 950);
      });
      act(() => {
        result.current.keypadLayoutProps.onClose();
      });
      act(() => {
        result.current.onContentSizeChange(0, 800);
      });
      scrollTo.mockClear();
      act(() => {
        result.current.keypadLayoutProps.onLayout(
          createLayoutEvent({ y: 350 }),
        );
      });

      expect(scrollTo).not.toHaveBeenCalled();

      act(() => {
        result.current.onContentSizeChange(0, 1050);
      });

      expect(scrollTo).toHaveBeenCalledTimes(1);
    });
  });

  describe('keypadOverlap', () => {
    it('is zero while the keypad is closed', () => {
      const { result } = setup();

      act(() => {
        result.current.onScrollViewLayout(createLayoutEvent({ height: 600 }));
      });

      expect(result.current.keypadOverlap).toBe(0);
    });

    it('is the height of the scroll view covered by the keypad', () => {
      const { result } = setup({ isTargetActive: false });

      act(() => {
        result.current.onScrollViewLayout(createLayoutEvent({ height: 600 }));
        result.current.keypadLayoutProps.onLayout(
          createLayoutEvent({ y: 350 }),
        );
      });

      expect(result.current.keypadOverlap).toBe(250);
    });

    it('is zero when the keypad only covers the footer', () => {
      const { result } = setup({ isTargetActive: false });

      act(() => {
        result.current.onScrollViewLayout(createLayoutEvent({ height: 600 }));
        result.current.keypadLayoutProps.onLayout(
          createLayoutEvent({ y: 650 }),
        );
      });

      expect(result.current.keypadOverlap).toBe(0);
    });

    it('resets to zero when the keypad closes', () => {
      const { result } = setup({ isTargetActive: false });

      act(() => {
        result.current.onScrollViewLayout(createLayoutEvent({ height: 600 }));
        result.current.keypadLayoutProps.onLayout(
          createLayoutEvent({ y: 350 }),
        );
      });
      act(() => {
        result.current.keypadLayoutProps.onClose();
      });

      expect(result.current.keypadOverlap).toBe(0);
    });
  });
});
