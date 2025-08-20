import React from 'react';
import { renderScreen } from '../../../../../../util/test/renderWithProvider';
import { TransactionDetails } from './transaction-details';
import { merge } from 'lodash';
import {
  simpleSendTransactionControllerMock,
  transactionIdMock,
} from '../../../__mocks__/controllers/transaction-controller-mock';
import { transactionApprovalControllerMock } from '../../../__mocks__/controllers/approval-controller-mock';
import { otherControllersMock } from '../../../__mocks__/controllers/other-controllers-mock';
import { useTokensWithBalance } from '../../../../../UI/Bridge/hooks/useTokensWithBalance';
import Routes from '../../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../../locales/i18n';

jest.mock('../../../../../UI/Bridge/hooks/useTokensWithBalance');

function render() {
  return renderScreen(
    () => <TransactionDetails />,
    {
      name: Routes.TRANSACTION_DETAILS,
    },
    {
      state: merge(
        {},
        simpleSendTransactionControllerMock,
        transactionApprovalControllerMock,
        otherControllersMock,
      ),
    },
    {
      transactionId: transactionIdMock,
    },
  );
}

describe('Transaction Details', () => {
  const useTokensWithBalanceMock = jest.mocked(useTokensWithBalance);

  beforeEach(() => {
    jest.resetAllMocks();
    useTokensWithBalanceMock.mockReturnValue([]);
  });

  it('renders default title based on type', () => {
    const { getByText } = render();
    expect(
      getByText(strings('transaction_details.title.default')),
    ).toBeDefined();
  });
});
