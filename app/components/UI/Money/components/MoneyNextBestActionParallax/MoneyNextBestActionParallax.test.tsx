import React from 'react';
import { render, act } from '@testing-library/react-native';
import { RiveErrorType, type RiveError } from '@rive-app/react-native';
import MoneyNextBestActionParallax from './MoneyNextBestActionParallax';
import { MoneyNextBestActionParallaxTestIds } from './MoneyNextBestActionParallax.testIds';
import { useReduceMotionState } from '../../hooks/useReduceMotion';
import { getHardwareTier } from '../../../../../util/deviceCapability';
import { useDeviceOrientation } from '../../hooks/useDeviceOrientation';
import {
  PARALLAX_REST_VALUE,
  PARALLAX_SMOOTHING_REFERENCE_HZ,
  PARALLAX_TILT_DEADZONE,
  RIVE_TILT_WRITE_EPSILON,
  pitchToParallaxValue,
  shapeParallaxTilt,
  tiltToParallaxValue,
} from '../../utils/parallax';
import { __resetRiveMocks } from '../../../../../__mocks__/rive-app-react-native';
import fallbackImage from '../../../../../images/money-onboarding-stepper-step-1.png';

// The component writes tilt values through cached `instance.numberProperty()`
// handles (not `useRiveNumber`), so the local mock provides a view-model
// instance exposing `numberProperty` whose `.set()` records into
// `mockSetNumber(path, value)`. The RiveView wrapper additionally captures
// props (artboardName/onError) and counts mounts for the remount-per-artboard
// contract.
const mockSetNumber = jest.fn();
const mockNumberProperty = jest.fn((path: string) => ({
  set: (value: number) => mockSetNumber(path, value),
}));
let mockInstanceReady = true;
let mockViewReady = true;
const mockRiveViewRefValue = { playIfNeeded: jest.fn() };
const mockSetHybridRef = { f: jest.fn() };
let mockRiveFileResult: {
  riveFile: unknown;
  isLoading: boolean;
  error: Error | null;
} = {
  riveFile: { id: 'mock-rive-file' },
  isLoading: false,
  error: null,
};
const mockRiveViewProps: {
  current?: {
    testID?: string;
    artboardName?: string;
    onError?: (error: RiveError) => void;
    hybridRef?: { f: (ref: unknown) => void };
  };
} = {};
const mockMountCount = { current: 0 };

jest.mock('@rive-app/react-native', () => {
  const actual = jest.requireActual('@rive-app/react-native');
  const ReactActual = jest.requireActual('react');
  const MockRiveView = (props: {
    testID?: string;
    artboardName?: string;
    onError?: (error: RiveError) => void;
    hybridRef?: { f: (ref: unknown) => void };
  }) => {
    ReactActual.useEffect(() => {
      mockMountCount.current += 1;
    }, []);
    // Stand-in for the native view handing back its ref on mount.
    ReactActual.useEffect(() => {
      props.hybridRef?.f(mockRiveViewRefValue);
    }, [props.hybridRef]);
    // Captured in a per-render effect (not during render) to keep the
    // react-compiler happy about external writes.
    ReactActual.useEffect(() => {
      mockRiveViewProps.current = props;
    });
    return ReactActual.createElement(actual.RiveView, props);
  };
  return {
    __esModule: true,
    ...actual,
    useRiveFile: () => mockRiveFileResult,
    useRive: () => ({
      riveRef: { current: null },
      riveViewRef: mockViewReady ? mockRiveViewRefValue : undefined,
      setHybridRef: mockSetHybridRef,
    }),
    useViewModelInstance: () => ({
      instance: mockInstanceReady
        ? { numberProperty: mockNumberProperty }
        : null,
      isLoading: !mockInstanceReady,
      error: null,
    }),
    RiveView: MockRiveView,
  };
});

const mockUseSelector = jest.fn();
jest.mock('react-redux', () => ({
  useSelector: (selector: unknown) => mockUseSelector(selector),
}));

jest.mock('../../hooks/useReduceMotion', () => ({
  useReduceMotionState: jest.fn(),
}));

jest.mock('../../../../../util/deviceCapability', () => ({
  getHardwareTier: jest.fn(),
}));

jest.mock('../../hooks/useDeviceOrientation', () => ({
  useDeviceOrientation: jest.fn(),
}));

