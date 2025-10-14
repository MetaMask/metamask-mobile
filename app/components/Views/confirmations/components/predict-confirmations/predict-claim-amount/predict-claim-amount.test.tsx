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
    const { getByText } = render();
    expect(getByText('$229.09')).toBeDefined();
  });

  it('renders formatted change and percentage', () => {
    const { getByText } = render();
    expect(getByText('+$46.35 (20.23%)')).toBeDefined();
  });
});
