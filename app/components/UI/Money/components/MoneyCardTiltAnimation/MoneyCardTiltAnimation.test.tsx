import React from 'react';
import { render, act } from '@testing-library/react-native';
import MoneyCardTiltAnimation from './MoneyCardTiltAnimation';
import { MoneyCardTiltAnimationTestIds } from './MoneyCardTiltAnimation.testIds';
import { useReduceMotion } from '../../hooks/useReduceMotion';
import { useDeviceOrientation } from '../../hooks/useDeviceOrientation';
import mmCardRegular from '../../../../../images/mm_card_regular.png';
import mmCardMetal from '../../../../../images/mm_card_metal.png';

const mockSetNumber = jest.fn();
const mockViewTag = jest.fn((): number | null => 1);
const mockOnErrorRef: { current?: (error: { message: string }) => void } = {};
const mockRiveProps: { current?: { artboardName?: string } } = {};
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
          onError?: (error: { message: string }) => void;
        },
        ref: React.Ref<{
          setNumber: (path: string, value: number) => void;
          viewTag: () => number | null;
        }>,
      ) => {
        mockOnErrorRef.current = props.onError;
        mockRiveProps.current = { artboardName: props.artboardName };
        ReactActual.useImperativeHandle(ref, () => ({
          setNumber: mockSetNumber,
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

    act(() => applyTilt(0.5, 0.5));

    expect(mockSetNumber).toHaveBeenCalledWith('xValue', 75);
    expect(mockSetNumber).toHaveBeenCalledWith('yValue', 25);
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
});
