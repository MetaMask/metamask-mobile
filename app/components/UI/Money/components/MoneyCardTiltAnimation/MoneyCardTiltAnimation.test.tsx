import React from 'react';
import { render, act } from '@testing-library/react-native';
import MoneyCardTiltAnimation from './MoneyCardTiltAnimation';
import { MoneyCardTiltAnimationTestIds } from './MoneyCardTiltAnimation.testIds';
import { useReduceMotion } from '../../hooks/useReduceMotion';
import { useDeviceOrientation } from '../../hooks/useDeviceOrientation';
import mmCardRegular from '../../../../../images/mm_card_regular.png';
import mmCardMetal from '../../../../../images/mm_card_metal.png';

const mockSetXValue = jest.fn();
const mockSetYValue = jest.fn();
const mockRefCallback = jest.fn();
const mockViewTag = jest.fn((): number | null => 1);
const mockRiveInstance = { viewTag: mockViewTag };
const mockOnErrorRef: { current?: (error: { message: string }) => void } = {};
const mockRiveProps: { current?: { artboardName?: string } } = {};

jest.mock('rive-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const { View: RNView } = jest.requireActual('react-native');
  return {
    __esModule: true,
    AutoBind: jest.fn(() => ({})),
    Fit: { Contain: 'contain' },
    useRive: () => [mockRefCallback, mockRiveInstance],
    useRiveNumber: (_instance: unknown, path: string) => [
      undefined,
      path === 'xValue' ? mockSetXValue : mockSetYValue,
    ],
    default: (props: {
      testID?: string;
      artboardName?: string;
      onError?: (error: { message: string }) => void;
    }) => {
      mockOnErrorRef.current = props.onError;
      mockRiveProps.current = { artboardName: props.artboardName };
      return ReactActual.createElement(RNView, { testID: props.testID });
    },
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

  it('renders the digital X-tilt artboard for a virtual card', () => {
    render(<MoneyCardTiltAnimation isMetalCard={false} />);

    expect(mockRiveProps.current?.artboardName).toBe('Card Tilt X - Digital ');
  });

  it('renders the metal X-tilt artboard for a metal card', () => {
    render(<MoneyCardTiltAnimation isMetalCard />);

    expect(mockRiveProps.current?.artboardName).toBe('Card Tilt X - Metal');
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

    act(() => applyTilt(0.5, -0.5));

    expect(mockSetXValue).toHaveBeenCalledWith(75);
    expect(mockSetYValue).toHaveBeenCalledWith(25);
  });

  it('does not dispatch tilt values while the native Rive view is detached', () => {
    mockViewTag.mockReturnValue(null);
    render(<MoneyCardTiltAnimation isMetalCard={false} />);

    const applyTilt = mockUseDeviceOrientation.mock.calls[0][0] as (
      x: number,
      y: number,
    ) => void;

    act(() => applyTilt(0.5, -0.5));

    expect(mockSetXValue).not.toHaveBeenCalled();
    expect(mockSetYValue).not.toHaveBeenCalled();
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
