import React from 'react';
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
import { useIsTransactionPayLoading } from '../../../hooks/pay/useIsTransactionPayLoading';
import { otherControllersMock } from '../../../__mocks__/controllers/other-controllers-mock';

jest.mock('../../../hooks/pay/useTransactionTotalFiat');
jest.mock('../../../hooks/pay/useIsTransactionPayLoading');

const TRANSACTION_FEE_MOCK = '$1.23';
const NETWORK_FEE_MOCK = '$0.45';
const BRIDGE_FEE_MOCK = '$0.78';

function render({
  quotes = [],
}: {
  quotes?: Partial<TransactionBridgeQuote>[];
} = {}) {
  const state = merge(
    {},
    simpleSendTransactionControllerMock,
    transactionApprovalControllerMock,
    otherControllersMock,
    {
      confirmationMetrics: {
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
  const useIsTransactionPayLoadingMock = jest.mocked(
    useIsTransactionPayLoading,
  );

  beforeEach(() => {
    jest.resetAllMocks();

    useTransactionTotalFiatMock.mockReturnValue({
      totalTransactionFeeFormatted: TRANSACTION_FEE_MOCK,
      totalNativeEstimatedFormatted: NETWORK_FEE_MOCK,
      totalBridgeFeeFormatted: BRIDGE_FEE_MOCK,
    } as ReturnType<typeof useTransactionTotalFiat>);

    useIsTransactionPayLoadingMock.mockReturnValue({ isLoading: false });
  });

  it('renders transaction fee', async () => {
    const { getByText } = render({
      quotes: [{}],
    });

    expect(getByText(TRANSACTION_FEE_MOCK)).toBeDefined();
  });

  it('renders metamask fee', async () => {
    const { getByText } = render({
      quotes: [{}],
    });

    expect(getByText('$0')).toBeDefined();
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

  it('renders skeletons if quotes loading', async () => {
    useIsTransactionPayLoadingMock.mockReturnValue({ isLoading: true });

    const { getByTestId } = render();

    expect(getByTestId('bridge-fee-row-skeleton')).toBeDefined();
    expect(getByTestId('metamask-fee-row-skeleton')).toBeDefined();
  });

  it('does not render tooltip if no quotes', async () => {
    const { queryByTestId } = render({ quotes: [] });
    expect(queryByTestId('info-row-tooltip-open-btn')).toBeNull();
  });

  it('does not render metamask fee if no quotes', async () => {
    const { getByTestId, queryByTestId } = render({ quotes: [] });

    expect(getByTestId('bridge-fee-row')).toBeDefined();
    expect(queryByTestId('metamask-fee-row')).toBeNull();
  });
});
