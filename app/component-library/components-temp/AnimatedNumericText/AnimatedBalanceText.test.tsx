import React from 'react';
import { render } from '@testing-library/react-native';
import { Laminar } from 'react-native-laminar';
import { useReducedMotion } from 'react-native-reanimated';

import AnimatedBalanceText from './AnimatedBalanceText';

jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual('react-native-reanimated/mock'),
  useReducedMotion: jest.fn(() => false),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: () => ({}) }),
}));

const mockUseReducedMotion = jest.mocked(useReducedMotion);

describe('AnimatedBalanceText', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseReducedMotion.mockReturnValue(false);
  });

  it('primes numeric text with the loading value', () => {
    const { UNSAFE_getByType } = render(
      <AnimatedBalanceText isLoading loadingValue="$0.00" value="$123.45" />,
    );

    expect(UNSAFE_getByType(Laminar).props.text).toBe('0.00');
  });

  it('configures numeric text transitions', () => {
    const { UNSAFE_getByType } = render(
      <AnimatedBalanceText isLoading loadingValue="$0.00" value="$123.45" />,
    );

    expect(UNSAFE_getByType(Laminar).props).toEqual(
      expect.objectContaining({
        animationDuration: 400,
        animationPreset: 'smooth',
        clipToBounds: true,
        variant: 'slots',
      }),
    );
  });

  it('renders the completed value after loading finishes', () => {
    const { rerender, UNSAFE_getByType } = render(
      <AnimatedBalanceText isLoading loadingValue="$0.00" value="$123.45" />,
    );

    rerender(
      <AnimatedBalanceText
        isLoading={false}
        loadingValue="$0.00"
        value="$123.45"
      />,
    );

    expect(UNSAFE_getByType(Laminar).props.text).toBe('123.45');
  });

  it('renders the latest completed value', () => {
    const { rerender, UNSAFE_getByType } = render(
      <AnimatedBalanceText
        isLoading={false}
        loadingValue="$0.00"
        value="$123.45"
      />,
    );

    rerender(
      <AnimatedBalanceText
        isLoading={false}
        loadingValue="$0.00"
        value="$456.78"
      />,
    );

    expect(UNSAFE_getByType(Laminar).props.text).toBe('456.78');
  });
});
