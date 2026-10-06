import React, { useEffect } from 'react';
import { scheduleOnRN } from 'react-native-worklets';
import { AccessibilityInfo, AppState, type AppStateStatus } from 'react-native';
import {
  act,
  fireEvent,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { Box } from '@metamask/design-system-react-native';
import {
  PointerType,
  State,
  type PanGesture,
  type GestureStateChangeEvent,
  type PanGestureHandlerEventPayload,
} from 'react-native-gesture-handler';
import {
  fireGestureHandler,
  getByGestureTestId,
} from 'react-native-gesture-handler/jest-utils';
import {
  cancelAnimation,
  getAnimatedStyle,
  useAnimatedReaction,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { strings } from '../../../../../../locales/i18n';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { ImpactMoment, useHaptics } from '../../../../../util/haptics';
import PackReveal from './PackReveal';
import { PackRevealSelectorsIDs } from './PackReveal.testIds';
import { usePackRevealAnimation } from './usePackRevealAnimation';
import { REVEAL_DURATION } from './PackReveal.constants';
import { getPackLayout } from './PackReveal.pack';

jest.mock('react-native-linear-gradient', () => 'LinearGradient');
jest.mock('./usePackRevealAnimation', () => {
  const actual = jest.requireActual('./usePackRevealAnimation');
  return {
    usePackRevealAnimation: jest.fn(actual.usePackRevealAnimation),
  };
});
jest.mock('../../../../../util/haptics', () => ({
  ...jest.requireActual('../../../../../util/haptics'),
  useHaptics: jest.fn(),
}));
jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual('react-native-reanimated');
  return {
    __esModule: true,
    ...actual,
    useAnimatedReaction: jest.fn(),
    withTiming: jest.fn((value: number) => value),
    withRepeat: jest.fn(() => 0),
    cancelAnimation: jest.fn(actual.cancelAnimation),
  };
});

const PACK = { packImage: 1, packName: 'Pokémon Ember' };
const CHILD_ID = 'pack-reveal-test-child';
const INITIAL_APP_STATE = AppState.currentState;
const playImpact = jest.fn<
  Promise<void>,
  [Parameters<ReturnType<typeof useHaptics>['playImpact']>[0]]
>();
const getPan = () =>
  getByGestureTestId(PackRevealSelectorsIDs.CUT_GESTURE) as PanGesture;
const panEvent = (
  x: number,
): GestureStateChangeEvent<PanGestureHandlerEventPayload> => ({
  handlerTag: 1,
  state: State.ACTIVE,
  oldState: State.BEGAN,
  pointerType: PointerType.TOUCH,
  numberOfPointers: 1,
  x,
  y: 0,
  absoluteX: x,
  absoluteY: 0,
  translationX: x,
  translationY: 0,
  velocityX: 0,
  velocityY: 0,
});
const advanceOpening = (
  animation: ReturnType<typeof usePackRevealAnimation>,
  elapsed: number,
) => {
  const reaction = jest.mocked(useAnimatedReaction).mock.calls.at(-1);
  if (!reaction) throw new Error('Expected the opening animation reaction');
  const [prepare, react] = reaction;
  const previous = prepare();
  animation.progress.value = elapsed / REVEAL_DURATION;
  react(prepare(), previous);
};
const openingAnimation = () => {
  const onRevealed = jest.fn();
  return renderHook(
    ({ isActive }) =>
      usePackRevealAnimation({
        isActive,
        onRevealed,
        sealWidth: 320,
        rarity: 'epic',
      }),
    { initialProps: { isActive: true } },
  );
};
const startOpening = (animation: ReturnType<typeof usePackRevealAnimation>) => {
  act(() => animation.reveal());
  // The timing mock jumps to its target; subsequent frames are driven explicitly.
  animation.progress.value = 0;
  playImpact.mockClear();
};

