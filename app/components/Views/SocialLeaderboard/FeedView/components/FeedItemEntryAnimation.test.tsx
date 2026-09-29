import React from 'react';
import { StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { act, render, screen } from '@testing-library/react-native';
import {
  useReducedMotion,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import FeedItemEntryAnimation, {
  FEED_ITEM_ENTRY_BLUR_RADIUS,
  FEED_ITEM_ENTRY_DURATION_MS,
  FEED_ITEM_ENTRY_REDUCED_MOTION_DURATION_MS,
  FEED_ITEM_ENTRY_SNAPSHOT_TIMEOUT_MS,
  FEED_ITEM_ENTRY_STAGGER_MS,
  createFeedItemEntryScheduler,
} from './FeedItemEntryAnimation';

const timingCallbacks: ((finished: boolean) => void)[] = [];
const mockCaptureRef = jest.fn<Promise<string>, []>();
const mockReleaseCapture = jest.fn();

jest.mock('react-native-reanimated', () => {
  const Reanimated = jest.requireActual('react-native-reanimated/mock');
  const { useRef } = jest.requireActual('react');
  const identity = (value: number) => value;

  return {
    ...Reanimated,
    Easing: {
      ...Reanimated.Easing,
      bezierFn: () => identity,
      linear: identity,
    },
    cancelAnimation: jest.fn(),
    useReducedMotion: jest.fn(() => false),
    useSharedValue: (initialValue: number) =>
      useRef({ value: initialValue }).current,
    useAnimatedStyle: (factory: () => unknown) => factory(),
    withDelay: jest.fn((_delay: number, animation: number) => animation),
    withTiming: jest.fn(
      (
        value: number,
        _config: unknown,
        callback?: (finished: boolean) => void,
      ) => {
        if (callback) {
          timingCallbacks.push(callback);
        }
        return value;
      },
    ),
  };
});

jest.mock('react-native-view-shot', () => ({
  captureRef: () => mockCaptureRef(),
  releaseCapture: (uri: string) => mockReleaseCapture(uri),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => {
  const { lightTheme } = jest.requireActual('@metamask/design-tokens');
  const twStyles: Record<string, object> = {
    'overflow-hidden': { overflow: 'hidden' },
    'bg-default': { backgroundColor: lightTheme.colors.background.default },
  };
  return {
    useTailwind: () => ({
      style: (className: string) => twStyles[className],
    }),
  };
});

const mockUseReducedMotion = jest.mocked(useReducedMotion);
const mockWithDelay = jest.mocked(withDelay);
const mockWithTiming = jest.mocked(withTiming);

const IDENTITY_TRANSFORM = [{ translateY: 0 }, { scale: 1 }];
const PINNED_TO_TOP = { left: 0, position: 'absolute', right: 0, top: 0 };

const getClip = () => screen.getByTestId('entry-animation');
const getMotion = () => getClip().props.children;
const getContent = () => getMotion().props.children[0];
const getBlurOverlay = () => getMotion().props.children[1];
const flattenStyle = (node: { props: { style?: StyleProp<ViewStyle> } }) =>
  StyleSheet.flatten(node.props.style) ?? {};

const advance = async (ms = 0): Promise<void> => {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });
};

const layoutContent = async (height = 160): Promise<void> => {
  await act(async () => {
    getContent().props.onLayout({ nativeEvent: { layout: { height } } });
  });
  await advance();
};

const loadBlurSnapshot = async (): Promise<void> => {
  await act(async () => {
    getBlurOverlay().props.children.props.onLoad();
  });
};

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
    jest.useFakeTimers();
    jest.clearAllMocks();
    timingCallbacks.length = 0;
    mockCaptureRef.mockResolvedValue('/tmp/snapshot.png');
    mockUseReducedMotion.mockReturnValue(false);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders cached rows without an entrance', () => {
    render(
      <FeedItemEntryAnimation testID="entry-animation">
        <Text>cached feed item</Text>
      </FeedItemEntryAnimation>,
    );

    expect(screen.getByText('cached feed item')).toBeOnTheScreen();
    expect(flattenStyle(getClip())).toEqual({ height: 'auto' });
    expect(flattenStyle(getMotion())).toEqual({
      opacity: 1,
      transform: IDENTITY_TRANSFORM,
    });
    expect(mockCaptureRef).not.toHaveBeenCalled();
    expect(mockWithTiming).not.toHaveBeenCalled();
  });

  it('holds a socket row at its collapsed, transparent start until the blur snapshot loads', async () => {
    renderLiveEntry();

    await layoutContent();

    expect(flattenStyle(getClip())).toEqual({ height: 0, overflow: 'hidden' });
    expect(flattenStyle(getMotion())).toEqual({
      ...PINNED_TO_TOP,
      opacity: 0,
      transform: [{ translateY: 20 }, { scale: 0.97 }],
    });
    expect(getBlurOverlay().props.children.props).toEqual(
      expect.objectContaining({
        blurRadius: FEED_ITEM_ENTRY_BLUR_RADIUS,
        source: { uri: 'file:///tmp/snapshot.png' },
      }),
    );
    expect(flattenStyle(getBlurOverlay())).toEqual(
      expect.objectContaining({ height: 160, opacity: 1 }),
    );
    expect(mockWithTiming).not.toHaveBeenCalled();
  });

  it('runs the 520ms entrance on linear time once the blur snapshot loads', async () => {
    renderLiveEntry();
    await layoutContent();

    await loadBlurSnapshot();

    expect(mockWithTiming).toHaveBeenCalledTimes(1);
    expect(mockWithTiming).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ duration: FEED_ITEM_ENTRY_DURATION_MS }),
      expect.any(Function),
    );
  });

  it('opens the wrapper to the natural height of the floating row', async () => {
    const { rerender } = renderLiveEntry();
    await layoutContent(142);
    await loadBlurSnapshot();

    rerender(
      <FeedItemEntryAnimation eventId="event-1" testID="entry-animation">
        <Text>live feed item</Text>
      </FeedItemEntryAnimation>,
    );

    expect(flattenStyle(getClip())).toEqual({
      height: 142,
      overflow: 'hidden',
    });
    expect(flattenStyle(getMotion())).toEqual(
      expect.objectContaining(PINNED_TO_TOP),
    );
  });

  it('replays the entrance once for each new socket event id', async () => {
    const { rerender } = renderLiveEntry();
    await layoutContent();
    await loadBlurSnapshot();

    rerender(
      <FeedItemEntryAnimation eventId="event-1" testID="entry-animation">
        <Text>updated live feed item</Text>
      </FeedItemEntryAnimation>,
    );
    await advance();
    const timingCallsForSameEvent = mockWithTiming.mock.calls.length;
    rerender(
      <FeedItemEntryAnimation eventId="event-2" testID="entry-animation">
        <Text>second live feed item</Text>
      </FeedItemEntryAnimation>,
    );
    await advance();
    await loadBlurSnapshot();

    expect(timingCallsForSameEvent).toBe(1);
    expect(mockCaptureRef).toHaveBeenCalledTimes(2);
    expect(mockWithTiming).toHaveBeenCalledTimes(2);
  });

  it('restores neutral styles and drops the snapshot when the entrance completes', async () => {
    const onAnimationComplete = jest.fn();
    renderLiveEntry({ onAnimationComplete });
    await layoutContent();
    await loadBlurSnapshot();

    await act(async () => {
      timingCallbacks[0]?.(true);
    });
    await advance();

    expect(flattenStyle(getClip())).toEqual({ height: 'auto' });
    expect(flattenStyle(getMotion())).toEqual({
      opacity: 1,
      transform: IDENTITY_TRANSFORM,
    });
    expect(getContent().props.style).toBeUndefined();
    expect(getBlurOverlay()).toBeNull();
    expect(mockReleaseCapture).toHaveBeenCalledWith('/tmp/snapshot.png');
    expect(onAnimationComplete).toHaveBeenCalledWith('event-1');
  });

  it('starts without blur when the snapshot is not ready in time', async () => {
    mockCaptureRef.mockReturnValue(new Promise<string>(() => undefined));
    renderLiveEntry();
    await layoutContent();

    await advance(FEED_ITEM_ENTRY_SNAPSHOT_TIMEOUT_MS);

    expect(mockWithTiming).toHaveBeenCalledTimes(1);
    expect(getBlurOverlay()).toBeNull();
  });

  it('starts without blur when the snapshot capture fails', async () => {
    mockCaptureRef.mockRejectedValue(new Error('capture failed'));
    renderLiveEntry();
    await layoutContent();

    await advance(100);

    expect(mockCaptureRef).toHaveBeenCalledTimes(3);
    expect(mockWithTiming).toHaveBeenCalledTimes(1);
    expect(getBlurOverlay()).toBeNull();
  });

  it('uses a 200ms fade and height entrance without blur or transform for reduced motion', async () => {
    mockUseReducedMotion.mockReturnValue(true);
    renderLiveEntry();

    await layoutContent();

    expect(mockWithTiming).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        duration: FEED_ITEM_ENTRY_REDUCED_MOTION_DURATION_MS,
      }),
      expect.any(Function),
    );
    expect(flattenStyle(getMotion())).toEqual({
      ...PINNED_TO_TOP,
      opacity: 0,
      transform: IDENTITY_TRANSFORM,
    });
    expect(mockCaptureRef).not.toHaveBeenCalled();
    expect(getBlurOverlay()).toBeNull();
  });

  it('waits for the scheduled stagger delay before starting', async () => {
    const scheduleEntryDelay = jest.fn(() => FEED_ITEM_ENTRY_STAGGER_MS * 2);
    renderLiveEntry({ scheduleEntryDelay });
    await layoutContent();

    await loadBlurSnapshot();

    expect(scheduleEntryDelay).toHaveBeenCalledTimes(1);
    expect(mockWithDelay).toHaveBeenCalledWith(
      FEED_ITEM_ENTRY_STAGGER_MS * 2,
      1,
    );
  });
});

describe('createFeedItemEntryScheduler', () => {
  it('spaces burst entrances 70ms apart without delaying spaced-out arrivals', () => {
    let now = 1_000;
    const scheduleEntryDelay = createFeedItemEntryScheduler(
      FEED_ITEM_ENTRY_STAGGER_MS,
      () => now,
    );

    const burstDelays = [
      scheduleEntryDelay(),
      scheduleEntryDelay(),
      scheduleEntryDelay(),
    ];
    now = 2_000;
    const laterDelay = scheduleEntryDelay();

    expect(burstDelays).toEqual([0, 70, 140]);
    expect(laterDelay).toBe(0);
  });
});
