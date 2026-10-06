import { createElement, Fragment } from 'react';
import {
  act,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { AccessibilityInfo, AppState, type AppStateStatus } from 'react-native';
import Animated, {
  cancelAnimation,
  getAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { CARD_EDGE_WIDTH, useCardAnimation } from './useCardAnimation';

jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual('react-native-reanimated');
  return {
    __esModule: true,
    ...actual,
    withTiming: jest.fn((value: number) => value),
    withSequence: jest.fn(() => 0),
    withDelay: jest.fn(() => 0),
    withRepeat: jest.fn(() => 0),
    cancelAnimation: jest.fn(actual.cancelAnimation),
  };
});

const OPTIONS = {
  isActive: true,
  canFlip: true,
  width: 260,
  resetKey: 'card-1',
};
const INITIAL_APP_STATE = AppState.currentState;
const renderStyles = (animation: ReturnType<typeof useCardAnimation>) =>
  render(
    createElement(
      Fragment,
      null,
      createElement(Animated.View, {
        testID: 'card-front',
        style: animation.frontStyle,
      }),
      createElement(Animated.View, {
        testID: 'card-edge',
        style: animation.edgeStyle,
      }),
      createElement(Animated.View, {
        testID: 'card-glare',
        style: animation.glareStyle,
      }),
    ),
  );

const edgeScaleX = (edge: ReturnType<typeof screen.getByTestId>) => {
  const { transform } = getAnimatedStyle(edge);
  if (!transform || typeof transform === 'string') {
    throw new Error('Expected the edge transform');
  }
  return Number(transform.find((entry) => 'scaleX' in entry)?.scaleX);
};

