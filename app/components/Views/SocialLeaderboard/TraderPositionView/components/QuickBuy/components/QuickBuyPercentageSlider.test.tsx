import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { QuickBuyPercentageSlider } from './QuickBuyPercentageSlider';
import { playImpact, ImpactMoment } from '../../../../../../../util/haptics';

// Capture gesture handlers so tests can invoke them directly. We re-assign
// these in beforeEach via the mock factory below.
let tapOnEnd: ((event: { x: number }) => void) | undefined;
let panOnStart: (() => void) | undefined;
let panOnUpdate: ((event: { x: number }) => void) | undefined;
let panOnEnd: ((event: { x: number }) => void) | undefined;

jest.mock('react-native-gesture-handler', () => {
  const { View } = jest.requireActual('react-native');
  return {
    GestureHandlerRootView: View,
    GestureDetector: ({ children }: { children: React.ReactNode }) => children,
    Gesture: {
      Tap: () => ({
        onEnd: (cb: (event: { x: number }) => void) => {
          tapOnEnd = cb;
          return { onEnd: jest.fn() };
        },
      }),
      Pan: () => {
        const panBuilder = {
          onStart: (cb: () => void) => {
            panOnStart = cb;
            return panBuilder;
          },
          onUpdate: (cb: (event: { x: number }) => void) => {
            panOnUpdate = cb;
            return panBuilder;
          },
          onEnd: (cb: (event: { x: number }) => void) => {
            panOnEnd = cb;
            return panBuilder;
          },
        };
        return panBuilder;
      },
      Simultaneous: jest.fn(),
    },
  };
});

jest.mock('react-native-reanimated', () => {
  const ActualReact = jest.requireActual('react') as typeof import('react');
  const Reanimated = jest.requireActual(
    'react-native-reanimated/mock',
  ) as Record<string, unknown>;
  return {
    ...Reanimated,
    runOnJS:
      <Args extends unknown[], Ret>(fn: (...args: Args) => Ret) =>
      (...args: Args) =>
        fn(...args),
    // Stable across renders so mutations made inside onLayout survive.
    useSharedValue: (initial: number) =>
      ActualReact.useRef({ value: initial }).current,
    useAnimatedStyle: (fn: () => Record<string, unknown>) => fn(),
  };
});

jest.mock('../../../../../../../util/haptics', () => ({
  playImpact: jest.fn(),
  ImpactMoment: { SliderTick: 'sliderTick', SliderGrip: 'sliderGrip' },
}));

const SLIDER_WIDTH = 200;

function triggerLayout(testID = 'quick-buy-percentage-slider') {
  // The inner Animated.View has onLayout — walk the rendered tree to find it.
  const root = screen.getByTestId(testID);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const findWithOnLayout = (node: any): any => {
    if (node?.props?.onLayout) return node;
    for (const child of node?.children ?? []) {
      const match = findWithOnLayout(child);
      if (match) return match;
    }
    return null;
  };
  const layoutTarget = findWithOnLayout(root);
  if (!layoutTarget) {
    throw new Error('No element with onLayout found inside slider');
  }
  fireEvent(layoutTarget, 'layout', {
    nativeEvent: { layout: { width: SLIDER_WIDTH, height: 24 } },
  });
}

