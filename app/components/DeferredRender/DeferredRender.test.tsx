/**
 * Unit coverage: one frame after the transition flag, plus cancel on unmount.
 * Component-view would still mock `transitionEnd` and `requestAnimationFrame`.
 * This hook does not cross a controller seam. The transition hook has its own tests.
 */
import React from 'react';
import { View } from 'react-native';
import { act, render, renderHook } from '@testing-library/react-native';

import { DeferredRender } from './DeferredRender';
import { useDeferredRender } from './useDeferredRender';

let mockIsTransitionComplete = false;

jest.mock('../hooks/useScreenTransitionComplete', () => ({
  useScreenTransitionComplete: () => mockIsTransitionComplete,
}));

interface QueuedFrame {
  id: number;
  callback: FrameRequestCallback;
}

let queuedFrames: QueuedFrame[] = [];
let nextFrameId = 1;
const originalRequestAnimationFrame = global.requestAnimationFrame;
const originalCancelAnimationFrame = global.cancelAnimationFrame;

function installAnimationFrameMock() {
  queuedFrames = [];
  nextFrameId = 1;
  global.requestAnimationFrame = jest.fn((callback: FrameRequestCallback) => {
    const id = nextFrameId;
    nextFrameId += 1;
    queuedFrames.push({ id, callback });
    return id;
  }) as typeof requestAnimationFrame;
  global.cancelAnimationFrame = jest.fn((id: number) => {
    queuedFrames = queuedFrames.filter((frame) => frame.id !== id);
  }) as typeof cancelAnimationFrame;
}

function flushAnimationFrame() {
  const frame = queuedFrames.shift();
  if (!frame) {
    throw new Error('expected a pending animation frame');
  }

  act(() => {
    frame.callback(0);
  });
}

function gate(enabled?: boolean) {
  return (
    <DeferredRender
      enabled={enabled}
      placeholder={<View testID="deferred-render-placeholder" />}
    >
      <View testID="deferred-render-content" />
    </DeferredRender>
  );
}

describe('DeferredRender', () => {
  beforeEach(() => {
    mockIsTransitionComplete = false;
    installAnimationFrameMock();
  });

  afterEach(() => {
    global.requestAnimationFrame = originalRequestAnimationFrame;
    global.cancelAnimationFrame = originalCancelAnimationFrame;
  });

  it('returns false before the transition completes', () => {
    const { result } = renderHook(() => useDeferredRender());

    expect(result.current).toBe(false);
    expect(global.requestAnimationFrame).not.toHaveBeenCalled();
  });

  it('returns true one frame after the transition completes', () => {
    mockIsTransitionComplete = true;

    const { result } = renderHook(() => useDeferredRender());

    expect(result.current).toBe(false);

    flushAnimationFrame();

    expect(result.current).toBe(true);
  });

  it('cancels the pending frame on unmount', () => {
    mockIsTransitionComplete = true;
    const { result, unmount } = renderHook(() => useDeferredRender());
    const pendingFrame = queuedFrames[0];

    unmount();

    expect(global.cancelAnimationFrame).toHaveBeenCalledWith(pendingFrame.id);
    expect(queuedFrames).toHaveLength(0);

    act(() => {
      pendingFrame.callback(0);
    });

    expect(result.current).toBe(false);
  });

  it('returns true on the first commit when enabled is false', () => {
    const { result } = renderHook(() => useDeferredRender({ enabled: false }));

    expect(result.current).toBe(true);
    expect(global.requestAnimationFrame).not.toHaveBeenCalled();
  });

  it('renders the placeholder and then the children one frame later', () => {
    const view = render(gate());

    expect(view.getByTestId('deferred-render-placeholder')).toBeOnTheScreen();
    expect(view.queryByTestId('deferred-render-content')).toBeNull();

    mockIsTransitionComplete = true;
    view.rerender(gate());
    flushAnimationFrame();

    expect(view.getByTestId('deferred-render-content')).toBeOnTheScreen();
    expect(view.queryByTestId('deferred-render-placeholder')).toBeNull();
  });

  it('renders the children on the first commit when enabled is false', () => {
    const view = render(gate(false));

    expect(view.getByTestId('deferred-render-content')).toBeOnTheScreen();
    expect(view.queryByTestId('deferred-render-placeholder')).toBeNull();
    expect(global.requestAnimationFrame).not.toHaveBeenCalled();
  });
});
