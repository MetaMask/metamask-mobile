import React from 'react';
import { render } from '@testing-library/react-native';
import HomepageBalanceBreakdownWithProvider from './HomepageBalanceBreakdownWithProvider';

jest.mock('../../../../UI/Perps/providers/PerpsConnectionProvider', () => {
  const ReactMock = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    PerpsConnectionProvider: ({ children }: { children: React.ReactNode }) =>
      ReactMock.createElement(
        View,
        { testID: 'perps-connection-provider' },
        children,
      ),
  };
});

jest.mock('../../../../UI/Perps/providers/PerpsStreamManager', () => {
  const ReactMock = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    PerpsStreamProvider: ({ children }: { children: React.ReactNode }) =>
      ReactMock.createElement(
        View,
        { testID: 'perps-stream-provider' },
        children,
      ),
  };
});

jest.mock('./HomepageBalanceBreakdown', () => {
  const ReactMock = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () =>
      ReactMock.createElement(View, { testID: 'homepage-balance-breakdown' }),
  };
});

describe('HomepageBalanceBreakdownWithProvider', () => {
  it('mounts the aggregate inside the required Perps providers', () => {
    const { getByTestId } = render(
      <HomepageBalanceBreakdownWithProvider layout="icons" />,
    );

    expect(getByTestId('perps-connection-provider')).toBeOnTheScreen();
    expect(getByTestId('perps-stream-provider')).toBeOnTheScreen();
    expect(getByTestId('homepage-balance-breakdown')).toBeOnTheScreen();
  });
});
