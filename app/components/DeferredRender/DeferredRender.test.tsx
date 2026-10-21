/**
 * Unit coverage: the contract is timer and frame scheduling plus the visit
 * latch. Component-view tests drive Redux and registered routes; they would
 * still have to mock transitionEnd, rAF, and idle to reach this behavior.
 * Integration tests cover controller seams, which this primitive does not
 * cross.
 */
import React, { useLayoutEffect, useState } from 'react';
import { Pressable, Text } from 'react-native';
import {
  act,
  fireEvent,
  render,
  type RenderResult,
} from '@testing-library/react-native';

import { SCREEN_TRANSITION_FALLBACK_MS } from '../hooks/useScreenTransitionComplete';
import {
  DEFERRED_RENDER_FIRST_STAGE_TIMEOUT_MS,
  DEFERRED_RENDER_FRAME_TIMEOUT_MS,
  deferredRenderCompleteMark,
  deferredRenderFirstRenderMark,
  deferredRenderPlaceholderTestId,
} from './constants';
import { DeferredPlaceholder } from './DeferredPlaceholder';
import {
  DeferredRender,
  DeferredRenderHost,
  DeferredRenderSlot,
} from './DeferredRender';

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

jest.mock('@react-navigation/native', () => {
  const ReactActual = jest.requireActual('react');
  const navigation = {
    addListener: (eventName: string, listener: TransitionEndListener) =>
      mockAddListener(eventName, listener),
    isFocused: () => mockIsFocused(),
  };

  return {
    NavigationContext: ReactActual.createContext(navigation),
    useNavigation: () => navigation,
  };
});

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

function withDevWarnings(run: () => void) {
  const devGlobal = global as { __DEV__?: boolean };
  const previous = devGlobal.__DEV__;
  devGlobal.__DEV__ = true;
  try {
    run();
  } finally {
    devGlobal.__DEV__ = previous;
  }
}

