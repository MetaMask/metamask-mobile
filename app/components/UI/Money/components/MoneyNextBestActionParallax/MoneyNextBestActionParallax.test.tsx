import React from 'react';
import { render, act } from '@testing-library/react-native';
import { RiveErrorType, type RiveError } from '@rive-app/react-native';
import MoneyNextBestActionParallax from './MoneyNextBestActionParallax';
import { MoneyNextBestActionParallaxTestIds } from './MoneyNextBestActionParallax.testIds';
import { useReduceMotion } from '../../hooks/useReduceMotion';
import { useDeviceOrientation } from '../../hooks/useDeviceOrientation';
import { PARALLAX_REST_VALUE } from '../../utils/parallax';
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
const mockRiveViewProps: {
  current?: {
    testID?: string;
    artboardName?: string;
    onError?: (error: RiveError) => void;
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
  }) => {
    ReactActual.useEffect(() => {
      mockMountCount.current += 1;
    }, []);
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
  useReduceMotion: jest.fn(),
}));

jest.mock('../../hooks/useDeviceOrientation', () => ({
  useDeviceOrientation: jest.fn(),
}));

const mockUseReduceMotion = useReduceMotion as jest.Mock;
const mockUseDeviceOrientation = useDeviceOrientation as jest.Mock;

const latestApplyTilt = (): ((x: number, y: number) => void) =>
  mockUseDeviceOrientation.mock.calls[
    mockUseDeviceOrientation.mock.calls.length - 1
  ][0];

describe('MoneyNextBestActionParallax', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetRiveMocks();
    mockRiveViewProps.current = undefined;
    mockMountCount.current = 0;
    mockInstanceReady = true;
    mockNumberProperty.mockImplementation((path: string) => ({
      set: (value: number) => mockSetNumber(path, value),
    }));
    mockUseSelector.mockReturnValue(true);
    mockUseReduceMotion.mockReturnValue(false);
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
    mockUseReduceMotion.mockReturnValue(true);

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
    mockUseReduceMotion.mockReturnValue(true);

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
    mockUseReduceMotion.mockReturnValue(true);

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

  it('dispatches the mapped roll to the Rive xValue property', () => {
    render(
      <MoneyNextBestActionParallax
        artboardName="Parallax Block 1"
        fallbackImage={fallbackImage}
      />,
    );

    act(() => latestApplyTilt()(0.5, -0.5));

    expect(mockSetNumber).toHaveBeenCalledWith('xValue', 75);
  });

  it('dispatches the inverted pitch to the Rive yValue property', () => {
    render(
      <MoneyNextBestActionParallax
        artboardName="Parallax Block 1"
        fallbackImage={fallbackImage}
      />,
    );

    act(() => latestApplyTilt()(0.5, -0.5));

    expect(mockSetNumber).toHaveBeenCalledWith('yValue', 75);
  });

  it('drives yValue below the resting value for a positive pitch', () => {
    render(
      <MoneyNextBestActionParallax
        artboardName="Parallax Block 1"
        fallbackImage={fallbackImage}
      />,
    );

    act(() => latestApplyTilt()(0, 0.5));

    const [, yValue] = mockSetNumber.mock.calls.find(
      ([path]) => path === 'yValue',
    ) as [string, number];
    expect(yValue).toBeLessThan(PARALLAX_REST_VALUE);
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
