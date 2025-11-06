import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { merge } from 'lodash';
import { simpleSendTransactionControllerMock } from '../../../__mocks__/controllers/transaction-controller-mock';
import { transactionApprovalControllerMock } from '../../../__mocks__/controllers/approval-controller-mock';
import { otherControllersMock } from '../../../__mocks__/controllers/other-controllers-mock';
import { PredictWithdrawBalance } from './predict-withdraw-balance';
import { strings } from '../../../../../../../locales/i18n';

function render() {
  return renderWithProvider(<PredictWithdrawBalance />, {
    state: merge(
      {},
      simpleSendTransactionControllerMock,
      transactionApprovalControllerMock,
      otherControllersMock,
    ),
  });
}

describe('PredictWithdrawBalance', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('renders balance', () => {
    const { getByText } = render();
    expect(
      getByText(`${strings('confirm.available_balance')}$1,232.39`),
    ).toBeDefined();
  });
});