const mockUseReduceMotionState = useReduceMotionState as jest.Mock;
const mockGetHardwareTier = getHardwareTier as jest.Mock;
const mockUseDeviceOrientation = useDeviceOrientation as jest.Mock;

const registeredApplyTilt = (): ((x: number, y: number, hz: number) => void) =>
  mockUseDeviceOrientation.mock.calls[
    mockUseDeviceOrientation.mock.calls.length - 1
  ][0];

/** The registered tilt callback, bound to a sample rate the hook would report. */
const latestApplyTilt =
  (hz: number = PARALLAX_SMOOTHING_REFERENCE_HZ) =>
  (x: number, y: number): void =>
    registeredApplyTilt()(x, y, hz);

/** Feeds the same reading for long enough that the smoothing has settled. */
const holdTilt = (x: number, y: number, samples = 200): void => {
  const applyTilt = latestApplyTilt();
  act(() => {
    for (let i = 0; i < samples; i++) applyTilt(x, y);
  });
};

const lastValueFor = (path: string): number | undefined =>
  mockSetNumber.mock.calls.filter(([name]) => name === path).pop()?.[1];

/**
 * The writer skips dispatches too small to be seen, so the last steps of an
 * ease never reach the artboard and it settles just short of the target.
 */
const expectSettledNear = (path: string, expected: number): void => {
  expect(Math.abs((lastValueFor(path) as number) - expected)).toBeLessThan(
    RIVE_TILT_WRITE_EPSILON,
  );
};

