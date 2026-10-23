import React from 'react';
import { render } from '@testing-library/react-native';
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
    const { getByText } = render(
      <AnimatedBalanceText isLoading loadingValue="$0.00" value="$123.45" />,
    );

    expect(getByText('0.00')).toBeOnTheScreen();
  });

  it('renders the completed value after loading finishes', () => {
    const { rerender, getByText } = render(
      <AnimatedBalanceText isLoading loadingValue="$0.00" value="$123.45" />,
    );

    rerender(
      <AnimatedBalanceText
        isLoading={false}
        loadingValue="$0.00"
        value="$123.45"
      />,
    );

    expect(getByText('123.45')).toBeOnTheScreen();
  });

  it('renders the latest completed value', () => {
    const { rerender, getByText } = render(
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

    expect(getByText('456.78')).toBeOnTheScreen();
  });
});
