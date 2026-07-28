import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import MMPayFundingCard from './MMPayFundingCard';

describe('MMPayFundingCard', () => {
  it('prompts an unfunded user to add funds', () => {
    const onAddFunds = jest.fn();
    const { getByText } = render(
      <MMPayFundingCard
        amount="20"
        destinationSymbol="ETH"
        destinationToken={{
          address: '0x0000000000000000000000000000000000000000',
          chainId: 'eip155:1',
          decimals: 18,
          symbol: 'ETH',
        }}
        isLoading={false}
        networkName="Ethereum"
        onAddFunds={onAddFunds}
      />,
    );

    expect(getByText('$20 of ETH')).toBeOnTheScreen();
    expect(getByText('Ethereum')).toBeOnTheScreen();
    expect(getByText(/No wallet balance is available/u)).toBeOnTheScreen();

    fireEvent.press(getByText('Add funds'));
    expect(onAddFunds).toHaveBeenCalledTimes(1);
  });
});
