/**
 * Unit coverage: the contract is timer and frame scheduling plus the visit
 * latch. Component-view tests drive Redux and registered routes; they would
 * still have to mock transitionEnd, rAF, and idle to reach this behavior.
 * Integration tests cover controller seams, which this primitive does not
 * cross.
 */
import React, { useState } from 'react';
import { Pressable, Text } from 'react-native';
import {
  act,
  fireEvent,
  render,
  type RenderResult,
} from '@testing-library/react-native';

import { SCREEN_TRANSITION_FALLBACK_MS } from '../hooks/useScreenTransitionComplete';
import {
  DeferredRender,
  DeferredRenderHost,
  DEFERRED_RENDER_FRAME_TIMEOUT_MS,
  deferredRenderCompleteMark,
  deferredRenderFirstRenderMark,
  deferredRenderPlaceholderTestId,
} from './index';

type TransitionEndListener = (event: { data: { closing: boolean } }) => void;

const mockUnsubscribe = jest.fn();
const mockIsFocused = jest.fn(() => true);
const mockMark = jest.fn();
let transitionListener: TransitionEndListener | undefined;
let rafMock = jest.fn();
let cancelIdleMock = jest.fn();

const mockAddListener = jest.fn(
  (eventName: string, listener: TransitionEndListener) => {
    if (eventName === 'transitionEnd') {
      transitionListener = listener;
    }
    return mockUnsubscribe;
  },
);

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    addListener: mockAddListener,
    isFocused: mockIsFocused,
  }),
}));

jest.mock('react-native-performance', () => ({
  __esModule: true,
  mark: (name: string) => mockMark(name),
  now: () => 0,
  default: {
    mark: (name: string) => mockMark(name),
    now: () => 0,
  },
}));

interface QueuedCallback {
  id: number;
  callback: () => void;
}

let rafItems: QueuedCallback[] = [];
let idleItems: QueuedCallback[] = [];
let nextHandle = 1;

function installFrameMocks() {
  rafItems = [];
  idleItems = [];
  nextHandle = 1;

  rafMock = jest.fn((callback: () => void) => {
    const id = nextHandle;
    nextHandle += 1;
    rafItems.push({ id, callback });
    return id;
  });
  global.requestAnimationFrame =
    rafMock as unknown as typeof requestAnimationFrame;

  global.cancelAnimationFrame = jest.fn() as typeof cancelAnimationFrame;

  cancelIdleMock = jest.fn();
  const host = globalThis as unknown as {
    requestIdleCallback: (callback: () => void) => number;
    cancelIdleCallback: jest.Mock;
  };
  host.requestIdleCallback = (callback: () => void) => {
    const id = nextHandle;
    nextHandle += 1;
    idleItems.push({ id, callback });
    return id;
  };
  host.cancelIdleCallback = cancelIdleMock;
}

function flushNextAnimationFrame() {
  const next = rafItems.shift();
  if (!next) {
    throw new Error('expected a pending animation frame');
  }
  act(() => {
    next.callback();
  });
}

function flushNextIdleCallback() {
  const next = idleItems.shift();
  if (!next) {
    throw new Error('expected a pending idle callback');
  }
  act(() => {
    next.callback();
  });
}

function releaseOpeningTransition() {
  act(() => {
    transitionListener?.({ data: { closing: false } });
  });
}

function getPlaceholder(utils: Pick<RenderResult, 'getByTestId'>, stage = 0) {
  return utils.getByTestId(deferredRenderPlaceholderTestId(stage), {
    includeHiddenElements: true,
  });
}

function Chart({ label = 'chart' }: { label?: string }) {
  return <Text testID="deferred-chart">{label}</Text>;
}

function renderSingle(onDeferredComplete = jest.fn(), label = 'chart') {
  return render(
    <DeferredRender
      screenId="token-details"
      estimatedHeight={240}
      onDeferredComplete={onDeferredComplete}
    >
      <Chart label={label} />
    </DeferredRender>,
  );
}

