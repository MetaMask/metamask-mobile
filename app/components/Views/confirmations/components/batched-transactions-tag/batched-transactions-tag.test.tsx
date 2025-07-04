import React from 'react';

import {
  downgradeAccountConfirmation,
  getAppStateForConfirmation,
  upgradeAccountConfirmation,
} from '../../../../../util/test/confirm-data-helpers';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { BatchedTransactionTag } from './batched-transactions-tag';

describe('BatchedTransactionTag', () => {
  it('renders tag with transaction count for batched transactions', () => {
    const { getByText } = renderWithProvider(<BatchedTransactionTag />, {
      state: getAppStateForConfirmation(upgradeAccountConfirmation),
    });
    expect(getByText('Includes 2 transactions')).toBeTruthy();
  });

  it('does not renders tag if there are no nested transactions', () => {
    const { queryByText } = renderWithProvider(<BatchedTransactionTag />, {
      state: getAppStateForConfirmation(downgradeAccountConfirmation),
    });
    expect(queryByText('Includes 2 transactions')).toBeNull();
  });

  it('does not renders tag if there is only 1 batched transaction', () => {
    const { queryByText } = renderWithProvider(<BatchedTransactionTag />, {
      state: getAppStateForConfirmation({
        ...upgradeAccountConfirmation,
        nestedTransactions: [
          upgradeAccountConfirmation.nestedTransactions?.[0] ?? {},
        ],
      }),
    });
    expect(queryByText('Includes 2 transactions')).toBeNull();
  });
});
