import React from 'react';

import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { stakingDepositConfirmationState } from '../../../../../../util/test/confirm-data-helpers';
import TokenHero from './TokenHero';

describe('TokenHero', () => {
  it('contains token and fiat values for staking deposit', async () => {
    const { getByText } = renderWithProvider(<TokenHero />, {
      state: stakingDepositConfirmationState,
    });
    expect(getByText('0.0001 ETH')).toBeDefined();
    expect(getByText('$0.36')).toBeDefined();
  });
});
