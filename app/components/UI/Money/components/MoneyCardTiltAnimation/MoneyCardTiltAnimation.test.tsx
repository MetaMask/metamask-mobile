import React from 'react';
import { render, act } from '@testing-library/react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { RiveErrorType, type RiveError } from '@rive-app/react-native';
import MoneyCardTiltAnimation from './MoneyCardTiltAnimation';
import { MoneyCardTiltAnimationTestIds } from './MoneyCardTiltAnimation.testIds';
import { useReduceMotion } from '../../hooks/useReduceMotion';
import { useDeviceOrientation } from '../../hooks/useDeviceOrientation';
import { __resetRiveMocks } from '../../../../../__mocks__/rive-app-react-native';
import mmCardRegular from '../../../../../images/mm_card_regular.png';
import mmCardMetal from '../../../../../images/mm_card_metal.png';

// The component writes tilt values through cached `instance.numberProperty()`
// handles (not `useRiveNumber`), so the local mock provides a view-model
// instance exposing `numberProperty` whose `.set()` records into
// `mockSetNumber(path, value)`. The RiveView wrapper additionally captures
// props (artboardName/style/onError) and counts mounts for the
// remount-per-variant contract.
const mockSetNumber = jest.fn();
const mockNumberProperty = jest.fn((path: string) => ({
  set: (value: number) => mockSetNumber(path, value),
}));
let mockInstanceReady = true;
const mockRiveViewProps: {
  current?: {
    testID?: string;
    artboardName?: string;
    style?: StyleProp<ViewStyle>;
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
    style?: StyleProp<ViewStyle>;
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

describe('MoneyCardTiltAnimation', () => {
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

  it('renders the Rive animation when the flag is on and reduce motion is off', () => {
    const { getByTestId, queryByTestId } = render(
      <MoneyCardTiltAnimation isMetalCard={false} />,
    );

    expect(getByTestId(MoneyCardTiltAnimationTestIds.RIVE)).toBeOnTheScreen();
    expect(
      queryByTestId(MoneyCardTiltAnimationTestIds.STATIC_IMAGE),
    ).toBeNull();
  });

  it('renders the digital tilt artboard for a virtual card', () => {
    render(<MoneyCardTiltAnimation isMetalCard={false} />);

    expect(mockRiveViewProps.current?.artboardName).toBe('CardTiltDigital');
  });

  it('renders the metal tilt artboard for a metal card', () => {
    render(<MoneyCardTiltAnimation isMetalCard />);

    expect(mockRiveViewProps.current?.artboardName).toBe('CardTiltMetal');
  });

  it('renders the static image when the feature flag is disabled', () => {
    mockUseSelector.mockReturnValue(false);

    const { getByTestId, queryByTestId } = render(
      <MoneyCardTiltAnimation isMetalCard={false} />,
    );

    expect(
      getByTestId(MoneyCardTiltAnimationTestIds.STATIC_IMAGE),
    ).toBeOnTheScreen();
    expect(queryByTestId(MoneyCardTiltAnimationTestIds.RIVE)).toBeNull();
  });

  it('renders the static image when reduce motion is enabled', () => {
    mockUseReduceMotion.mockReturnValue(true);

    const { getByTestId, queryByTestId } = render(
      <MoneyCardTiltAnimation isMetalCard={false} />,
    );

    expect(
      getByTestId(MoneyCardTiltAnimationTestIds.STATIC_IMAGE),
    ).toBeOnTheScreen();
    expect(queryByTestId(MoneyCardTiltAnimationTestIds.RIVE)).toBeNull();
  });

  it('falls back to the static image when Rive reports an error', () => {
    const { getByTestId, queryByTestId } = render(
      <MoneyCardTiltAnimation isMetalCard={false} />,
    );

    act(() =>
      mockRiveViewProps.current?.onError?.({
        message: 'boom',
        type: RiveErrorType.Unknown,
      }),
    );

    expect(
      getByTestId(MoneyCardTiltAnimationTestIds.STATIC_IMAGE),
    ).toBeOnTheScreen();
    expect(queryByTestId(MoneyCardTiltAnimationTestIds.RIVE)).toBeNull();
  });

  it('uses the metal card image as static fallback for a metal card', () => {
    mockUseSelector.mockReturnValue(false);

    const { getByTestId } = render(<MoneyCardTiltAnimation isMetalCard />);

    expect(
      getByTestId(MoneyCardTiltAnimationTestIds.STATIC_IMAGE).props.source,
    ).toBe(mmCardMetal);
  });

  it('uses the regular card image as static fallback for a virtual card', () => {
    mockUseSelector.mockReturnValue(false);

    const { getByTestId } = render(
      <MoneyCardTiltAnimation isMetalCard={false} />,
    );

    expect(
      getByTestId(MoneyCardTiltAnimationTestIds.STATIC_IMAGE).props.source,
    ).toBe(mmCardRegular);
  });

  it('enables the device tilt callback when animating', () => {
    render(<MoneyCardTiltAnimation isMetalCard={false} />);

    expect(mockUseDeviceOrientation).toHaveBeenCalledWith(
      expect.any(Function),
      {
        enabled: true,
      },
    );
  });

  it('disables the device tilt callback when not animating', () => {
    mockUseReduceMotion.mockReturnValue(true);

    render(<MoneyCardTiltAnimation isMetalCard={false} />);

    expect(mockUseDeviceOrientation).toHaveBeenCalledWith(
      expect.any(Function),
      {
        enabled: false,
      },
    );
  });

  it('drives the bound Rive number properties from mapped tilt values', () => {
    render(<MoneyCardTiltAnimation isMetalCard={false} />);

    act(() => latestApplyTilt()(1, 1));

    expect(mockSetNumber).toHaveBeenCalledWith('xValue', 100);
    expect(mockSetNumber).toHaveBeenCalledWith('yValue', 0);
  });

  it('drives a partial tilt past the raw curve reported by the hook', () => {
    render(<MoneyCardTiltAnimation isMetalCard={false} />);

    act(() => latestApplyTilt()(0.5, 0));

    // The hook reports an already-squared tilt, so 0.5 means the device is
    // ~71% of the way through its travel. Mapping it straight through would
    // under-read at 75; the shaping recovers the real angle.
    const [, xValue] = mockSetNumber.mock.calls.find(
      ([property]) => property === 'xValue',
    ) as [string, number];
    expect(xValue).toBeGreaterThan(75);
    expect(xValue).toBeLessThan(100);
  });

  it('does not dispatch tilt values before the view-model instance is ready', () => {
    mockInstanceReady = false;
    render(<MoneyCardTiltAnimation isMetalCard={false} />);

    act(() => latestApplyTilt()(0.5, -0.5));

    expect(mockSetNumber).not.toHaveBeenCalled();
  });

  it('remounts the Rive view when the card variant changes', () => {
    const { rerender } = render(<MoneyCardTiltAnimation isMetalCard={false} />);

    rerender(<MoneyCardTiltAnimation isMetalCard />);

    expect(mockMountCount.current).toBe(2);
  });

  it('keeps the Rive view mounted when re-rendered with the same variant', () => {
    const { rerender } = render(<MoneyCardTiltAnimation isMetalCard={false} />);

    rerender(<MoneyCardTiltAnimation isMetalCard={false} testID="renamed" />);

    expect(mockMountCount.current).toBe(1);
  });

  it('applies the provided testID to the container', () => {
    const { getByTestId } = render(
      <MoneyCardTiltAnimation isMetalCard={false} testID="custom-tilt-id" />,
    );

    expect(getByTestId('custom-tilt-id')).toBeOnTheScreen();
  });

  it('applies the default container testID when none is provided', () => {
    const { getByTestId } = render(
      <MoneyCardTiltAnimation isMetalCard={false} />,
    );

    expect(
      getByTestId(MoneyCardTiltAnimationTestIds.CONTAINER),
    ).toBeOnTheScreen();
  });

  describe('sizing', () => {
    it('falls back to the Money home thumbnail size', () => {
      const { getByTestId } = render(
        <MoneyCardTiltAnimation isMetalCard={false} />,
      );

      expect(getByTestId(MoneyCardTiltAnimationTestIds.CONTAINER)).toHaveStyle({
        width: 104,
        height: 66,
      });
    });

    it('sizes the container and the Rive view from the props', () => {
      const { getByTestId } = render(
        <MoneyCardTiltAnimation isMetalCard={false} width={111} height={70} />,
      );

      expect(getByTestId(MoneyCardTiltAnimationTestIds.CONTAINER)).toHaveStyle({
        width: 111,
        height: 70,
      });
      expect(mockRiveViewProps.current?.style).toEqual({
        width: 111,
        height: 70,
      });
    });

    it('sizes the static fallback image from the props', () => {
      mockUseSelector.mockReturnValue(false);

      const { getByTestId } = render(
        <MoneyCardTiltAnimation isMetalCard={false} width={111} height={70} />,
      );

      expect(
        getByTestId(MoneyCardTiltAnimationTestIds.STATIC_IMAGE),
      ).toHaveStyle({ width: 111, height: 70, borderRadius: 6 });
    });
  });
});
