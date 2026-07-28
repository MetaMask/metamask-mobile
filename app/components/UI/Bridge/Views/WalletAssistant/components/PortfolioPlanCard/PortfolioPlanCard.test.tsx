import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import PortfolioPlanCard from './PortfolioPlanCard';

describe('PortfolioPlanCard', () => {
  it('summarizes the selected positions and opens review', () => {
    const onReview = jest.fn();
    const { getByText } = render(
      <PortfolioPlanCard
        onReview={onReview}
        plan={{
          destinationSymbol: 'USDC',
          excludedSourceCount: 0,
          sourceChainId: 'eip155:1',
          sourceTokens: [
            {
              address: '0x0000000000000000000000000000000000000001',
              balance: '100',
              chainId: 'eip155:1',
              decimals: 18,
              symbol: 'PEPE',
              tokenFiatAmount: 24,
            },
            {
              address: '0x0000000000000000000000000000000000000002',
              balance: '50',
              chainId: 'eip155:1',
              decimals: 18,
              symbol: 'SHIB',
              tokenFiatAmount: 16,
            },
          ],
          status: 'ready',
        }}
      />,
    );

    expect(getByText('Consolidate 2 positions')).toBeOnTheScreen();
    expect(getByText('Approximately $40.00')).toBeOnTheScreen();
    expect(getByText('USDC')).toBeOnTheScreen();

    fireEvent.press(getByText('Review plan'));
    expect(onReview).toHaveBeenCalledTimes(1);
  });
});
