import React from 'react';
// Jest accepts prefixing out-of-scope variables with `mock`
import { Animated, View as MockView } from 'react-native';
import { render, act, screen } from '@testing-library/react-native';
import ControllersGate from './ControllersGate';
import { useSelector } from 'react-redux';
import { endTrace } from '../../../util/trace';

const MOCK_FOX_LOADER_ID = 'FOX_LOADER_ID';
const MOCK_CHILDREN_ID = 'MOCK_CHILDREN_ID';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

const mockHasTestOverrides = false;
jest.mock('../../../util/test/utils', () => ({
  get hasTestOverrides() {
    return mockHasTestOverrides;
  },
}));

// Deliberately NOT mocking `startupStageSpans`: the property worth testing is
// that the real helper composed with a failing tracing layer still reveals the
// UI. Mocking the helper would only test the mock.
jest.mock('../../../util/trace', () => ({
  ...jest.requireActual('../../../util/trace'),
  trace: jest.fn(),
  endTrace: jest.fn(),
}));

jest.mock('../../../core/Performance', () => ({
  Performance: { appLaunchTime: 1_700_000_000_000 },
}));

jest.mock('../../../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn(), log: jest.fn() },
}));

// Capture onAnimationComplete directly so tests can trigger it without hiding
// the real prop signature behind a native event like onLayout.
let capturedOnAnimationComplete: (() => void) | undefined;

jest.mock(
  '../../UI/FoxLoader',
  () =>
    function MockFoxLoader({
      onAnimationComplete,
    }: {
      appServicesReady: boolean;
      onAnimationComplete: () => void;
    }) {
      capturedOnAnimationComplete = onAnimationComplete;
      return <MockView testID={MOCK_FOX_LOADER_ID}>Fox Loader</MockView>;
    },
);

describe('ControllersGate', () => {
  const mockChildren = (
    <MockView testID={MOCK_CHILDREN_ID}>Test Children</MockView>
  );

  beforeEach(() => {
    capturedOnAnimationComplete = undefined;
  });

  it('renders FoxLoader when appServicesReady is false', () => {
    (useSelector as jest.Mock).mockReturnValue(false);

    render(<ControllersGate>{mockChildren}</ControllersGate>);

    expect(screen.getByTestId(MOCK_FOX_LOADER_ID)).toBeOnTheScreen();
  });

  it('renders children when appServicesReady is true', () => {
    (useSelector as jest.Mock).mockReturnValue(true);

    render(<ControllersGate>{mockChildren}</ControllersGate>);

    expect(screen.getByTestId(MOCK_CHILDREN_ID)).toBeOnTheScreen();
  });

  it('renders FoxLoader overlay until animation completes', () => {
    (useSelector as jest.Mock).mockReturnValue(true);

    render(<ControllersGate>{mockChildren}</ControllersGate>);

    // FoxLoader overlay should still be present before onAnimationComplete fires
    expect(screen.getByTestId(MOCK_FOX_LOADER_ID)).toBeOnTheScreen();
    expect(screen.getByTestId(MOCK_CHILDREN_ID)).toBeOnTheScreen();
  });

  it('removes FoxLoader overlay after animation completes and services are ready', () => {
    jest.useFakeTimers();
    (useSelector as jest.Mock).mockReturnValue(true);

    render(<ControllersGate>{mockChildren}</ControllersGate>);

    // First act: fire onAnimationComplete → setAnimationDone(true) → useEffect starts the fade
    act(() => {
      capturedOnAnimationComplete?.();
    });
    // Second act: let the opacity animation run to completion
    act(() => {
      jest.runAllTimers();
    });

    expect(screen.queryByTestId(MOCK_FOX_LOADER_ID)).toBeNull();
    jest.useRealTimers();
  });

  it('keeps FoxLoader overlay when animation completes but services are not ready', () => {
    jest.useFakeTimers();
    (useSelector as jest.Mock).mockReturnValue(false);

    render(<ControllersGate>{mockChildren}</ControllersGate>);

    act(() => {
      capturedOnAnimationComplete?.();
    });
    act(() => {
      jest.runAllTimers();
    });

    // Overlay must remain — removing it now would show a blank screen
    expect(screen.getByTestId(MOCK_FOX_LOADER_ID)).toBeOnTheScreen();
    jest.useRealTimers();
  });

  it('starts the fade immediately, with no delay before it', () => {
    // Guards a removed 250ms `setTimeout`. A frame-by-frame capture showed that
    // window to be a frozen, pixel-identical blank screen — the Rive exit has
    // already faded the fox out, so there is nothing to settle. Re-introducing
    // a delay here would silently add latency to every cold start.
    jest.useFakeTimers();
    (useSelector as jest.Mock).mockReturnValue(true);
    const timingSpy = jest.spyOn(Animated, 'timing');

    render(<ControllersGate>{mockChildren}</ControllersGate>);

    act(() => {
      capturedOnAnimationComplete?.();
    });

    // The fade must already be running, before any timer is advanced.
    expect(timingSpy).toHaveBeenCalledTimes(1);
    expect(timingSpy.mock.calls[0][1]).toMatchObject({
      toValue: 0,
      duration: 300,
    });

    timingSpy.mockRestore();
    jest.useRealTimers();
  });

  it('still removes the overlay when the tracing layer throws', () => {
    // A throw from tracing must cost a measurement, never the reveal. Without
    // the helper swallowing it, the error escapes the Animated callback before
    // React flushes `setLoaderDone`, and the splash stays up for the rest of
    // the session — so call ordering alone is NOT sufficient here.
    jest.useFakeTimers();
    (useSelector as jest.Mock).mockReturnValue(true);
    (endTrace as jest.Mock).mockImplementationOnce(() => {
      throw new Error('sentry exploded');
    });

    render(<ControllersGate>{mockChildren}</ControllersGate>);

    act(() => {
      capturedOnAnimationComplete?.();
    });
    act(() => {
      jest.runAllTimers();
    });

    expect(screen.queryByTestId(MOCK_FOX_LOADER_ID)).toBeNull();
    expect(screen.getByTestId(MOCK_CHILDREN_ID)).toBeOnTheScreen();
    jest.useRealTimers();
  });
});
