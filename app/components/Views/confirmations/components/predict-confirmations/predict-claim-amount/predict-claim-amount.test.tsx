import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { merge } from 'lodash';
import { simpleSendTransactionControllerMock } from '../../../__mocks__/controllers/transaction-controller-mock';
import { transactionApprovalControllerMock } from '../../../__mocks__/controllers/approval-controller-mock';
import { otherControllersMock } from '../../../__mocks__/controllers/other-controllers-mock';
import { PredictClaimAmount } from './predict-claim-amount';

function render() {
  return renderWithProvider(<PredictClaimAmount />, {
    state: merge(
      {},
      simpleSendTransactionControllerMock,
      transactionApprovalControllerMock,
      otherControllersMock,
    ),
  });
}

describe('PredictClaimAmount', () => {
  it('renders formatted winnings', () => {
    // Given a won position with currentValue of 229.09
    const { getByText } = render();

    // Then the formatted winnings amount is displayed
    expect(getByText('$2,250')).toBeDefined();
  });

  it('renders formatted change and percentage', () => {
    // Given a won position with cashPnl of 46.35 and currentValue of 229.09
    const { getByText } = render();

    // Then the formatted change and percentage is displayed
    expect(getByText('+$750 (33.33%)')).toBeDefined();
  });
});
