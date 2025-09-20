import React from 'react';
import { View as MockView } from 'react-native';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { merge } from 'lodash';
import {
  simpleSendTransactionControllerMock,
  transactionIdMock,
} from '../../../__mocks__/controllers/transaction-controller-mock';
import { transactionApprovalControllerMock } from '../../../__mocks__/controllers/approval-controller-mock';
import { TransactionBridgeQuote } from '../../../utils/bridge';
import { ConfirmationMetricsState } from '../../../../../../core/redux/slices/confirmationMetrics';
import { BridgeFeeRow } from './bridge-fee-row';
import { useTransactionTotalFiat } from '../../../hooks/pay/useTransactionTotalFiat';

jest.mock('../../../hooks/pay/useTransactionTotalFiat');

jest.mock('../../../../../UI/AnimatedSpinner', () => ({
  __esModule: true,
  ...jest.requireActual('../../../../../UI/AnimatedSpinner'),
  default: () => <MockView testID="bridge-fee-spinner">{`Spinner`}</MockView>,
}));

const BRIDGE_FEE_MOCK = '$1.23';

function render({
  quotes = [],
  isLoading = false,
}: {
  quotes?: Partial<TransactionBridgeQuote>[];
  isLoading?: boolean;
} = {}) {
  const state = merge(
    {},
    simpleSendTransactionControllerMock,
    transactionApprovalControllerMock,
    {
      confirmationMetrics: {
        isTransactionBridgeQuotesLoadingById: {
          [transactionIdMock]: isLoading,
        },
        transactionBridgeQuotesById: {
          [transactionIdMock]: quotes,
        },
      } as unknown as ConfirmationMetricsState,
    },
  );

  return renderWithProvider(<BridgeFeeRow />, { state });
}

describe('BridgeFeeRow', () => {
  const useTransactionTotalFiatMock = jest.mocked(useTransactionTotalFiat);

  beforeEach(() => {
    jest.resetAllMocks();

    useTransactionTotalFiatMock.mockReturnValue({
      bridgeFeeFormatted: BRIDGE_FEE_MOCK,
    } as ReturnType<typeof useTransactionTotalFiat>);
  });

  it('renders bridge fee', async () => {
    const { getByText } = render({
      quotes: [{}],
    });

    expect(getByText(BRIDGE_FEE_MOCK)).toBeDefined();
  });

  it('renders spinner if quotes loading', async () => {
    const { getByTestId } = render({ isLoading: true });
    expect(getByTestId(`bridge-fee-spinner`)).toBeDefined();
  });
});
