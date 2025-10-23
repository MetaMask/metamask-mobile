import { merge } from 'lodash';
import React from 'react';
import { strings } from '../../../../../../../locales/i18n';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { transactionApprovalControllerMock } from '../../../__mocks__/controllers/approval-controller-mock';
import { otherControllersMock } from '../../../__mocks__/controllers/other-controllers-mock';
import { simpleSendTransactionControllerMock } from '../../../__mocks__/controllers/transaction-controller-mock';
import { PredictWithdrawBalance } from './predict-withdraw-balance';
import { usePredictBalance } from '../../../../../UI/Predict/hooks/usePredictBalance';

jest.mock('../../../../../UI/Predict/hooks/usePredictBalance');

const mockUsePredictBalance = usePredictBalance as jest.MockedFunction<
  typeof usePredictBalance
>;

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
    jest.clearAllMocks();

    mockUsePredictBalance.mockReturnValue({
      balance: 1232.39,
      hasNoBalance: false,
      isLoading: false,
      isRefreshing: false,
      error: null,
      loadBalance: jest.fn(),
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders balance with formatted currency', () => {
    const { getByText } = render();

    expect(
      getByText(`${strings('confirm.available_balance')}$1,232.39`),
    ).toBeOnTheScreen();
  });
});
