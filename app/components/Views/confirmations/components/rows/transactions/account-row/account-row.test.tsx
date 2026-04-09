import React from 'react';
import { CHAIN_IDS } from '@metamask/transaction-controller';

import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import { stakingClaimConfirmationState } from '../../../../../../../util/test/confirm-data-helpers';
import AccountRow from './account-row';

describe('AccountRow', () => {
  it('renders the label and account name', () => {
    const { getByText } = renderWithProvider(
      <AccountRow label="Claiming to" chainId={CHAIN_IDS.MAINNET} />,
      { state: stakingClaimConfirmationState },
    );

    expect(getByText('Claiming to')).toBeTruthy();
  });
});
