import React from 'react';

import renderWithProvider, { DeepPartial } from '../../../../../../util/test/renderWithProvider';
import { stakingDepositConfirmationState } from '../../../../../../util/test/confirm-data-helpers';
import TokenHero from './TokenHero';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { merge } from 'lodash';
import { RootState } from '../../../../../../reducers';
import { decGWEIToHexWEI } from '../../../../../../util/conversions';

describe('TokenHero', () => {
  it('contains token and fiat values for staking deposit', async () => {
    const { getByText } = renderWithProvider(<TokenHero />, {
      state: stakingDepositConfirmationState,
    });

    expect(getByText('0.0001 ETH')).toBeDefined();
    expect(getByText('$0.36')).toBeDefined();
  });

  it('contains token and fiat values for staking deposit', async () => {
    const state: DeepPartial<RootState> = merge(
      {},
      stakingDepositConfirmationState,
      {
        engine: {
          backgroundState: {
            TransactionController: {
              transactions: [
                { txParams: { value: `0x${decGWEIToHexWEI(12345678.9)}` } },
              ],
            },
          },
        },
      },
    );

    const { getByText } = renderWithProvider(
      <TokenHero />,
      { state },
    );

    expect(getByText('0.0123 ETH')).toBeDefined();
    expect(getByText('$44.40')).toBeDefined();

    const tokenAmountText = getByText('0.0123 ETH');
    fireEvent.press(tokenAmountText);

    await waitFor(() => {
      expect(getByText('Amount')).toBeDefined();
      expect(getByText('0.0123456789')).toBeDefined();
    });
  });
});
