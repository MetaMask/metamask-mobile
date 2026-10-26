import React from 'react';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import {
  ReduceMotion,
  useReducedMotion,
  type LayoutAnimation,
} from 'react-native-reanimated';
import FeedItemEntryAnimation, {
  FEED_ITEM_ENTRY_DURATION_MS,
  FEED_ITEM_ENTRY_REDUCED_MOTION_DURATION_MS,
  FEED_ITEM_ENTRY_STAGGER_MS,
  createFeedItemEntryScheduler,
} from './FeedItemEntryAnimation';

jest.mock('react-native-reanimated', () => {
  const Reanimated = jest.requireActual('react-native-reanimated/mock');
  return {
    ...Reanimated,
    useReducedMotion: jest.fn(() => false),
    withDelay: (delay: number, animation: unknown) => ({ delay, animation }),
    withTiming: (toValue: number, config: unknown) => ({
      timing: toValue,
      config,
    }),
    withSpring: (toValue: number, config: unknown) => ({
      spring: toValue,
      config,
    }),
  };
});

const mockUseReducedMotion = jest.mocked(useReducedMotion);

const ENTRY_SPRING = { duration: 500, dampingRatio: 1 };

type EnteringFn = () => LayoutAnimation;

const getEntering = (): EnteringFn | undefined =>
  screen.getByTestId('entry-animation').props.entering;

const renderLiveEntry = (
  props: Partial<React.ComponentProps<typeof FeedItemEntryAnimation>> = {},
) =>
  render(
    <FeedItemEntryAnimation
      eventId="event-1"
      testID="entry-animation"
      {...props}
    >
      <Text>live feed item</Text>
    </FeedItemEntryAnimation>,
  );

describe('FeedItemEntryAnimation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseReducedMotion.mockReturnValue(false);
  });

  it('keeps production timing constants independent of debug slow motion', () => {
    expect(FEED_ITEM_ENTRY_DURATION_MS).toBe(500);
    expect(FEED_ITEM_ENTRY_REDUCED_MOTION_DURATION_MS).toBe(200);
    expect(FEED_ITEM_ENTRY_STAGGER_MS).toBe(70);
  });

  it('renders cached rows without an entrance', () => {
    renderLiveEntry({ eventId: undefined });

    expect(screen.getByText('live feed item')).toBeOnTheScreen();
    expect(getEntering()).toBeUndefined();
  });

  it('enters a live row with a fade, a rise and a spring settle', () => {
    renderLiveEntry();

    const animation = getEntering()?.();

    expect(animation?.initialValues).toEqual({
      opacity: 0,
      transform: [{ translateY: 20 }, { scale: 0.97 }],
    });
    expect(animation?.animations).toEqual({
      opacity: {
        delay: 0,
        animation: { timing: 1, config: { duration: 300 } },
      },
      transform: [
        {
          translateY: {
            delay: 0,
            animation: { spring: 0, config: ENTRY_SPRING },
          },
        },
        { scale: { delay: 0, animation: { spring: 1, config: ENTRY_SPRING } } },
      ],
    });
  });

  it('fades in only when the OS asks for reduced motion', () => {
    mockUseReducedMotion.mockReturnValue(true);
    renderLiveEntry();

    const animation = getEntering()?.();

    expect(animation?.initialValues).toEqual({ opacity: 0 });
    expect(animation?.animations).toEqual({
      opacity: {
        delay: 0,
        animation: {
          timing: 1,
          config: { duration: 200, reduceMotion: ReduceMotion.Never },
        },
      },
    });
  });

  it('fades in only when the caller asks for reduced motion', () => {
    renderLiveEntry({ reducedMotion: true });

    const animation = getEntering()?.();

    expect(animation?.initialValues).toEqual({ opacity: 0 });
    expect(Object.keys(animation?.animations ?? {})).toEqual(['opacity']);
  });

  it('starts after the scheduled stagger delay', () => {
    const scheduleEntryDelay = jest.fn(() => 140);
    renderLiveEntry({ scheduleEntryDelay });

    const animation = getEntering()?.();

    expect(scheduleEntryDelay).toHaveBeenCalledWith('event-1');
    expect(animation?.animations.opacity).toEqual(
      expect.objectContaining({ delay: 140 }),
    );
  });

  it('marks the entrance played only once it finishes', async () => {
    const onAnimationComplete = jest.fn();
    renderLiveEntry({ onAnimationComplete });
    const animation = getEntering()?.();

    animation?.callback?.(false);
    animation?.callback?.(true);
    await Promise.resolve();

    expect(onAnimationComplete).toHaveBeenCalledTimes(1);
    expect(onAnimationComplete).toHaveBeenCalledWith('event-1');
  });

  it('marks an event that reaches a mounted row as played without animating', () => {
    const onAnimationComplete = jest.fn();
    const { rerender } = renderLiveEntry({
      eventId: undefined,
      onAnimationComplete,
    });

    rerender(
      <FeedItemEntryAnimation
        eventId="event-2"
        testID="entry-animation"
        onAnimationComplete={onAnimationComplete}
      >
        <Text>live feed item</Text>
      </FeedItemEntryAnimation>,
    );

    expect(onAnimationComplete).toHaveBeenCalledWith('event-2');
    expect(getEntering()).toBeUndefined();
  });
});

describe('createFeedItemEntryScheduler', () => {
  it('spaces burst entrances 70ms apart without delaying spaced-out arrivals', () => {
    let now = 1_000;
    const scheduleEntryDelay = createFeedItemEntryScheduler(
      undefined,
      () => now,
    );

    const burstDelays = [
      scheduleEntryDelay('a'),
      scheduleEntryDelay('b'),
      scheduleEntryDelay('c'),
    ];
    now = 2_000;
    const laterDelay = scheduleEntryDelay('d');

    expect(burstDelays).toEqual([0, 70, 140]);
    expect(laterDelay).toBe(0);
  });

  it('returns the same delay when asked twice for one entrance', () => {
    const scheduleEntryDelay = createFeedItemEntryScheduler(undefined, () => 0);

    const first = scheduleEntryDelay('a');
    const second = scheduleEntryDelay('b');
    const firstAgain = scheduleEntryDelay('a');

    expect([first, second, firstAgain]).toEqual([0, 70, 0]);
  });
});
