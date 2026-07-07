import React from 'react';
import { render, act } from '@testing-library/react-native';
import MoneyNextBestActionParallax from './MoneyNextBestActionParallax';
import { MoneyNextBestActionParallaxTestIds } from './MoneyNextBestActionParallax.testIds';
import { useReduceMotion } from '../../hooks/useReduceMotion';
import { useDeviceOrientation } from '../../hooks/useDeviceOrientation';
import fallbackImage from '../../../../../images/money-onboarding-stepper-step-1.png';

const mockSetXValue = jest.fn();
const mockSetYValue = jest.fn();
const mockRefCallback = jest.fn();
const mockRiveInstance = {};
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

jest.mock('../../hooks/useReduceMotion', () => ({
  useReduceMotion: jest.fn(),
}));

jest.mock('../../hooks/useDeviceOrientation', () => ({
  useDeviceOrientation: jest.fn(),
}));

const mockUseReduceMotion = useReduceMotion as jest.Mock;
const mockUseDeviceOrientation = useDeviceOrientation as jest.Mock;

describe('MoneyNextBestActionParallax', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOnErrorRef.current = undefined;
    mockRiveProps.current = undefined;
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

    expect(mockRiveProps.current?.artboardName).toBe('Parallax Block 2');
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

  it('drives the bound Rive number properties from mapped tilt values', () => {
    render(
      <MoneyNextBestActionParallax
        artboardName="Parallax Block 1"
        fallbackImage={fallbackImage}
      />,
    );

    const applyTilt = mockUseDeviceOrientation.mock.calls[0][0] as (
      x: number,
      y: number,
    ) => void;

    act(() => applyTilt(0.5, -0.5));

    expect(mockSetXValue).toHaveBeenCalledWith(75);
    expect(mockSetYValue).toHaveBeenCalledWith(25);
  });

  it('falls back to the static image when Rive reports an error', () => {
    const { getByTestId, queryByTestId } = render(
      <MoneyNextBestActionParallax
        artboardName="Parallax Block 1"
        fallbackImage={fallbackImage}
      />,
    );

    act(() => mockOnErrorRef.current?.({ message: 'boom' }));

    expect(
      getByTestId(MoneyNextBestActionParallaxTestIds.STATIC_IMAGE),
    ).toBeOnTheScreen();
    expect(queryByTestId(MoneyNextBestActionParallaxTestIds.RIVE)).toBeNull();
  });
});
