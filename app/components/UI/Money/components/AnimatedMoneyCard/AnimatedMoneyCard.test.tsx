import React from 'react';
import { render, act } from '@testing-library/react-native';
import AnimatedMoneyCard from './AnimatedMoneyCard';
import { AnimatedMoneyCardTestIds } from './AnimatedMoneyCard.testIds';
import { useReduceMotion } from '../../hooks/useReduceMotion';
import { useDeviceTilt } from '../../hooks/useDeviceTilt';
import mmCardRegular from '../../../../../images/mm_card_regular.png';
import mmCardMetal from '../../../../../images/mm_card_metal.png';
import {
  __getLastMockedMethods,
  __resetAllMocks,
} from '../../../../../__mocks__/rive-react-native';

const mockUseSelector = jest.fn();
jest.mock('react-redux', () => ({
  useSelector: (selector: unknown) => mockUseSelector(selector),
}));

jest.mock('../../hooks/useReduceMotion', () => ({
  useReduceMotion: jest.fn(),
}));

jest.mock('../../hooks/useDeviceTilt', () => ({
  useDeviceTilt: jest.fn(),
}));

const mockUseReduceMotion = useReduceMotion as jest.Mock;
const mockUseDeviceTilt = useDeviceTilt as jest.Mock;

describe('AnimatedMoneyCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetAllMocks();
    mockUseSelector.mockReturnValue(true);
    mockUseReduceMotion.mockReturnValue(false);
  });

  it('renders the Rive animation when the flag is enabled and reduce motion is off', () => {
    const { getByTestId, queryByTestId } = render(
      <AnimatedMoneyCard cardType="virtual" />,
    );

    expect(getByTestId(AnimatedMoneyCardTestIds.RIVE)).toBeOnTheScreen();
    expect(queryByTestId(AnimatedMoneyCardTestIds.STATIC_IMAGE)).toBeNull();
  });

  it('renders the static image when the flag is disabled', () => {
    mockUseSelector.mockReturnValue(false);

    const { getByTestId, queryByTestId } = render(
      <AnimatedMoneyCard cardType="virtual" />,
    );

    expect(
      getByTestId(AnimatedMoneyCardTestIds.STATIC_IMAGE),
    ).toBeOnTheScreen();
    expect(queryByTestId(AnimatedMoneyCardTestIds.RIVE)).toBeNull();
  });

  it('renders the static image when reduce motion is enabled', () => {
    mockUseReduceMotion.mockReturnValue(true);

    const { getByTestId, queryByTestId } = render(
      <AnimatedMoneyCard cardType="virtual" />,
    );

    expect(
      getByTestId(AnimatedMoneyCardTestIds.STATIC_IMAGE),
    ).toBeOnTheScreen();
    expect(queryByTestId(AnimatedMoneyCardTestIds.RIVE)).toBeNull();
  });

  it('renders the metal image for the metal card type when static', () => {
    mockUseSelector.mockReturnValue(false);

    const { getByTestId } = render(<AnimatedMoneyCard cardType="metal" />);

    expect(
      getByTestId(AnimatedMoneyCardTestIds.STATIC_IMAGE).props.source,
    ).toBe(mmCardMetal);
  });

  it('renders the regular image for the virtual card type when static', () => {
    mockUseSelector.mockReturnValue(false);

    const { getByTestId } = render(<AnimatedMoneyCard cardType="virtual" />);

    expect(
      getByTestId(AnimatedMoneyCardTestIds.STATIC_IMAGE).props.source,
    ).toBe(mmCardRegular);
  });

  it('wires the device tilt callback with enabled true when animating', () => {
    render(<AnimatedMoneyCard cardType="virtual" />);

    expect(mockUseDeviceTilt).toHaveBeenCalledWith(expect.any(Function), {
      enabled: true,
    });
  });

  it('disables the device tilt callback when not animating', () => {
    mockUseSelector.mockReturnValue(false);

    render(<AnimatedMoneyCard cardType="virtual" />);

    expect(mockUseDeviceTilt).toHaveBeenCalledWith(expect.any(Function), {
      enabled: false,
    });
  });

  it('drives the virtual Rive inputs through the tilt callback', () => {
    render(<AnimatedMoneyCard cardType="virtual" />);

    const applyTilt = mockUseDeviceTilt.mock.calls[0][0] as (
      x: number,
      y: number,
    ) => void;

    act(() => applyTilt(0.5, -0.5));

    const methods = __getLastMockedMethods();
    expect(methods?.setInputState).toHaveBeenCalledWith(
      'MainTilt',
      'digitalTiltX',
      0.5,
    );
    expect(methods?.setInputState).toHaveBeenCalledWith(
      'MainTilt',
      'digitalTiltY',
      -0.5,
    );
  });

  it('drives the metal Rive inputs through the tilt callback', () => {
    render(<AnimatedMoneyCard cardType="metal" />);

    const applyTilt = mockUseDeviceTilt.mock.calls[0][0] as (
      x: number,
      y: number,
    ) => void;

    act(() => applyTilt(0.2, 0.3));

    const methods = __getLastMockedMethods();
    expect(methods?.setInputState).toHaveBeenCalledWith(
      'MainTilt',
      'metalTiltX',
      0.2,
    );
    expect(methods?.setInputState).toHaveBeenCalledWith(
      'MainTilt',
      'metalTiltY',
      0.3,
    );
  });

  it('falls back to the static image when Rive reports an error', () => {
    const { getByTestId, queryByTestId } = render(
      <AnimatedMoneyCard cardType="virtual" />,
    );

    const methods = __getLastMockedMethods() as unknown as {
      onError: (error: { message: string }) => void;
    };

    act(() => methods.onError({ message: 'boom' }));

    expect(
      getByTestId(AnimatedMoneyCardTestIds.STATIC_IMAGE),
    ).toBeOnTheScreen();
    expect(queryByTestId(AnimatedMoneyCardTestIds.RIVE)).toBeNull();
  });
});