describe('MoneyNextBestActionParallax', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    __resetRiveMocks();
    mockRiveViewProps.current = undefined;
    mockMountCount.current = 0;
    mockInstanceReady = true;
    mockViewReady = true;
    mockRiveFileResult = {
      riveFile: { id: 'mock-rive-file' },
      isLoading: false,
      error: null,
    };
    mockNumberProperty.mockImplementation((path: string) => ({
      set: (value: number) => mockSetNumber(path, value),
    }));
    mockUseSelector.mockReturnValue(true);
    mockUseReduceMotionState.mockReturnValue(false);
    mockGetHardwareTier.mockReturnValue('HIGH');
  });

  it('renders the Rive animation when enabled and reduce motion is off', () => {
    const { getByTestId, queryByTestId } = render(
      <MoneyNextBestActionParallax
        artboardName="Parallax Block 1"
        fallbackImage={fallbackImage}
      />,
    );

    expect(
      getByTestId(MoneyNextBestActionParallaxTestIds.RIVE),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(MoneyNextBestActionParallaxTestIds.STATIC_IMAGE),
    ).toBeNull();
  });

  it('withholds the card until the native Rive view is ready', () => {
    mockViewReady = false;

    const { getByTestId, queryByTestId } = render(
      <MoneyNextBestActionParallax
        artboardName="Parallax Block 1"
        fallbackImage={fallbackImage}
      />,
    );

    expect(
      getByTestId(MoneyNextBestActionParallaxTestIds.CONTAINER),
    ).toHaveStyle({ opacity: 0 });
    expect(
      queryByTestId(MoneyNextBestActionParallaxTestIds.STATIC_IMAGE),
    ).toBeNull();
  });

  it('reveals the card once the native view becomes ready', () => {
    mockViewReady = false;

    const { getByTestId, rerender } = render(
      <MoneyNextBestActionParallax
        artboardName="Parallax Block 1"
        fallbackImage={fallbackImage}
      />,
    );

    expect(
      getByTestId(MoneyNextBestActionParallaxTestIds.CONTAINER),
    ).toHaveStyle({ opacity: 0 });

    mockViewReady = true;
    rerender(
      <MoneyNextBestActionParallax
        artboardName="Parallax Block 1"
        fallbackImage={fallbackImage}
      />,
    );

    expect(
      getByTestId(MoneyNextBestActionParallaxTestIds.CONTAINER),
    ).not.toHaveStyle({ opacity: 0 });
    expect(
      getByTestId(MoneyNextBestActionParallaxTestIds.RIVE),
    ).toBeOnTheScreen();
    expect(
      getByTestId(MoneyNextBestActionParallaxTestIds.BACKGROUND),
    ).toBeOnTheScreen();
  });

  it('wires the Rive view to the hook that reports readiness', () => {
    render(
      <MoneyNextBestActionParallax
        artboardName="Parallax Block 1"
        fallbackImage={fallbackImage}
      />,
    );

    expect(mockSetHybridRef.f).toHaveBeenCalledWith(mockRiveViewRefValue);
  });

  it('does not fall back to the static image once the card is ready', () => {
    jest.useFakeTimers();
    mockViewReady = false;

    const { getByTestId, queryByTestId, rerender } = render(
      <MoneyNextBestActionParallax
        artboardName="Parallax Block 1"
        fallbackImage={fallbackImage}
      />,
    );

    mockViewReady = true;
    rerender(
      <MoneyNextBestActionParallax
        artboardName="Parallax Block 1"
        fallbackImage={fallbackImage}
      />,
    );

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(
      getByTestId(MoneyNextBestActionParallaxTestIds.RIVE),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(MoneyNextBestActionParallaxTestIds.STATIC_IMAGE),
    ).toBeNull();
    expect(
      getByTestId(MoneyNextBestActionParallaxTestIds.CONTAINER),
    ).not.toHaveStyle({ opacity: 0 });
  });

  it('withholds the card again when the artboard changes', () => {
    const { getByTestId, rerender } = render(
      <MoneyNextBestActionParallax
        artboardName="Parallax Block 1"
        fallbackImage={fallbackImage}
      />,
    );

    expect(
      getByTestId(MoneyNextBestActionParallaxTestIds.CONTAINER),
    ).not.toHaveStyle({ opacity: 0 });

    mockViewReady = false;
    rerender(
      <MoneyNextBestActionParallax
        artboardName="Parallax Block 2"
        fallbackImage={fallbackImage}
      />,
    );

    expect(
      getByTestId(MoneyNextBestActionParallaxTestIds.CONTAINER),
    ).toHaveStyle({ opacity: 0 });
  });

  it('withholds the card while the Rive file is loading', () => {
    mockRiveFileResult = { riveFile: undefined, isLoading: true, error: null };

    const { getByTestId, queryByTestId } = render(
      <MoneyNextBestActionParallax
        artboardName="Parallax Block 1"
        fallbackImage={fallbackImage}
      />,
    );

    expect(
      getByTestId(MoneyNextBestActionParallaxTestIds.CONTAINER),
    ).toHaveStyle({ opacity: 0 });
    expect(queryByTestId(MoneyNextBestActionParallaxTestIds.RIVE)).toBeNull();
    expect(
      queryByTestId(MoneyNextBestActionParallaxTestIds.STATIC_IMAGE),
    ).toBeNull();
  });

  it('withholds the card while reduce motion is unresolved', () => {
    mockUseReduceMotionState.mockReturnValue(null);

    const { getByTestId, queryByTestId } = render(
      <MoneyNextBestActionParallax
        artboardName="Parallax Block 1"
        fallbackImage={fallbackImage}
      />,
    );

    expect(
      getByTestId(MoneyNextBestActionParallaxTestIds.CONTAINER),
    ).toBeOnTheScreen();
    expect(queryByTestId(MoneyNextBestActionParallaxTestIds.RIVE)).toBeNull();
    expect(
      queryByTestId(MoneyNextBestActionParallaxTestIds.STATIC_IMAGE),
    ).toBeNull();
  });

  it('renders the fallback image when the Rive file fails to load', () => {
    mockRiveFileResult = {
      riveFile: null,
      isLoading: false,
      error: new Error('boom'),
    };

    const { getByTestId, queryByTestId } = render(
      <MoneyNextBestActionParallax
        artboardName="Parallax Block 1"
        fallbackImage={fallbackImage}
      />,
    );

    expect(
      getByTestId(MoneyNextBestActionParallaxTestIds.STATIC_IMAGE),
    ).toBeOnTheScreen();
    expect(queryByTestId(MoneyNextBestActionParallaxTestIds.RIVE)).toBeNull();
  });

  it('falls back to the static image when the native view never resolves', () => {
    jest.useFakeTimers();
    mockViewReady = false;

    const { getByTestId, queryByTestId } = render(
      <MoneyNextBestActionParallax
        artboardName="Parallax Block 1"
        fallbackImage={fallbackImage}
      />,
    );

    expect(
      queryByTestId(MoneyNextBestActionParallaxTestIds.STATIC_IMAGE),
    ).toBeNull();

    act(() => {
      jest.advanceTimersByTime(1500);
    });

    expect(
      getByTestId(MoneyNextBestActionParallaxTestIds.STATIC_IMAGE),
    ).toBeOnTheScreen();
    expect(queryByTestId(MoneyNextBestActionParallaxTestIds.RIVE)).toBeNull();
  });

  it('renders the fallback image on a LOW hardware tier', () => {
    mockGetHardwareTier.mockReturnValue('LOW');

    const { getByTestId, queryByTestId } = render(
      <MoneyNextBestActionParallax
        artboardName="Parallax Block 1"
        fallbackImage={fallbackImage}
      />,
    );

    expect(
      getByTestId(MoneyNextBestActionParallaxTestIds.STATIC_IMAGE),
    ).toBeOnTheScreen();
    expect(queryByTestId(MoneyNextBestActionParallaxTestIds.RIVE)).toBeNull();
  });

  it('renders the Rive animation when the hardware tier is unknown', () => {
    mockGetHardwareTier.mockReturnValue(null);

    const { getByTestId } = render(
      <MoneyNextBestActionParallax
        artboardName="Parallax Block 1"
        fallbackImage={fallbackImage}
      />,
    );

    expect(
      getByTestId(MoneyNextBestActionParallaxTestIds.RIVE),
    ).toBeOnTheScreen();
  });

  it('renders the gradient background behind the Rive when animating', () => {
    const { getByTestId } = render(
      <MoneyNextBestActionParallax
        artboardName="Parallax Block 1"
        fallbackImage={fallbackImage}
      />,
    );

    expect(
      getByTestId(MoneyNextBestActionParallaxTestIds.BACKGROUND),
    ).toBeOnTheScreen();
  });

  it('passes the given artboard name through to Rive', () => {
    render(
      <MoneyNextBestActionParallax
        artboardName="Parallax Block 2"
        fallbackImage={fallbackImage}
      />,
    );

    expect(mockRiveViewProps.current?.artboardName).toBe('Parallax Block 2');
  });

  it('does not render the gradient background behind the fallback image', () => {
    mockUseReduceMotionState.mockReturnValue(true);

    const { queryByTestId } = render(
      <MoneyNextBestActionParallax
        artboardName="Parallax Block 1"
        fallbackImage={fallbackImage}
      />,
    );

    expect(
      queryByTestId(MoneyNextBestActionParallaxTestIds.BACKGROUND),
    ).toBeNull();
  });

  it('renders the fallback image when the feature flag is disabled', () => {
    mockUseSelector.mockReturnValue(false);

    const { getByTestId, queryByTestId } = render(
      <MoneyNextBestActionParallax
        artboardName="Parallax Block 1"
        fallbackImage={fallbackImage}
      />,
    );

    expect(
      getByTestId(MoneyNextBestActionParallaxTestIds.STATIC_IMAGE),
    ).toBeOnTheScreen();
    expect(queryByTestId(MoneyNextBestActionParallaxTestIds.RIVE)).toBeNull();
  });

  it('renders the fallback image (with the provided source) when reduce motion is enabled', () => {
    mockUseReduceMotionState.mockReturnValue(true);

    const { getByTestId, queryByTestId } = render(
      <MoneyNextBestActionParallax
        artboardName="Parallax Block 1"
        fallbackImage={fallbackImage}
      />,
    );

    expect(
      getByTestId(MoneyNextBestActionParallaxTestIds.STATIC_IMAGE).props.source,
    ).toBe(fallbackImage);
    expect(queryByTestId(MoneyNextBestActionParallaxTestIds.RIVE)).toBeNull();
  });

  it('enables the device tilt callback when animating', () => {
    render(
      <MoneyNextBestActionParallax
        artboardName="Parallax Block 1"
        fallbackImage={fallbackImage}
      />,
    );

    expect(mockUseDeviceOrientation).toHaveBeenCalledWith(
      expect.any(Function),
      {
        enabled: true,
      },
    );
  });

  it('disables the device tilt callback when not animating', () => {
    mockUseReduceMotionState.mockReturnValue(true);

    render(
      <MoneyNextBestActionParallax
        artboardName="Parallax Block 1"
        fallbackImage={fallbackImage}
      />,
    );

    expect(mockUseDeviceOrientation).toHaveBeenCalledWith(
      expect.any(Function),
      {
        enabled: false,
      },
    );
  });

  it('settles xValue on the shaped roll when the tilt is held', () => {
    render(
      <MoneyNextBestActionParallax
        artboardName="Parallax Block 1"
        fallbackImage={fallbackImage}
      />,
    );

    holdTilt(0.5, -0.5);

    expectSettledNear('xValue', tiltToParallaxValue(shapeParallaxTilt(0.5)));
  });

  it('settles yValue on the inverted shaped pitch when the tilt is held', () => {
    render(
      <MoneyNextBestActionParallax
        artboardName="Parallax Block 1"
        fallbackImage={fallbackImage}
      />,
    );

    holdTilt(0.5, -0.5);

    expectSettledNear('yValue', pitchToParallaxValue(shapeParallaxTilt(-0.5)));
  });

  it('drives yValue below the resting value for a positive pitch', () => {
    render(
      <MoneyNextBestActionParallax
        artboardName="Parallax Block 1"
        fallbackImage={fallbackImage}
      />,
    );

    holdTilt(0, 0.5);

    expect(lastValueFor('yValue')).toBeLessThan(PARALLAX_REST_VALUE);
  });

  it('leaves the artboard at rest while the device is only jittering', () => {
    render(
      <MoneyNextBestActionParallax
        artboardName="Parallax Block 1"
        fallbackImage={fallbackImage}
      />,
    );

    // Alternating tremor inside the deadzone, as the hook would report it.
    const tremor = (PARALLAX_TILT_DEADZONE * 0.9) ** 2;
    const applyTilt = latestApplyTilt();
    act(() => {
      for (let i = 0; i < 60; i++) {
        applyTilt(
          i % 2 === 0 ? tremor : -tremor,
          i % 2 === 0 ? -tremor : tremor,
        );
      }
    });

    expect(lastValueFor('xValue')).toBeCloseTo(PARALLAX_REST_VALUE, 6);
    expect(lastValueFor('yValue')).toBeCloseTo(PARALLAX_REST_VALUE, 6);
  });

  it('stops dispatching once a held tilt has settled', () => {
    render(
      <MoneyNextBestActionParallax
        artboardName="Parallax Block 1"
        fallbackImage={fallbackImage}
      />,
    );

    holdTilt(0.5, -0.5);
    mockSetNumber.mockClear();
    holdTilt(0.5, -0.5);

    expect(mockSetNumber).not.toHaveBeenCalled();
  });

  it('does not dispatch at all for a device lying still', () => {
    render(
      <MoneyNextBestActionParallax
        artboardName="Parallax Block 1"
        fallbackImage={fallbackImage}
      />,
    );

    const applyTilt = latestApplyTilt();
    act(() => {
      for (let i = 0; i < 60; i++) applyTilt(0, 0);
    });

    // One write per axis puts the artboard at rest; the rest of the stream is
    // identical and must cost nothing.
    expect(mockSetNumber).toHaveBeenCalledTimes(2);
  });

  it('settles in the same wall-clock time on the low-end sample rate', () => {
    const { unmount } = render(
      <MoneyNextBestActionParallax
        artboardName="Parallax Block 1"
        fallbackImage={fallbackImage}
      />,
    );

    // A third of a second of samples at each rate.
    act(() => {
      const applyTilt = latestApplyTilt(60);
      for (let i = 0; i < 20; i++) applyTilt(1, 0);
    });
    const atDefaultRate = lastValueFor('xValue') as number;

    unmount();
    mockSetNumber.mockClear();
    render(
      <MoneyNextBestActionParallax
        artboardName="Parallax Block 1"
        fallbackImage={fallbackImage}
      />,
    );

    act(() => {
      const applyTilt = latestApplyTilt(30);
      for (let i = 0; i < 10; i++) applyTilt(1, 0);
    });

    expectSettledNear('xValue', atDefaultRate);
  });

  it('eases into a new tilt rather than jumping to it', () => {
    render(
      <MoneyNextBestActionParallax
        artboardName="Parallax Block 1"
        fallbackImage={fallbackImage}
      />,
    );

    act(() => latestApplyTilt()(1, 0));

    const settled = tiltToParallaxValue(shapeParallaxTilt(1));
    const firstStep = lastValueFor('xValue') as number;
    expect(firstStep).toBeGreaterThan(PARALLAX_REST_VALUE);
    expect(firstStep).toBeLessThan(settled);
  });

  it('starts a new artboard from rest rather than the previous tilt', () => {
    const { rerender } = render(
      <MoneyNextBestActionParallax
        artboardName="Parallax Block 1"
        fallbackImage={fallbackImage}
      />,
    );

    holdTilt(1, 0);
    rerender(
      <MoneyNextBestActionParallax
        artboardName="Parallax Block 2"
        fallbackImage={fallbackImage}
      />,
    );
    mockSetNumber.mockClear();
    act(() => latestApplyTilt()(0, 0));

    expect(lastValueFor('xValue')).toBe(PARALLAX_REST_VALUE);
  });

  it('starts from rest again after animation is disabled and resumed', () => {
    const { rerender } = render(
      <MoneyNextBestActionParallax
        artboardName="Parallax Block 1"
        fallbackImage={fallbackImage}
      />,
    );

    holdTilt(1, 0);
    mockUseReduceMotionState.mockReturnValue(true);
    rerender(
      <MoneyNextBestActionParallax
        artboardName="Parallax Block 1"
        fallbackImage={fallbackImage}
      />,
    );
    mockUseReduceMotionState.mockReturnValue(false);
    rerender(
      <MoneyNextBestActionParallax
        artboardName="Parallax Block 1"
        fallbackImage={fallbackImage}
      />,
    );
    mockSetNumber.mockClear();
    act(() => latestApplyTilt()(0, 0));

    expect(lastValueFor('xValue')).toBe(PARALLAX_REST_VALUE);
  });

  it('does not dispatch tilt values before the view-model instance is ready', () => {
    mockInstanceReady = false;
    render(
      <MoneyNextBestActionParallax
        artboardName="Parallax Block 1"
        fallbackImage={fallbackImage}
      />,
    );

    act(() => latestApplyTilt()(0.5, -0.5));

    expect(mockSetNumber).not.toHaveBeenCalled();
  });

  it('does not dispatch tilt values when the artboard has no parallax properties', () => {
    mockNumberProperty.mockReturnValue(
      undefined as unknown as ReturnType<typeof mockNumberProperty>,
    );
    render(
      <MoneyNextBestActionParallax
        artboardName="Parallax Block 1"
        fallbackImage={fallbackImage}
      />,
    );

    act(() => latestApplyTilt()(0.5, -0.5));

    expect(mockSetNumber).not.toHaveBeenCalled();
  });

  it('remounts the Rive view when the artboard changes', () => {
    const { rerender } = render(
      <MoneyNextBestActionParallax
        artboardName="Parallax Block 1"
        fallbackImage={fallbackImage}
      />,
    );

    rerender(
      <MoneyNextBestActionParallax
        artboardName="Parallax Block 2"
        fallbackImage={fallbackImage}
      />,
    );

    expect(mockMountCount.current).toBe(2);
  });

  it('keeps the Rive view mounted when re-rendered with the same artboard', () => {
    const { rerender } = render(
      <MoneyNextBestActionParallax
        artboardName="Parallax Block 1"
        fallbackImage={fallbackImage}
        testID="parallax-block"
      />,
    );

    rerender(
      <MoneyNextBestActionParallax
        artboardName="Parallax Block 1"
        fallbackImage={fallbackImage}
        testID="parallax-block-renamed"
      />,
    );

    expect(mockMountCount.current).toBe(1);
  });

  it('falls back to the static image when Rive reports an error', () => {
    const { getByTestId, queryByTestId } = render(
      <MoneyNextBestActionParallax
        artboardName="Parallax Block 1"
        fallbackImage={fallbackImage}
      />,
    );

    act(() =>
      mockRiveViewProps.current?.onError?.({
        message: 'boom',
        type: RiveErrorType.Unknown,
      }),
    );

    expect(
      getByTestId(MoneyNextBestActionParallaxTestIds.STATIC_IMAGE),
    ).toBeOnTheScreen();
    expect(queryByTestId(MoneyNextBestActionParallaxTestIds.RIVE)).toBeNull();
  });

  it('animates again on a different artboard after the previous one errored', () => {
    const { getByTestId, queryByTestId, rerender } = render(
      <MoneyNextBestActionParallax
        artboardName="Parallax Block 1"
        fallbackImage={fallbackImage}
      />,
    );
    act(() =>
      mockRiveViewProps.current?.onError?.({
        message: 'boom',
        type: RiveErrorType.Unknown,
      }),
    );
    expect(queryByTestId(MoneyNextBestActionParallaxTestIds.RIVE)).toBeNull();

    rerender(
      <MoneyNextBestActionParallax
        artboardName="Parallax Block 2"
        fallbackImage={fallbackImage}
      />,
    );

    expect(
      getByTestId(MoneyNextBestActionParallaxTestIds.RIVE),
    ).toBeOnTheScreen();
  });
});