// Narrow presentation contract: animation callbacks, native gestures and accessibility.
// Provider transactions and navigation are covered by the enclosing reveal screen.
describe('PackReveal', () => {
  let changeAppState: (state: AppStateStatus) => void;
  const removeAppListener = jest.fn();
  const removeMotionListener = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    AppState.currentState = 'active';
    playImpact.mockResolvedValue(undefined);
    jest.mocked(useHaptics).mockReturnValue({
      playImpact,
      playSelection: jest.fn(),
      playSuccessNotification: jest.fn(),
      playErrorNotification: jest.fn(),
      playWarningNotification: jest.fn(),
    });
    jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(true);
    jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_, callback) => {
        changeAppState = callback;
        return { remove: removeAppListener };
      });
    // Reuse the native preset's subscription rather than inventing a partial
    // EmitterSubscription, whose declaration includes native-only internals.
    const motionSubscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      jest.fn(),
    );
    motionSubscription.remove = removeMotionListener;
    jest
      .spyOn(AccessibilityInfo, 'addEventListener')
      .mockReturnValue(motionSubscription);
  });

  afterEach(() => {
    AppState.currentState = INITIAL_APP_STATE;
    jest.restoreAllMocks();
  });

  it('keeps the card mounted but inaccessible until revealed through the alternate button', async () => {
    const onRevealed = jest.fn();
    renderWithProvider(
      <PackReveal {...PACK} onRevealed={onRevealed}>
        <Box testID={CHILD_ID} />
      </PackReveal>,
    );
    expect(screen.queryByTestId(CHILD_ID)).not.toBeOnTheScreen();
    expect(
      screen.getByTestId(CHILD_ID, { includeHiddenElements: true }),
    ).toBeOnTheScreen();

    await act(async () =>
      fireEvent.press(screen.getByTestId(PackRevealSelectorsIDs.REVEAL_BUTTON)),
    );

    expect(onRevealed).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId(CHILD_ID)).toBeOnTheScreen();
    expect(
      screen.queryByTestId(PackRevealSelectorsIDs.PACK),
    ).not.toBeOnTheScreen();
    expect(withRepeat).not.toHaveBeenCalled();
    expect(playImpact).not.toHaveBeenCalled();
  });

  it('keeps the cut hint and the alternate action reachable by assistive technology', () => {
    renderWithProvider(
      <PackReveal {...PACK} onRevealed={jest.fn()}>
        <Box />
      </PackReveal>,
    );

    const hint = screen.getByText(strings('gacha.reveal.cut_hint'));
    const action = screen.getByTestId(PackRevealSelectorsIDs.REVEAL_BUTTON);

    expect(hint).toBeOnTheScreen();
    expect(action).toBeEnabled();
  });

  it('shares its reveal clock without remounting the preloaded card', async () => {
    const mounted = jest.fn();
    const unmounted = jest.fn();
    const Card = () => {
      useEffect(() => {
        mounted();
        return unmounted;
      }, []);
      return <Box testID={CHILD_ID} />;
    };
    const renderCard = jest.fn((_progress: SharedValue<number>) => <Card />);
    renderWithProvider(
      <PackReveal {...PACK} onRevealed={jest.fn()}>
        {renderCard}
      </PackReveal>,
    );
    const animation = jest.mocked(usePackRevealAnimation).mock.results.at(-1);
    if (animation?.type !== 'return')
      throw new Error('Expected the reveal animation');
    const progress = animation.value.progress;

    await act(async () =>
      fireEvent.press(screen.getByTestId(PackRevealSelectorsIDs.REVEAL_BUTTON)),
    );

    expect(renderCard.mock.calls.every(([clock]) => clock === progress)).toBe(
      true,
    );
    expect(progress.value).toBe(1);
    expect(mounted).toHaveBeenCalledTimes(1);
    expect(unmounted).not.toHaveBeenCalled();
    expect(screen.getByTestId(CHILD_ID)).toBeOnTheScreen();
  });

  it('waits for the card image before accepting either interaction', async () => {
    const onRevealed = jest.fn();
    const { rerender } = renderWithProvider(
      <PackReveal {...PACK} isReady={false} onRevealed={onRevealed}>
        <Box />
      </PackReveal>,
    );

    fireEvent.press(screen.getByTestId(PackRevealSelectorsIDs.REVEAL_BUTTON));

    expect(onRevealed).not.toHaveBeenCalled();
    expect(getPan().config.enabled).toBe(false);
    expect(
      screen.getByTestId(PackRevealSelectorsIDs.REVEAL_BUTTON),
    ).toBeDisabled();
    rerender(
      <PackReveal {...PACK} isReady onRevealed={onRevealed}>
        <Box />
      </PackReveal>,
    );
    await waitFor(() =>
      expect(
        screen.getByTestId(PackRevealSelectorsIDs.REVEAL_BUTTON),
      ).toBeEnabled(),
    );
  });

  it('rejects a cut begun at the far end of the seal', async () => {
    const onRevealed = jest.fn();
    renderWithProvider(
      <PackReveal {...PACK} onRevealed={onRevealed}>
        <Box />
      </PackReveal>,
    );
    fireEvent(screen.getByTestId(PackRevealSelectorsIDs.CONTAINER), 'layout', {
      nativeEvent: { layout: { width: 400, height: 600 } },
    });
    await waitFor(() => expect(getPan().config.enabled).toBe(true));

    await act(async () => {
      fireGestureHandler(getPan(), [
        { state: State.BEGAN, x: 360 },
        { state: State.ACTIVE, x: 360 },
        { state: State.ACTIVE, x: 390 },
        { state: State.END, x: 390 },
      ]);
    });

    expect(onRevealed).not.toHaveBeenCalled();
    expect(
      screen.getByTestId(PackRevealSelectorsIDs.CUT_PROGRESS),
    ).toHaveAnimatedStyle({
      transform: [
        {
          translateX: -getPackLayout({ width: 400, height: 600 }).sealWidth / 2,
        },
        { scaleX: 0 },
      ],
    });
  });

  it('keeps a partial cut and finishes it once when picked up near its edge', async () => {
    const onRevealed = jest.fn();
    renderWithProvider(
      <PackReveal {...PACK} onRevealed={onRevealed}>
        <Box />
      </PackReveal>,
    );
    fireEvent(screen.getByTestId(PackRevealSelectorsIDs.CONTAINER), 'layout', {
      nativeEvent: { layout: { width: 400, height: 600 } },
    });
    await waitFor(() => expect(getPan().config.enabled).toBe(true));

    await act(async () => {
      fireGestureHandler(getPan(), [
        { state: State.BEGAN, x: 5 },
        { state: State.ACTIVE, x: 5 },
        { state: State.ACTIVE, x: 150 },
        { state: State.END, x: 150 },
      ]);
    });
    expect(onRevealed).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(
        screen.getByTestId(PackRevealSelectorsIDs.CUT_PROGRESS),
      ).toHaveAnimatedStyle({
        transform: [
          {
            translateX:
              -(getPackLayout({ width: 400, height: 600 }).sealWidth - 150) / 2,
          },
          {
            scaleX: 150 / getPackLayout({ width: 400, height: 600 }).sealWidth,
          },
        ],
      }),
    );
    await act(async () => {
      fireGestureHandler(getPan(), [
        { state: State.BEGAN, x: 145 },
        { state: State.ACTIVE, x: 145 },
        { state: State.ACTIVE, x: 380 },
        { state: State.ACTIVE, x: 390 },
        { state: State.END, x: 390 },
      ]);
    });

    expect(onRevealed).toHaveBeenCalledTimes(1);
  });

  it('prevents replaying the callback after an inactive route resumes', async () => {
    const onRevealed = jest.fn();
    const { result, rerender } = renderHook(
      ({ isActive }) =>
        usePackRevealAnimation({ isActive, onRevealed, sealWidth: 300 }),
      { initialProps: { isActive: true } },
    );
    await act(async () => result.current.reveal());

    rerender({ isActive: false });
    rerender({ isActive: true });
    act(() => result.current.reveal());

    expect(onRevealed).toHaveBeenCalledTimes(1);
  });

  it('keeps the pouch moving before and during the card extraction', async () => {
    jest
      .mocked(AccessibilityInfo.isReduceMotionEnabled)
      .mockResolvedValue(false);
    renderWithProvider(
      <PackReveal {...PACK} onRevealed={jest.fn()}>
        <Box />
      </PackReveal>,
    );
    await waitFor(() => expect(withRepeat).toHaveBeenCalled());
    jest.mocked(withTiming).mockReturnValueOnce(0);
    fireEvent.press(screen.getByTestId(PackRevealSelectorsIDs.REVEAL_BUTTON));
    const animation = jest.mocked(usePackRevealAnimation).mock.results.at(-1);
    if (animation?.type !== 'return')
      throw new Error('Expected the reveal animation');
    const body = screen.getByTestId(PackRevealSelectorsIDs.BODY, {
      includeHiddenElements: true,
    });
    const card = screen.getByTestId(PackRevealSelectorsIDs.CARD, {
      includeHiddenElements: true,
    });
    const descent = () => {
      const transform = getAnimatedStyle(body).transform;
      if (!transform || typeof transform === 'string') {
        throw new Error('Expected the pouch translation');
      }
      return Number(
        transform.find((entry) => 'translateY' in entry)?.translateY,
      );
    };

    act(() => {
      animation.value.progress.value = 0.2;
    });
    await waitFor(() => {
      expect(descent()).toBeGreaterThan(0);
      expect(getAnimatedStyle(card).opacity).toBe(0);
    });
    const earlierDescent = descent();
    act(() => {
      animation.value.progress.value = 0.45;
    });

    await waitFor(() => {
      expect(descent()).toBeGreaterThan(earlierDescent);
      expect(getAnimatedStyle(body).opacity).toBeGreaterThan(0);
      expect(getAnimatedStyle(card).opacity).toBeGreaterThan(0);
    });
  });

  it('announces the result only when the opening animation finishes', async () => {
    jest
      .mocked(AccessibilityInfo.isReduceMotionEnabled)
      .mockResolvedValue(false);
    const onRevealed = jest.fn();
    const { result } = renderHook(() =>
      usePackRevealAnimation({ isActive: true, onRevealed, sealWidth: 300 }),
    );
    await waitFor(() => expect(withRepeat).toHaveBeenCalled());

    act(() => result.current.reveal());
    const completion = jest
      .mocked(withTiming)
      .mock.calls.find(
        ([, options]) => options?.duration === REVEAL_DURATION,
      )?.[2];
    await act(async () => completion?.(false));
    expect(onRevealed).not.toHaveBeenCalled();
    await act(async () => completion?.(true));

    expect(onRevealed).toHaveBeenCalledTimes(1);
    expect(result.current.phase).toBe('revealed');
  });

  it.each([false, true])(
    'paces dense cut feedback with reduced motion set to %s',
    async (reduceMotion) => {
      jest
        .mocked(AccessibilityInfo.isReduceMotionEnabled)
        .mockResolvedValue(reduceMotion);
      let now = 1000;
      jest.spyOn(Date, 'now').mockImplementation(() => now);
      const { result } = openingAnimation();
      await waitFor(() =>
        expect(result.current.reduceMotion).toBe(reduceMotion),
      );

      await act(async () =>
        result.current.cutGesture.handlers.onStart?.(panEvent(0)),
      );

      expect(playImpact).toHaveBeenCalledTimes(reduceMotion ? 0 : 1);
      for (const [delay, x] of [
        [40, 12],
        [10, 24],
        [40, 36],
      ]) {
        now += delay;
        await act(async () =>
          result.current.cutGesture.handlers.onUpdate?.(panEvent(x)),
        );
      }

      expect(playImpact).toHaveBeenCalledTimes(reduceMotion ? 0 : 3);
      if (!reduceMotion) {
        expect(playImpact).toHaveBeenLastCalledWith(ImpactMoment.GachaCut);
      }
    },
  );

  it('plays only the latest crackle when animation frames skip several beats', async () => {
    jest
      .mocked(AccessibilityInfo.isReduceMotionEnabled)
      .mockResolvedValue(false);
    let now = 1000;
    jest.spyOn(Date, 'now').mockImplementation(() => now);
    const { result } = openingAnimation();
    await waitFor(() => expect(result.current.reduceMotion).toBe(false));
    startOpening(result.current);

    await act(async () => advanceOpening(result.current, 740));
    now += 40;
    await act(async () => advanceOpening(result.current, 2600));

    expect(playImpact).toHaveBeenCalledTimes(2);
    expect(playImpact).toHaveBeenLastCalledWith(ImpactMoment.GachaRevealEpic);

    now += 40;
    await act(async () => advanceOpening(result.current, 740));

    expect(playImpact).toHaveBeenCalledTimes(2);
  });

  it('discards stale and tightly spaced crackles without replaying a backlog', async () => {
    jest
      .mocked(AccessibilityInfo.isReduceMotionEnabled)
      .mockResolvedValue(false);
    let now = 1000;
    jest.spyOn(Date, 'now').mockImplementation(() => now);
    const { result } = openingAnimation();
    await waitFor(() => expect(result.current.reduceMotion).toBe(false));
    startOpening(result.current);
    await act(async () => {
      advanceOpening(result.current, 740);
      // The official worklet mock queues this native callback as a microtask.
      now += 121;
    });

    expect(playImpact).not.toHaveBeenCalled();
    await act(async () => advanceOpening(result.current, 900));
    now += 10;
    await act(async () => advanceOpening(result.current, 1000));
    expect(playImpact).toHaveBeenCalledTimes(1);
    now += 40;
    await act(async () => advanceOpening(result.current, 740));
    await act(async () => advanceOpening(result.current, 1200));

    expect(playImpact).toHaveBeenCalledTimes(2);
  });

  it.each(['background', 'inactive route', 'unmount'] as const)(
    'drops a queued crackle after %s',
    async (lifecycle) => {
      jest
        .mocked(AccessibilityInfo.isReduceMotionEnabled)
        .mockResolvedValue(false);
      jest.spyOn(Date, 'now').mockReturnValue(1000);
      const { result, rerender, unmount } = openingAnimation();
      await waitFor(() => expect(result.current.reduceMotion).toBe(false));
      startOpening(result.current);
      act(() => advanceOpening(result.current, 740));

      if (lifecycle === 'background') act(() => changeAppState('background'));
      else if (lifecycle === 'inactive route') rerender({ isActive: false });
      else unmount();
      // Wait behind the queued RN callback before asserting it was discarded.
      await act(() => new Promise<void>((resolve) => scheduleOnRN(resolve)));

      expect(playImpact).not.toHaveBeenCalled();
    },
  );

  it('stops animation in the background and releases native listeners on unmount', async () => {
    jest
      .mocked(AccessibilityInfo.isReduceMotionEnabled)
      .mockResolvedValue(false);
    const { result, unmount } = renderHook(() =>
      usePackRevealAnimation({
        isActive: true,
        onRevealed: jest.fn(),
        sealWidth: 300,
        rarity: 'epic',
      }),
    );
    await waitFor(() => expect(withRepeat).toHaveBeenCalled());
    act(() => result.current.reveal());
    expect(playImpact).toHaveBeenCalledWith(ImpactMoment.GachaOpen);
    jest.mocked(cancelAnimation).mockClear();

    act(() => changeAppState('background'));

    expect(result.current.enabled).toBe(false);
    expect(cancelAnimation).toHaveBeenCalled();
    unmount();
    expect(removeAppListener).toHaveBeenCalledTimes(1);
    expect(removeMotionListener).toHaveBeenCalledTimes(1);
  });
});
