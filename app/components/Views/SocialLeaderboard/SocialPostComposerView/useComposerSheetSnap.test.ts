import { act, renderHook } from '@testing-library/react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { getHardwareTier } from '../../../../util/deviceCapability';
import { useComposerSheetSnap } from './useComposerSheetSnap';

interface Pan {
  onStart: () => void;
  onUpdate: (e: { translationY: number }) => void;
  onEnd: (e: { translationY: number; velocityY: number }) => void;
}
const pans: Pan[] = [];

jest.mock('../../../../hooks/useNetworkTier', () => ({
  useNetworkTier: () => null,
}));
jest.mock('../../../../util/deviceCapability', () => ({
  getHardwareTier: jest.fn(() => null),
}));
jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual('react-native-reanimated'),
  useReducedMotion: jest.fn(() => false),
  cancelAnimation: jest.fn(),
  useAnimatedStyle: (fn: () => object) => fn(),
  withTiming: (to: number, _c: unknown, done?: (ok?: boolean) => void) => {
    done?.(true);
    return to;
  },
}));
jest.mock('react-native-gesture-handler', () => ({
  Gesture: {
    Pan: () => {
      const pan = {} as Pan;
      const api = {
        activeOffsetY: () => api,
        onStart: (fn: Pan['onStart']) => {
          pan.onStart = fn;
          return api;
        },
        onUpdate: (fn: Pan['onUpdate']) => {
          pan.onUpdate = fn;
          return api;
        },
        onEnd: (fn: Pan['onEnd']) => {
          pan.onEnd = fn;
          return api;
        },
      };
      pans.push(pan);
      return api;
    },
  },
}));

const motion = jest.mocked(useReducedMotion);
const hardware = jest.mocked(getHardwareTier);

describe('useComposerSheetSnap', () => {
  it('snaps between heights and dismisses from the default', async () => {
    motion.mockReturnValue(false);
    hardware.mockReturnValue(null);
    pans.length = 0;
    const onDismiss = jest.fn();
    const { result, rerender } = renderHook(
      ({ h }: { h: number }) => useComposerSheetSnap(h, onDismiss),
      { initialProps: { h: 0 } },
    );
    expect(result.current.sheetStyle).toEqual({});
    rerender({ h: 400 });
    rerender({ h: 450 });
    const pan = pans[0];
    const drag = (y: number, v = 0) => {
      pan.onStart();
      pan.onUpdate({ translationY: y });
      pan.onEnd({ translationY: y, velocityY: v });
    };
    await act(async () => {
      drag(-20);
      pan.onStart();
      pan.onUpdate({ translationY: 40 });
    });
    rerender({ h: 460 });
    await act(async () => {
      pan.onEnd({ translationY: 40, velocityY: 0 });
      drag(-800);
      drag(800);
      drag(800, 900);
      drag(0);
    });
    hardware.mockReturnValue('LOW');
    motion.mockReturnValue(true);
    rerender({ h: 280 });
    await act(async () => {
      drag(-800);
      drag(800);
      drag(800, 900);
    });
    expect(onDismiss).toHaveBeenCalled();
  });
});
