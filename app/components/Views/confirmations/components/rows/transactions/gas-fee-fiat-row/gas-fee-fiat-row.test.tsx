import React from 'react';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import { GasFeeFiatRow } from './gas-fee-fiat-row';
import { merge } from 'lodash';
import {
  simpleSendTransactionControllerMock,
  transactionIdMock,
} from '../../../../__mocks__/controllers/transaction-controller-mock';
import { transactionApprovalControllerMock } from '../../../../__mocks__/controllers/approval-controller-mock';
import { useTransactionTotalFiat } from '../../../../hooks/pay/useTransactionTotalFiat';
import { View as MockView } from 'react-native';

jest.mock('../../../../hooks/pay/useTransactionTotalFiat');

jest.mock('../../../../../../UI/AnimatedSpinner', () => ({
  __esModule: true,
  ...jest.requireActual('../../../../../../UI/AnimatedSpinner'),
  default: () => <MockView testID="gas-fee-fiat-spinner">{`Spinner`}</MockView>,
}));

const GAS_FEE_FIAT_MOCK = '$1.23';

function render({ isQuotesLoading }: { isQuotesLoading?: boolean } = {}) {
  const state = merge(
    {},
    simpleSendTransactionControllerMock,
    transactionApprovalControllerMock,
    {
      confirmationMetrics: {
        isTransactionBridgeQuotesLoadingById: {
          [transactionIdMock]: isQuotesLoading ?? false,
        },
      },
    },
  );

  return renderWithProvider(<GasFeeFiatRow />, { state });
}

describe('GasFeeFiatRow', () => {
  const useTransactionTotalFiatMock = jest.mocked(useTransactionTotalFiat);

  beforeEach(() => {
    jest.resetAllMocks();

    useTransactionTotalFiatMock.mockReturnValue({
      totalGasFormatted: GAS_FEE_FIAT_MOCK,
    } as ReturnType<typeof useTransactionTotalFiat>);
  });

  it('renders total gas fee in fiat', () => {
    const { getByText } = render();
    expect(getByText(GAS_FEE_FIAT_MOCK)).toBeDefined();
  });

  it('renders spinner if quotes are loading', () => {
    const { getByTestId } = render({ isQuotesLoading: true });
    expect(getByTestId('gas-fee-fiat-spinner')).toBeDefined();
  });
});
