import React from 'react';
import { Text as MockText } from 'react-native';
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
import { act, fireEvent } from '@testing-library/react-native';
import {
  TransactionControllerState,
  TransactionType,
} from '@metamask/transaction-controller';

jest.mock('../../../hooks/pay/useTransactionTotalFiat');

jest.mock('../../../../../UI/AnimatedSpinner', () => ({
  __esModule: true,
  ...jest.requireActual('../../../../../UI/AnimatedSpinner'),
  default: () => <MockText>Spinner</MockText>,
}));

const TRANSACTION_FEE_MOCK = '$1.23';
const NETWORK_FEE_MOCK = '$0.45';
const BRIDGE_FEE_MOCK = '$0.78';

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

  (
    state.engine.backgroundState
      .TransactionController as TransactionControllerState
  ).transactions[0].type = TransactionType.perpsDeposit;

  return renderWithProvider(<BridgeFeeRow />, { state });
}

describe('BridgeFeeRow', () => {
  const useTransactionTotalFiatMock = jest.mocked(useTransactionTotalFiat);

  beforeEach(() => {
    jest.resetAllMocks();

    useTransactionTotalFiatMock.mockReturnValue({
      totalTransactionFeeFormatted: TRANSACTION_FEE_MOCK,
      totalNativeEstimatedFormatted: NETWORK_FEE_MOCK,
      totalBridgeFeeFormatted: BRIDGE_FEE_MOCK,
    } as ReturnType<typeof useTransactionTotalFiat>);
  });

  it('renders transaction fee', async () => {
    const { getByText } = render({
      quotes: [{}],
    });

    expect(getByText(TRANSACTION_FEE_MOCK)).toBeDefined();
  });

  it('renders network fee in tooltip', async () => {
    const { getByTestId, getByText } = render({
      quotes: [{}],
    });

    await act(async () => {
      fireEvent.press(getByTestId('info-row-tooltip-open-btn'));
    });

    expect(getByText(NETWORK_FEE_MOCK)).toBeDefined();
  });

  it('renders bridge fee in tooltip', async () => {
    const { getByTestId, getByText } = render({
      quotes: [{}],
    });

    await act(async () => {
      fireEvent.press(getByTestId('info-row-tooltip-open-btn'));
    });

    expect(getByText(BRIDGE_FEE_MOCK)).toBeDefined();
  });

  it('renders spinner if quotes loading', async () => {
    const { getAllByText } = render({ isLoading: true });
    expect(getAllByText(`Spinner`, {})).toHaveLength(2);
  });
});