describe('useCardAnimation', () => {
  let changeAppState: (state: AppStateStatus) => void;
  let changeReduceMotion: (value: boolean) => void;
  const removeAppListener = jest.fn();
  const removeMotionListener = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    AppState.currentState = 'active';
    jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(false);
    jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_, listener) => {
        changeAppState = listener;
        return { remove: removeAppListener };
      });
    jest
      .spyOn(AccessibilityInfo, 'addEventListener')
      .mockImplementation((_, listener) => {
        changeReduceMotion = listener as unknown as (value: boolean) => void;
        return { remove: removeMotionListener } as unknown as ReturnType<
          typeof AccessibilityInfo.addEventListener
        >;
      });
  });

  afterEach(() => {
    AppState.currentState = INITIAL_APP_STATE;
    jest.restoreAllMocks();
  });

  it('keeps reduced-motion users free of decorative loops and flips instantly', async () => {
    jest
      .mocked(AccessibilityInfo.isReduceMotionEnabled)
      .mockResolvedValue(true);
    const { result } = renderHook(() => useCardAnimation(OPTIONS));

    await act(async () => result.current.flipCard());

    expect(result.current.isFlipped).toBe(true);
    expect(withRepeat).not.toHaveBeenCalled();
    expect(withTiming).toHaveBeenLastCalledWith(
      180,
      expect.objectContaining({ duration: 0 }),
    );
  });

  it('settles the emerging card face and edge without leaving an idle tilt', async () => {
    const { result } = renderHook(() => {
      const revealProgress = useSharedValue(0.34);
      return {
        revealProgress,
        ...useCardAnimation({
          ...OPTIONS,
          isActive: false,
          revealProgress,
        }),
      };
    });
    renderStyles(result.current);
    const front = screen.getByTestId('card-front');
    const edge = screen.getByTestId('card-edge');
    await waitFor(() =>
      expect(getAnimatedStyle(edge).opacity).toBeGreaterThan(0),
    );

    act(() => {
      result.current.revealProgress.value = 1;
    });

    await waitFor(() => {
      expect(getAnimatedStyle(front).transform).toEqual(
        expect.arrayContaining([{ rotateY: '0deg' }]),
      );
      expect(getAnimatedStyle(front).opacity).toBe(1);
      expect(getAnimatedStyle(edge).opacity).toBe(0);
      expect(getAnimatedStyle(edge).transform).toEqual(
        expect.arrayContaining([{ scaleY: 1 }]),
      );
    });
    expect(withRepeat).not.toHaveBeenCalled();
  });

  it('scales the slab edge around a fixed layout width instead of resizing it', async () => {
    const { result } = renderHook(() => {
      const revealProgress = useSharedValue(0.34);
      return {
        revealProgress,
        ...useCardAnimation({ ...OPTIONS, isActive: false, revealProgress }),
      };
    });
    renderStyles(result.current);
    const edge = screen.getByTestId('card-edge');
    await waitFor(() =>
      expect(getAnimatedStyle(edge).opacity).toBeGreaterThan(0),
    );
    const tiltedScale = edgeScaleX(edge);

    act(() => {
      result.current.revealProgress.value = 1;
    });

    await waitFor(() =>
      expect(edgeScaleX(edge)).toBeCloseTo(0.5 / CARD_EDGE_WIDTH),
    );
    expect(tiltedScale).toBeGreaterThan(0.5 / CARD_EDGE_WIDTH);
    expect(tiltedScale).toBeLessThanOrEqual(1);
    expect(getAnimatedStyle(edge)).not.toHaveProperty('width');
  });

  it('sweeps the card reflection only near the end of its extraction', async () => {
    const { result } = renderHook(() => {
      const revealProgress = useSharedValue(0.5);
      return {
        revealProgress,
        ...useCardAnimation({ ...OPTIONS, isActive: false, revealProgress }),
      };
    });
    renderStyles(result.current);
    const glare = screen.getByTestId('card-glare');
    await act(async () => undefined);
    expect(getAnimatedStyle(glare).opacity).toBe(0);

    act(() => {
      result.current.revealProgress.value = 0.85;
    });

    await waitFor(() =>
      expect(getAnimatedStyle(glare).opacity).toBeGreaterThan(0),
    );
    act(() => {
      result.current.revealProgress.value = 0.99;
    });
    await waitFor(() => expect(getAnimatedStyle(glare).opacity).toBe(0));
  });

  it('suppresses the reveal tilt and reflection when motion is reduced', async () => {
    jest
      .mocked(AccessibilityInfo.isReduceMotionEnabled)
      .mockResolvedValue(true);
    const { result } = renderHook(() => {
      const revealProgress = useSharedValue(0.85);
      return useCardAnimation({ ...OPTIONS, isActive: false, revealProgress });
    });
    renderStyles(result.current);

    await act(async () => undefined);

    expect(
      getAnimatedStyle(screen.getByTestId('card-front')).transform,
    ).toEqual(expect.arrayContaining([{ rotateY: '0deg' }]));
    expect(getAnimatedStyle(screen.getByTestId('card-edge')).opacity).toBe(0);
    expect(getAnimatedStyle(screen.getByTestId('card-glare')).opacity).toBe(0);
    expect(withRepeat).not.toHaveBeenCalled();
  });

  it('stops its active loops when reduced motion is enabled', async () => {
    renderHook(() => useCardAnimation(OPTIONS));
    await waitFor(() => expect(withRepeat).toHaveBeenCalled());
    jest.mocked(cancelAnimation).mockClear();
    jest.mocked(withRepeat).mockClear();

    act(() => changeReduceMotion(true));

    expect(cancelAnimation).toHaveBeenCalled();
    expect(withRepeat).not.toHaveBeenCalled();
  });

  it('cancels motion in the background and releases listeners on unmount', async () => {
    const { unmount } = renderHook(() => useCardAnimation(OPTIONS));
    await waitFor(() => expect(withRepeat).toHaveBeenCalled());
    jest.mocked(cancelAnimation).mockClear();
    jest.mocked(withRepeat).mockClear();

    act(() => changeAppState('background'));

    expect(cancelAnimation).toHaveBeenCalled();
    expect(withRepeat).not.toHaveBeenCalled();

    act(() => changeAppState('active'));
    expect(withRepeat).toHaveBeenCalled();
    jest.mocked(cancelAnimation).mockClear();
    unmount();
    expect(cancelAnimation).toHaveBeenCalled();
    expect(removeAppListener).toHaveBeenCalledTimes(1);
    expect(removeMotionListener).toHaveBeenCalledTimes(1);
  });
});