function renderStages(onDeferredComplete = jest.fn()) {
  return render(
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
    jest.restoreAllMocks();
  });

  it('mounts after the opening transition, one frame, and an idle callback', () => {
    const onDeferredComplete = jest.fn();

    const view = renderSingle(onDeferredComplete);

    expect(view.queryByTestId('deferred-chart')).toBeNull();
    expect(getPlaceholder(view)).toBeOnTheScreen();
    expect(mockMark).toHaveBeenCalledWith(
      deferredRenderFirstRenderMark('token-details'),
    );
    expect(mockMark).toHaveBeenCalledTimes(1);
    expect(onDeferredComplete).not.toHaveBeenCalled();

    releaseOpeningTransition();

    expect(view.queryByTestId('deferred-chart')).toBeNull();

    flushNextAnimationFrame();

    expect(view.queryByTestId('deferred-chart')).toBeNull();

    flushNextIdleCallback();

    expect(view.getByTestId('deferred-chart')).toBeOnTheScreen();
    expect(
      view.queryByTestId(deferredRenderPlaceholderTestId(0), {
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

  it('calls onDeferredComplete after deferred children commit', () => {
    let childCommitted = false;

    function ChartProbe() {
      useLayoutEffect(() => {
        childCommitted = true;
      });
      return <Text testID="deferred-chart">chart</Text>;
    }

    const onDeferredComplete = jest.fn(() => {
      expect(childCommitted).toBe(true);
    });

    render(
      <DeferredRender
        screenId="token-details"
        estimatedHeight={240}
        onDeferredComplete={onDeferredComplete}
      >
        <ChartProbe />
      </DeferredRender>,
    );

    expect(childCommitted).toBe(false);
    expect(onDeferredComplete).not.toHaveBeenCalled();

    releaseOpeningTransition();
    flushNextAnimationFrame();
    flushNextIdleCallback();

    expect(childCommitted).toBe(true);
    expect(onDeferredComplete).toHaveBeenCalledTimes(1);
  });

  it('mounts on the next frame when requestIdleCallback is absent', () => {
    const host = globalThis as {
      requestIdleCallback?: unknown;
      cancelIdleCallback?: unknown;
    };
    delete host.requestIdleCallback;
    delete host.cancelIdleCallback;
    const onDeferredComplete = jest.fn();

    const view = renderSingle(onDeferredComplete);

    releaseOpeningTransition();
    flushNextAnimationFrame();

    expect(view.getByTestId('deferred-chart')).toBeOnTheScreen();
    expect(idleItems).toHaveLength(0);
    expect(onDeferredComplete).toHaveBeenCalledTimes(1);
  });

  it('ignores a closing transition and still waits for a frame after the opening one', () => {
    const view = renderSingle();

    act(() => {
      transitionListener?.({ data: { closing: true } });
    });

    expect(rafItems).toHaveLength(0);
    expect(view.queryByTestId('deferred-chart')).toBeNull();

    releaseOpeningTransition();
    flushNextAnimationFrame();
    flushNextIdleCallback();

    expect(view.getByTestId('deferred-chart')).toBeOnTheScreen();
  });

  it('releases staged slots one frame apart and completes once on the last stage', () => {
    const onDeferredComplete = jest.fn();

    const view = renderStages(onDeferredComplete);

    expect(view.queryByTestId('stage-0')).toBeNull();
    expect(view.queryByTestId('stage-1')).toBeNull();

    releaseOpeningTransition();
    flushNextAnimationFrame();
    flushNextIdleCallback();

    expect(view.getByTestId('stage-0')).toBeOnTheScreen();
    expect(view.queryByTestId('stage-1')).toBeNull();
    expect(getPlaceholder(view, 1)).toBeOnTheScreen();
    expect(onDeferredComplete).not.toHaveBeenCalled();

    flushNextAnimationFrame();

    expect(view.getByTestId('stage-1')).toBeOnTheScreen();
    expect(
      view.queryByTestId(deferredRenderPlaceholderTestId(1), {
        includeHiddenElements: true,
      }),
    ).toBeNull();
    expect(onDeferredComplete).toHaveBeenCalledTimes(1);
    expect(mockMark.mock.calls.map((call) => call[0])).toEqual([
      'deferred-render:perps-market-details:first-render',
      'deferred-render:perps-market-details:complete',
    ]);
  });

  it('releases a later stage on the frame timeout when its frame does not run', () => {
    const onDeferredComplete = jest.fn();

    const view = renderStages(onDeferredComplete);

    releaseOpeningTransition();
    flushNextAnimationFrame();
    flushNextIdleCallback();

    expect(view.getByTestId('stage-0')).toBeOnTheScreen();
    expect(view.queryByTestId('stage-1')).toBeNull();
    expect(onDeferredComplete).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(DEFERRED_RENDER_FRAME_TIMEOUT_MS - 1);
    });

    expect(view.queryByTestId('stage-1')).toBeNull();

    act(() => {
      jest.advanceTimersByTime(1);
    });

    expect(view.getByTestId('stage-1')).toBeOnTheScreen();
    expect(onDeferredComplete).toHaveBeenCalledTimes(1);
  });

  it('mounts after the transition fallback and the first-stage timeout when transitionEnd never fires', () => {
    const onDeferredComplete = jest.fn();

    const view = renderSingle(onDeferredComplete);

    act(() => {
      jest.advanceTimersByTime(SCREEN_TRANSITION_FALLBACK_MS);
    });

    expect(view.queryByTestId('deferred-chart')).toBeNull();

    act(() => {
      jest.advanceTimersByTime(DEFERRED_RENDER_FRAME_TIMEOUT_MS);
    });

    expect(view.queryByTestId('deferred-chart')).toBeNull();

    act(() => {
      jest.advanceTimersByTime(
        DEFERRED_RENDER_FIRST_STAGE_TIMEOUT_MS -
          DEFERRED_RENDER_FRAME_TIMEOUT_MS,
      );
    });

    expect(view.getByTestId('deferred-chart')).toBeOnTheScreen();
    expect(onDeferredComplete).toHaveBeenCalledTimes(1);
  });

  it('uses frameTimeoutMs as the backup for the first stage', () => {
    const onDeferredComplete = jest.fn();

    const view = render(
      <DeferredRender
        screenId="token-details"
        estimatedHeight={240}
        frameTimeoutMs={40}
        onDeferredComplete={onDeferredComplete}
      >
        <Chart />
      </DeferredRender>,
    );

    releaseOpeningTransition();

    act(() => {
      jest.advanceTimersByTime(39);
    });

    expect(view.queryByTestId('deferred-chart')).toBeNull();

    act(() => {
      jest.advanceTimersByTime(1);
    });

    expect(view.getByTestId('deferred-chart')).toBeOnTheScreen();
    expect(onDeferredComplete).toHaveBeenCalledTimes(1);
  });

  it('keeps the placeholder when the fallback elapses after the screen loses focus', () => {
    mockIsFocused.mockReturnValue(false);

    const view = renderSingle();

    act(() => {
      jest.advanceTimersByTime(
        SCREEN_TRANSITION_FALLBACK_MS + DEFERRED_RENDER_FIRST_STAGE_TIMEOUT_MS,
      );
    });

    expect(view.queryByTestId('deferred-chart')).toBeNull();
    expect(getPlaceholder(view)).toBeOnTheScreen();
  });

  it('reveals every stage on the first commit when deferral is disabled', () => {
    const onDeferredComplete = jest.fn();

    const view = render(
      <DeferredRender
        screenId="token-details"
        estimatedHeight={240}
        enabled={false}
        onDeferredComplete={onDeferredComplete}
      >
        <Chart />
      </DeferredRender>,
    );

    expect(view.getByTestId('deferred-chart')).toBeOnTheScreen();
    expect(onDeferredComplete).toHaveBeenCalledTimes(1);
    expect(rafMock).not.toHaveBeenCalled();
  });

  it('reveals the pending stage when enabled flips to false and keeps it when enabled flips back', () => {
    const onDeferredComplete = jest.fn();

    function Harness() {
      const [enabled, setEnabled] = useState(true);
      return (
        <>
          <Pressable
            testID="toggle-enabled"
            onPress={() => setEnabled((current) => !current)}
          />
          <DeferredRender
            screenId="token-details"
            estimatedHeight={240}
            enabled={enabled}
            onDeferredComplete={onDeferredComplete}
          >
            <Chart />
          </DeferredRender>
        </>
      );
    }

    const view = render(<Harness />);

    releaseOpeningTransition();

    expect(view.queryByTestId('deferred-chart')).toBeNull();
    expect(rafItems).toHaveLength(1);

    fireEvent.press(view.getByTestId('toggle-enabled'));

    expect(view.getByTestId('deferred-chart')).toBeOnTheScreen();
    expect(onDeferredComplete).toHaveBeenCalledTimes(1);

    fireEvent.press(view.getByTestId('toggle-enabled'));

    expect(view.getByTestId('deferred-chart')).toBeOnTheScreen();
    expect(onDeferredComplete).toHaveBeenCalledTimes(1);
    expect(rafMock).toHaveBeenCalledTimes(1);
  });

  it('calls the latest onDeferredComplete when the visit finishes', () => {
    const first = jest.fn();
    const second = jest.fn();
    const view = renderSingle(first);

    releaseOpeningTransition();
    flushNextAnimationFrame();

    view.rerender(
      <DeferredRender
        screenId="token-details"
        estimatedHeight={240}
        onDeferredComplete={second}
      >
        <Chart />
      </DeferredRender>,
    );

    flushNextIdleCallback();

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('defers again when screenId changes and completes the new visit once', () => {
    const onDeferredComplete = jest.fn();

    function Harness() {
      const [screenId, setScreenId] = useState('token-details');
      return (
        <>
          <Pressable
            testID="swap-screen"
            onPress={() => setScreenId('perps-market-details')}
          />
          <DeferredRender
            screenId={screenId}
            estimatedHeight={240}
            onDeferredComplete={onDeferredComplete}
          >
            <Chart />
          </DeferredRender>
        </>
      );
    }

    const view = render(<Harness />);

    releaseOpeningTransition();
    flushNextAnimationFrame();
    flushNextIdleCallback();

    expect(onDeferredComplete).toHaveBeenCalledTimes(1);

    fireEvent.press(view.getByTestId('swap-screen'));

    expect(view.queryByTestId('deferred-chart')).toBeNull();
    expect(getPlaceholder(view)).toBeOnTheScreen();
    expect(onDeferredComplete).toHaveBeenCalledTimes(1);
    expect(mockMark.mock.calls.map((call) => call[0])).toEqual([
      'deferred-render:token-details:first-render',
      'deferred-render:token-details:complete',
      'deferred-render:perps-market-details:first-render',
    ]);

    flushNextAnimationFrame();
    flushNextIdleCallback();

    expect(view.getByTestId('deferred-chart')).toBeOnTheScreen();
    expect(onDeferredComplete).toHaveBeenCalledTimes(2);
    expect(mockMark.mock.calls.map((call) => call[0])).toEqual([
      'deferred-render:token-details:first-render',
      'deferred-render:token-details:complete',
      'deferred-render:perps-market-details:first-render',
      'deferred-render:perps-market-details:complete',
    ]);
  });

  it('cancels the idle callback on unmount and does not complete after that', () => {
    const onDeferredComplete = jest.fn();
    const { unmount, queryByTestId } = renderSingle(onDeferredComplete);

    releaseOpeningTransition();
    flushNextAnimationFrame();

    expect(queryByTestId('deferred-chart')).toBeNull();
    expect(idleItems).toHaveLength(1);

    unmount();
    flushNextIdleCallback();
    act(() => {
      jest.advanceTimersByTime(DEFERRED_RENDER_FIRST_STAGE_TIMEOUT_MS);
    });

    expect(cancelIdleMock).toHaveBeenCalled();
    expect(onDeferredComplete).not.toHaveBeenCalled();
    expect(mockMark.mock.calls.map((call) => call[0])).toEqual([
      'deferred-render:token-details:first-render',
    ]);
  });

  it('does not release when the screen unmounts after transitionEnd and before the frame', () => {
    const onDeferredComplete = jest.fn();
    const { unmount } = renderSingle(onDeferredComplete);

    releaseOpeningTransition();

    expect(rafItems).toHaveLength(1);

    unmount();
    flushNextAnimationFrame();
    act(() => {
      jest.advanceTimersByTime(
        SCREEN_TRANSITION_FALLBACK_MS + DEFERRED_RENDER_FIRST_STAGE_TIMEOUT_MS,
      );
    });

    expect(cancelAnimationFrame).toHaveBeenCalled();
    expect(mockUnsubscribe).toHaveBeenCalled();
    expect(onDeferredComplete).not.toHaveBeenCalled();
    expect(mockMark.mock.calls.map((call) => call[0])).toEqual([
      'deferred-render:token-details:first-render',
    ]);
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

    const view = render(<Visit />);

    releaseOpeningTransition();
    flushNextAnimationFrame();
    flushNextIdleCallback();

    fireEvent.press(view.getByTestId('toggle-slot'));

    expect(view.getByTestId('slot-unmounted')).toBeOnTheScreen();

    fireEvent.press(view.getByTestId('toggle-slot'));

    expect(view.getByTestId('deferred-chart')).toBeOnTheScreen();
    expect(
      view.queryByTestId(deferredRenderPlaceholderTestId(0), {
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

  it('warns in development when a stage is outside the host range', () => {
    const warnSpy = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);

    withDevWarnings(() => {
      const view = render(
        <DeferredRenderHost screenId="perps-market-details" stages={1}>
          <DeferredRender stage={2} estimatedHeight={160}>
            <Text testID="stage-2">late</Text>
          </DeferredRender>
        </DeferredRenderHost>,
      );

      expect(view.queryByTestId('stage-2')).toBeNull();
      expect(getPlaceholder(view, 2)).toBeOnTheScreen();
    });

    expect(warnSpy).toHaveBeenCalledWith(
      'DeferredRender stage 2 is outside 0..0 for "perps-market-details". That slot stays on its placeholder.',
    );
  });

  it('warns in development when a slot passes host props and still defers', () => {
    const warnSpy = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    const ignoredComplete = jest.fn();

    withDevWarnings(() => {
      const view = render(
        <DeferredRenderHost screenId="token-details">
          <DeferredRender
            estimatedHeight={240}
            screenId="ignored"
            enabled={false}
            onDeferredComplete={ignoredComplete}
          >
            <Chart />
          </DeferredRender>
        </DeferredRenderHost>,
      );

      expect(view.queryByTestId('deferred-chart')).toBeNull();
      expect(ignoredComplete).not.toHaveBeenCalled();
    });

    expect(warnSpy).toHaveBeenCalledWith(
      'DeferredRender ignores screenId, enabled, frameTimeoutMs, and onDeferredComplete inside DeferredRenderHost. Pass them to the host.',
    );
  });

  it('warns in development when the placeholder height is not positive', () => {
    const warnSpy = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);

    withDevWarnings(() => {
      render(<DeferredPlaceholder height={0} />);
      render(<DeferredPlaceholder height={Number.NaN} />);
    });

    expect(warnSpy).toHaveBeenNthCalledWith(
      1,
      'DeferredPlaceholder expected a positive height and received 0.',
    );
    expect(warnSpy).toHaveBeenNthCalledWith(
      2,
      'DeferredPlaceholder expected a positive height and received NaN.',
    );
  });

  it('throws when screenId is missing outside a host', () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(() =>
      render(
        <DeferredRender estimatedHeight={240}>
          <Chart />
        </DeferredRender>,
      ),
    ).toThrow(
      'DeferredRender requires screenId when rendered outside DeferredRenderHost',
    );
  });

  it('throws when a slot renders outside a host', () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(() =>
      render(
        <DeferredRenderSlot stage={0} estimatedHeight={240}>
          <Chart />
        </DeferredRenderSlot>,
      ),
    ).toThrow('DeferredRender slot rendered outside DeferredRenderHost');
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
