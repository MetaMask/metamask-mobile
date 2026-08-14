import React from 'react';
import { render, act } from '@testing-library/react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import MoneyCardTiltAnimation from './MoneyCardTiltAnimation';
import { MoneyCardTiltAnimationTestIds } from './MoneyCardTiltAnimation.testIds';
import { useReduceMotion } from '../../hooks/useReduceMotion';
import { useDeviceOrientation } from '../../hooks/useDeviceOrientation';
import mmCardRegular from '../../../../../images/mm_card_regular.png';
import mmCardMetal from '../../../../../images/mm_card_metal.png';

const mockSetNumber = jest.fn();
const mockTrigger = jest.fn();
const mockOnPlayRef: { current?: () => void } = {};
const mockViewTag = jest.fn((): number | null => 1);
const mockOnErrorRef: { current?: (error: { message: string }) => void } = {};
const mockRiveProps: {
  current?: { artboardName?: string; style?: StyleProp<ViewStyle> };
} = {};
const mockMountCount = { current: 0 };

jest.mock('rive-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const { View: RNView } = jest.requireActual('react-native');
  return {
    __esModule: true,
    AutoBind: jest.fn(() => ({})),
    Fit: { Contain: 'contain' },
    default: ReactActual.forwardRef(
      (
        props: {
          testID?: string;
          artboardName?: string;
          style?: StyleProp<ViewStyle>;
          onError?: (error: { message: string }) => void;
          onPlay?: () => void;
        },
        ref: React.Ref<{
          setNumber: (path: string, value: number) => void;
          trigger: (path: string) => void;
          viewTag: () => number | null;
        }>,
      ) => {
        mockOnErrorRef.current = props.onError;
        mockOnPlayRef.current = props.onPlay;
        mockRiveProps.current = {
          artboardName: props.artboardName,
          style: props.style,
        };
        ReactActual.useImperativeHandle(ref, () => ({
          setNumber: mockSetNumber,
          trigger: mockTrigger,
          viewTag: mockViewTag,
        }));
        ReactActual.useEffect(() => {
          mockMountCount.current += 1;
        }, []);
        return ReactActual.createElement(RNView, { testID: props.testID });
      },
    ),
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

describe('MoneyCardTiltAnimation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOnErrorRef.current = undefined;
    mockOnPlayRef.current = undefined;
    mockRiveProps.current = undefined;
    mockMountCount.current = 0;
    mockViewTag.mockReturnValue(1);
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

    expect(mockRiveProps.current?.artboardName).toBe('CardTiltDigital');
  });

  it('renders the metal tilt artboard for a metal card', () => {
    render(<MoneyCardTiltAnimation isMetalCard />);

    expect(mockRiveProps.current?.artboardName).toBe('CardTiltMetal');
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

    act(() => mockOnErrorRef.current?.({ message: 'boom' }));

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

    const applyTilt = mockUseDeviceOrientation.mock.calls[0][0] as (
      x: number,
      y: number,
    ) => void;

    act(() => applyTilt(1, 1));

    expect(mockSetNumber).toHaveBeenCalledWith('xValue', 100);
    expect(mockSetNumber).toHaveBeenCalledWith('yValue', 0);
  });

  it('drives a partial tilt past the raw curve reported by the hook', () => {
    render(<MoneyCardTiltAnimation isMetalCard={false} />);

    const applyTilt = mockUseDeviceOrientation.mock.calls[0][0] as (
      x: number,
      y: number,
    ) => void;

    act(() => applyTilt(0.5, 0));

    // The hook reports an already-squared tilt, so 0.5 means the device is
    // ~71% of the way through its travel. Mapping it straight through would
    // under-read at 75; the shaping recovers the real angle.
    const [, xValue] = mockSetNumber.mock.calls.find(
      ([property]) => property === 'xValue',
    ) as [string, number];
    expect(xValue).toBeGreaterThan(75);
    expect(xValue).toBeLessThan(100);
  });

  it('does not dispatch tilt values while the native Rive view is detached', () => {
    mockViewTag.mockReturnValue(null);
    render(<MoneyCardTiltAnimation isMetalCard={false} />);

    const applyTilt = mockUseDeviceOrientation.mock.calls[0][0] as (
      x: number,
      y: number,
    ) => void;

    act(() => applyTilt(0.5, -0.5));

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
      expect(mockRiveProps.current?.style).toEqual({ width: 111, height: 70 });
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
  describe('entry reveal', () => {
    const fireOnPlay = () => act(() => mockOnPlayRef.current?.());

    it('fires the authored reveal trigger once the Rive view starts playing', () => {
      render(<MoneyCardTiltAnimation isMetalCard={false} playRevealOnMount />);

      fireOnPlay();

      expect(mockTrigger).toHaveBeenCalledWith('startAnimation');
    });

    it('fires the reveal only once when the Rive view reports playing again', () => {
      render(<MoneyCardTiltAnimation isMetalCard={false} playRevealOnMount />);

      fireOnPlay();
      fireOnPlay();

      expect(mockTrigger).toHaveBeenCalledTimes(1);
    });

    it('does not fire the reveal when it was not requested', () => {
      render(<MoneyCardTiltAnimation isMetalCard={false} />);

      fireOnPlay();

      expect(mockTrigger).not.toHaveBeenCalled();
    });

    it('waits the requested delay before triggering the reveal', () => {
      jest.useFakeTimers();

      render(
        <MoneyCardTiltAnimation
          isMetalCard={false}
          playRevealOnMount
          revealDelayMs={60}
        />,
      );

      fireOnPlay();
      expect(mockTrigger).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(60);
      });

      expect(mockTrigger).toHaveBeenCalledWith('startAnimation');
      jest.useRealTimers();
    });

    it('does not dispatch to a detached native view', () => {
      mockViewTag.mockReturnValue(null);

      render(<MoneyCardTiltAnimation isMetalCard={false} playRevealOnMount />);

      fireOnPlay();

      expect(mockTrigger).not.toHaveBeenCalled();
    });

    it('fills the parent width using the artboard aspect ratio', () => {
      render(<MoneyCardTiltAnimation isMetalCard={false} fillWidth />);

      expect(mockRiveProps.current?.style).toEqual({
        width: '100%',
        aspectRatio: 620 / 400,
      });
    });
  });
});