describe('DeferredRender', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    installFrameMocks();
    mockMark.mockClear();
    mockUnsubscribe.mockClear();
    mockAddListener.mockClear();
    mockIsFocused.mockReturnValue(true);
    transitionListener = undefined;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('mounts after the opening transition, one frame, and an idle callback', () => {
    const onDeferredComplete = jest.fn();

    const { getByTestId, queryByTestId } = renderSingle(onDeferredComplete);

    expect(queryByTestId('deferred-chart')).toBeNull();
    expect(
      getPlaceholder({ getByTestId }),
    ).toBeOnTheScreen();
    expect(mockMark).toHaveBeenCalledWith(
      deferredRenderFirstRenderMark('token-details'),
    );
    expect(mockMark).toHaveBeenCalledTimes(1);
    expect(onDeferredComplete).not.toHaveBeenCalled();

    releaseOpeningTransition();

    expect(queryByTestId('deferred-chart')).toBeNull();

    flushNextAnimationFrame();

    expect(queryByTestId('deferred-chart')).toBeNull();

    flushNextIdleCallback();

    expect(getByTestId('deferred-chart')).toBeOnTheScreen();
    expect(
      queryByTestId(deferredRenderPlaceholderTestId(0), {
        includeHiddenElements: true,
      }),
    ).toBeNull();
    expect(onDeferredComplete).toHaveBeenCalledTimes(1);
    expect(mockMark).toHaveBeenCalledWith(
      deferredRenderCompleteMark('token-details'),
    );
    expect(mockMark.mock.calls.map((call) => call[0])).toEqual([
      'deferred-render:token-details:first-render',
      'deferred-render:token-details:complete',
    ]);
  });

  it('ignores a closing transition and still waits for a frame after the opening one', () => {
    const { queryByTestId, getByTestId } = renderSingle();

    act(() => {
      transitionListener?.({ data: { closing: true } });
    });

    expect(rafItems).toHaveLength(0);
    expect(queryByTestId('deferred-chart')).toBeNull();

    releaseOpeningTransition();
    flushNextAnimationFrame();
    flushNextIdleCallback();

    expect(getByTestId('deferred-chart')).toBeOnTheScreen();
  });

  it('releases staged slots one frame apart and completes once on the last stage', () => {
    const onDeferredComplete = jest.fn();

    const { getByTestId, queryByTestId } = render(
      <DeferredRenderHost
        screenId="perps-market-details"
        stages={2}
        onDeferredComplete={onDeferredComplete}
      >
        <DeferredRender stage={0} estimatedHeight={320}>
          <Text testID="stage-0">chart</Text>
        </DeferredRender>
        <DeferredRender stage={1} estimatedHeight={160}>
          <Text testID="stage-1">stats</Text>
        </DeferredRender>
      </DeferredRenderHost>,
    );

    expect(queryByTestId('stage-0')).toBeNull();
    expect(queryByTestId('stage-1')).toBeNull();

    releaseOpeningTransition();
    flushNextAnimationFrame();
    flushNextIdleCallback();

    expect(getByTestId('stage-0')).toBeOnTheScreen();
    expect(queryByTestId('stage-1')).toBeNull();
    expect(getPlaceholder({ getByTestId }, 1)).toBeOnTheScreen();
    expect(onDeferredComplete).not.toHaveBeenCalled();

    flushNextAnimationFrame();

    expect(getByTestId('stage-1')).toBeOnTheScreen();
    expect(
      queryByTestId(deferredRenderPlaceholderTestId(1), {
        includeHiddenElements: true,
      }),
    ).toBeNull();
    expect(onDeferredComplete).toHaveBeenCalledTimes(1);
    expect(mockMark.mock.calls.map((call) => call[0])).toEqual([
      'deferred-render:perps-market-details:first-render',
      'deferred-render:perps-market-details:complete',
    ]);
  });

  it('mounts after the transition fallback and the frame timeout when transitionEnd never fires', () => {
    const onDeferredComplete = jest.fn();

    const { getByTestId, queryByTestId } = renderSingle(onDeferredComplete);

    act(() => {
      jest.advanceTimersByTime(SCREEN_TRANSITION_FALLBACK_MS);
    });

    expect(queryByTestId('deferred-chart')).toBeNull();

    act(() => {
      jest.advanceTimersByTime(DEFERRED_RENDER_FRAME_TIMEOUT_MS);
    });

    expect(getByTestId('deferred-chart')).toBeOnTheScreen();
    expect(onDeferredComplete).toHaveBeenCalledTimes(1);
  });

  it('keeps the placeholder when the fallback elapses after the screen loses focus', () => {
    mockIsFocused.mockReturnValue(false);

    const view = renderSingle();

    act(() => {
      jest.advanceTimersByTime(
        SCREEN_TRANSITION_FALLBACK_MS + DEFERRED_RENDER_FRAME_TIMEOUT_MS,
      );
    });

    expect(view.queryByTestId('deferred-chart')).toBeNull();
    expect(getPlaceholder(view)).toBeOnTheScreen();
  });

  it('cancels the idle callback on unmount and does not release after that', () => {
    const onDeferredComplete = jest.fn();
    const errorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const { unmount, queryByTestId } = renderSingle(onDeferredComplete);

    releaseOpeningTransition();
    flushNextAnimationFrame();

    expect(queryByTestId('deferred-chart')).toBeNull();
    expect(idleItems).toHaveLength(1);

    unmount();

    expect(cancelIdleMock).toHaveBeenCalled();
    flushNextIdleCallback();
    act(() => {
      jest.advanceTimersByTime(DEFERRED_RENDER_FRAME_TIMEOUT_MS);
    });

    expect(onDeferredComplete).not.toHaveBeenCalled();
    expect(
      errorSpy.mock.calls.filter((args) =>
        args.some((arg) => /unmounted|not mounted/i.test(String(arg))),
      ),
    ).toEqual([]);
    errorSpy.mockRestore();
  });

  it('does not release when the screen unmounts after transitionEnd and before the frame', () => {
    const onDeferredComplete = jest.fn();
    const errorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const { unmount } = renderSingle(onDeferredComplete);

    releaseOpeningTransition();

    expect(rafItems).toHaveLength(1);

    unmount();

    expect(cancelAnimationFrame).toHaveBeenCalled();
    expect(mockUnsubscribe).toHaveBeenCalled();
    flushNextAnimationFrame();
    act(() => {
      jest.advanceTimersByTime(
        SCREEN_TRANSITION_FALLBACK_MS + DEFERRED_RENDER_FRAME_TIMEOUT_MS,
      );
    });

    expect(onDeferredComplete).not.toHaveBeenCalled();
    expect(mockMark.mock.calls.map((call) => call[0])).toEqual([
      'deferred-render:token-details:first-render',
    ]);
    expect(
      errorSpy.mock.calls.filter((args) =>
        args.some((arg) => /unmounted|not mounted/i.test(String(arg))),
      ),
    ).toEqual([]);
    errorSpy.mockRestore();
  });

  it('keeps released content mounted across re-renders and calls onDeferredComplete once', () => {
    const onDeferredComplete = jest.fn();
    const view = renderSingle(onDeferredComplete, 'one');

    releaseOpeningTransition();
    flushNextAnimationFrame();
    flushNextIdleCallback();

    view.rerender(
      <DeferredRender
        screenId="token-details"
        estimatedHeight={240}
        onDeferredComplete={() => onDeferredComplete()}
      >
        <Chart label="two" />
      </DeferredRender>,
    );

    expect(view.getByTestId('deferred-chart').props.children).toBe('two');
    expect(
      view.queryByTestId(deferredRenderPlaceholderTestId(0), {
        includeHiddenElements: true,
      }),
    ).toBeNull();
    expect(onDeferredComplete).toHaveBeenCalledTimes(1);
    expect(mockMark).toHaveBeenCalledTimes(2);
    expect(rafMock).toHaveBeenCalledTimes(1);
  });

  it('shows a slot immediately when it remounts after release in the same visit', () => {
    const onDeferredComplete = jest.fn();

    function Visit() {
      const [visible, setVisible] = useState(true);
      return (
        <DeferredRenderHost
          screenId="token-details"
          onDeferredComplete={onDeferredComplete}
        >
          <Pressable
            testID="toggle-slot"
            onPress={() => setVisible((current) => !current)}
          />
          {visible ? (
            <DeferredRender estimatedHeight={140}>
              <Chart />
            </DeferredRender>
          ) : (
            <Text testID="slot-unmounted">gone</Text>
          )}
        </DeferredRenderHost>
      );
    }

    const { getByTestId, queryByTestId } = render(<Visit />);

    releaseOpeningTransition();
    flushNextAnimationFrame();
    flushNextIdleCallback();

    fireEvent.press(getByTestId('toggle-slot'));

    expect(getByTestId('slot-unmounted')).toBeOnTheScreen();

    fireEvent.press(getByTestId('toggle-slot'));

    expect(getByTestId('deferred-chart')).toBeOnTheScreen();
    expect(
      queryByTestId(deferredRenderPlaceholderTestId(0), {
        includeHiddenElements: true,
      }),
    ).toBeNull();
    expect(onDeferredComplete).toHaveBeenCalledTimes(1);
  });

  it('defers again on a fresh mount of the same screen', () => {
    const onDeferredComplete = jest.fn();
    const first = renderSingle(onDeferredComplete);

    releaseOpeningTransition();
    flushNextAnimationFrame();
    flushNextIdleCallback();
    first.unmount();

    const second = renderSingle(onDeferredComplete);

    expect(second.queryByTestId('deferred-chart')).toBeNull();
    expect(getPlaceholder(second)).toBeOnTheScreen();
    expect(onDeferredComplete).toHaveBeenCalledTimes(1);

    releaseOpeningTransition();
    flushNextAnimationFrame();
    flushNextIdleCallback();

    expect(second.getByTestId('deferred-chart')).toBeOnTheScreen();
    expect(onDeferredComplete).toHaveBeenCalledTimes(2);
  });

  it('hides the placeholder from assistive technology and reserves its height', () => {
    const view = renderSingle();

    const placeholder = getPlaceholder(view);

    expect(placeholder.props.accessible).toBe(false);
    expect(placeholder.props.accessibilityElementsHidden).toBe(true);
    expect(placeholder.props.importantForAccessibility).toBe(
      'no-hide-descendants',
    );
    expect(placeholder.props.focusable).toBe(false);
    expect(placeholder.props.accessibilityLabel).toBeUndefined();
    expect(placeholder.props.style).toEqual({ height: 240 });
  });
});
