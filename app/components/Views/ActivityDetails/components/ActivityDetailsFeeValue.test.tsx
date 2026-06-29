import React from 'react';
import { render } from '@testing-library/react-native';
import { ActivityDetailsFeeValue } from './ActivityDetailsFeeValue';

jest.mock('./ActivityDetailsAvatar', () => ({
  ActivityDetailsAvatar: () => {
    const { View } = jest.requireActual('react-native');
    return <View testID="fee-avatar" />;
  },
}));

describe('ActivityDetailsFeeValue', () => {
  it('renders nothing when there is no value', () => {
    const { toJSON } = render(
      <ActivityDetailsFeeValue
        chainId="eip155:1"
        fee={{ type: 'base', symbol: 'ETH' }}
        value={undefined}
      />,
    );

    expect(toJSON()).toBeNull();
  });

  it('renders the fee value without token metadata', () => {
    const { getByText, queryByTestId } = render(
      <ActivityDetailsFeeValue
        chainId="eip155:1"
        fee={{ type: 'base' }}
        value="$1.23"
      />,
    );

    expect(getByText('$1.23')).toBeOnTheScreen();
    expect(queryByTestId('fee-avatar')).toBeNull();
  });

  it('renders token symbol and avatar when fee has a symbol', () => {
    const { getByText, getByTestId } = render(
      <ActivityDetailsFeeValue
        chainId="eip155:1"
        fee={{
          type: 'base',
          amount: '1000000000000000000',
          decimals: 18,
          symbol: 'ETH',
          assetId: 'eip155:1/slip44:60',
        }}
        value="$1.23"
      />,
    );

    expect(getByText('$1.23')).toBeOnTheScreen();
    expect(getByText('ETH')).toBeOnTheScreen();
    expect(getByTestId('fee-avatar')).toBeOnTheScreen();
  });
});