describe('QuickBuyPercentageSlider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    tapOnEnd = undefined;
    panOnStart = undefined;
    panOnUpdate = undefined;
    panOnEnd = undefined;
  });

  describe('drag behavior', () => {
    it('calls onValueChange on every pan update but onDragEnd only once on release', () => {
      const onValueChange = jest.fn();
      const onDragEnd = jest.fn();

      render(
        <QuickBuyPercentageSlider
          value={0}
          onValueChange={onValueChange}
          onDragEnd={onDragEnd}
        />,
      );
      act(() => triggerLayout());

      // Simulate a drag from 0 to ~50% (x=100 of 200) to ~75% (x=150).
      act(() => panOnUpdate?.({ x: 50 })); // 25%
      act(() => panOnUpdate?.({ x: 100 })); // 50%
      act(() => panOnUpdate?.({ x: 150 })); // 75%
      act(() => panOnEnd?.({ x: 150 })); // release at 75%

      expect(onValueChange).toHaveBeenCalledTimes(3);
      expect(onValueChange).toHaveBeenNthCalledWith(1, 25);
      expect(onValueChange).toHaveBeenNthCalledWith(2, 50);
      expect(onValueChange).toHaveBeenNthCalledWith(3, 75);
      expect(onDragEnd).toHaveBeenCalledTimes(1);
      expect(onDragEnd).toHaveBeenCalledWith(75);
    });

    it('clamps drag positions to [0, 100]', () => {
      const onValueChange = jest.fn();
      const onDragEnd = jest.fn();

      render(
        <QuickBuyPercentageSlider
          value={50}
          onValueChange={onValueChange}
          onDragEnd={onDragEnd}
        />,
      );
      act(() => triggerLayout());

      act(() => panOnUpdate?.({ x: -50 }));
      act(() => panOnUpdate?.({ x: 500 }));
      act(() => panOnEnd?.({ x: 500 }));

      expect(onValueChange).toHaveBeenNthCalledWith(1, 0);
      expect(onValueChange).toHaveBeenNthCalledWith(2, 100);
      expect(onDragEnd).toHaveBeenCalledWith(100);
    });

    it('does not call onValueChange when value is unchanged', () => {
      const onValueChange = jest.fn();

      render(
        <QuickBuyPercentageSlider
          value={50}
          onValueChange={onValueChange}
          onDragEnd={jest.fn()}
        />,
      );
      act(() => triggerLayout());

      // x=100 → 50% → matches current value, should not fire onValueChange.
      act(() => panOnUpdate?.({ x: 100 }));

      expect(onValueChange).not.toHaveBeenCalled();
    });

    it('ignores all gestures when disabled', () => {
      const onValueChange = jest.fn();
      const onDragEnd = jest.fn();

      render(
        <QuickBuyPercentageSlider
          value={0}
          onValueChange={onValueChange}
          onDragEnd={onDragEnd}
          disabled
        />,
      );
      act(() => triggerLayout());

      act(() => panOnUpdate?.({ x: 100 }));
      act(() => panOnEnd?.({ x: 100 }));
      act(() => tapOnEnd?.({ x: 100 }));

      expect(onValueChange).not.toHaveBeenCalled();
      expect(onDragEnd).not.toHaveBeenCalled();
    });
  });

  describe('tap behavior', () => {
    it('updates display and commits in one call when the user taps the track', () => {
      const onValueChange = jest.fn();
      const onDragEnd = jest.fn();

      render(
        <QuickBuyPercentageSlider
          value={0}
          onValueChange={onValueChange}
          onDragEnd={onDragEnd}
        />,
      );
      act(() => triggerLayout());

      act(() => tapOnEnd?.({ x: 100 })); // 50%

      expect(onValueChange).toHaveBeenCalledWith(50);
      expect(onDragEnd).toHaveBeenCalledWith(50);
    });
  });

  describe('onDragEnd fallback', () => {
    it('when onDragEnd is omitted, onValueChange is the only callback and is not called again on pan release', () => {
      const onValueChange = jest.fn();

      render(
        <QuickBuyPercentageSlider value={0} onValueChange={onValueChange} />,
      );
      act(() => triggerLayout());

      // Drag to 50% then release.  onValueChange fires once per update tick
      // but commitFromPosition skips when onDragEnd is absent — no double-call.
      act(() => panOnUpdate?.({ x: 100 })); // 50%
      act(() => panOnEnd?.({ x: 100 }));

      expect(onValueChange).toHaveBeenCalledTimes(1);
      expect(onValueChange).toHaveBeenCalledWith(50);
    });
  });

  describe('haptic threshold crossings', () => {
    it('fires haptics when crossing 25%, 50%, and 75% during drag', () => {
      render(
        <QuickBuyPercentageSlider
          value={0}
          onValueChange={jest.fn()}
          onDragEnd={jest.fn()}
        />,
      );
      act(() => triggerLayout());

      act(() => panOnUpdate?.({ x: 20 })); // 10% — no crossing
      expect(playImpact).not.toHaveBeenCalled();

      act(() => panOnUpdate?.({ x: 60 })); // 30% — crosses 25
      expect(playImpact).toHaveBeenLastCalledWith(ImpactMoment.SliderTick);

      act(() => panOnUpdate?.({ x: 110 })); // 55% — crosses 50
      act(() => panOnUpdate?.({ x: 160 })); // 80% — crosses 75
      expect(playImpact).toHaveBeenCalledTimes(3);
    });

    it('fires haptics on reverse crossings as well', () => {
      render(
        <QuickBuyPercentageSlider
          value={100}
          onValueChange={jest.fn()}
          onDragEnd={jest.fn()}
        />,
      );
      act(() => triggerLayout());

      act(() => panOnUpdate?.({ x: 140 })); // 70% — crosses 75 going down
      expect(playImpact).toHaveBeenCalledTimes(1);
    });

    it('does not fire haptics between threshold values', () => {
      render(
        <QuickBuyPercentageSlider
          value={30}
          onValueChange={jest.fn()}
          onDragEnd={jest.fn()}
        />,
      );
      act(() => triggerLayout());

      // Move within (25, 50) — no threshold crossed.
      act(() => panOnUpdate?.({ x: 70 })); // 35%
      act(() => panOnUpdate?.({ x: 90 })); // 45%

      expect(playImpact).not.toHaveBeenCalled();
    });
  });

  describe('grip haptics', () => {
    it('fires a grip haptic when the drag starts and again when it ends', () => {
      render(
        <QuickBuyPercentageSlider
          value={0}
          onValueChange={jest.fn()}
          onDragEnd={jest.fn()}
        />,
      );
      act(() => triggerLayout());

      act(() => panOnStart?.());
      expect(playImpact).toHaveBeenCalledTimes(1);
      expect(playImpact).toHaveBeenLastCalledWith(ImpactMoment.SliderGrip);

      act(() => panOnEnd?.({ x: 100 }));
      expect(playImpact).toHaveBeenLastCalledWith(ImpactMoment.SliderGrip);
      expect(playImpact).toHaveBeenCalledTimes(2);
    });

    it('does not fire grip haptics when disabled', () => {
      render(
        <QuickBuyPercentageSlider
          value={0}
          onValueChange={jest.fn()}
          onDragEnd={jest.fn()}
          disabled
        />,
      );
      act(() => triggerLayout());

      act(() => panOnStart?.());
      act(() => panOnEnd?.({ x: 100 }));

      expect(playImpact).not.toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('exposes the current value via accessibilityValue', () => {
      render(
        <QuickBuyPercentageSlider
          value={42}
          onValueChange={jest.fn()}
          onDragEnd={jest.fn()}
        />,
      );

      const slider = screen.getByTestId('quick-buy-percentage-slider');
      expect(slider.props.accessibilityValue).toEqual({
        min: 0,
        max: 100,
        now: 42,
        text: '42%',
      });
    });

    it('steps by 1% on increment and commits via onDragEnd', () => {
      const onValueChange = jest.fn();
      const onDragEnd = jest.fn();

      render(
        <QuickBuyPercentageSlider
          value={50}
          onValueChange={onValueChange}
          onDragEnd={onDragEnd}
        />,
      );

      const slider = screen.getByTestId('quick-buy-percentage-slider');
      act(() =>
        slider.props.onAccessibilityAction({
          nativeEvent: { actionName: 'increment' },
        }),
      );

      expect(onValueChange).toHaveBeenCalledWith(51);
      expect(onDragEnd).toHaveBeenCalledWith(51);
    });

    it('steps by 1% on decrement and clamps at 0', () => {
      const onValueChange = jest.fn();

      const { rerender } = render(
        <QuickBuyPercentageSlider
          value={1}
          onValueChange={onValueChange}
          onDragEnd={jest.fn()}
        />,
      );

      const slider = screen.getByTestId('quick-buy-percentage-slider');
      act(() =>
        slider.props.onAccessibilityAction({
          nativeEvent: { actionName: 'decrement' },
        }),
      );

      expect(onValueChange).toHaveBeenCalledWith(0);

      rerender(
        <QuickBuyPercentageSlider
          value={0}
          onValueChange={onValueChange}
          onDragEnd={jest.fn()}
        />,
      );
      onValueChange.mockClear();

      act(() =>
        screen
          .getByTestId('quick-buy-percentage-slider')
          .props.onAccessibilityAction({
            nativeEvent: { actionName: 'decrement' },
          }),
      );

      // Already at 0, no change → no callback.
      expect(onValueChange).not.toHaveBeenCalled();
    });
  });
});
