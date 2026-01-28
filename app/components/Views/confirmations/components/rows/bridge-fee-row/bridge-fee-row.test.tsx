import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { merge } from 'lodash';
import { simpleSendTransactionControllerMock } from '../../../__mocks__/controllers/transaction-controller-mock';
import { transactionApprovalControllerMock } from '../../../__mocks__/controllers/approval-controller-mock';
import { BridgeFeeRow } from './bridge-fee-row';
import { act, fireEvent } from '@testing-library/react-native';
import {
  TransactionControllerState,
  TransactionType,
} from '@metamask/transaction-controller';
import {
  TransactionPayQuote,
  TransactionPayTotals,
} from '@metamask/transaction-pay-controller';
import {
  useIsTransactionPayLoading,
  useTransactionPayQuotes,
  useTransactionPayTotals,
} from '../../../hooks/pay/useTransactionPayData';
import { otherControllersMock } from '../../../__mocks__/controllers/other-controllers-mock';
import { Json } from '@metamask/utils';
import { ConfirmationRowComponentIDs } from '../../../ConfirmationView.testIds';

jest.mock('../../../hooks/pay/useTransactionPayData');
jest.mock('../../../hooks/metrics/useConfirmationAlertMetrics', () => ({
  useConfirmationAlertMetrics: () => ({
    trackInlineAlertClicked: jest.fn(),
    trackAlertActionClicked: jest.fn(),
    trackAlertRendered: jest.fn(),
  }),
}));

function render(options: { type?: TransactionType } = {}) {
  const state = merge(
    {},
    simpleSendTransactionControllerMock,
    transactionApprovalControllerMock,
    otherControllersMock,
  );

  (
    state.engine.backgroundState
      .TransactionController as TransactionControllerState
  ).transactions[0].type = options.type ?? TransactionType.perpsDeposit;

  return renderWithProvider(<BridgeFeeRow />, { state });
}

describe('BridgeFeeRow', () => {
  const useTransactionTotalsMock = jest.mocked(useTransactionPayTotals);
  const useTransactionPayQuotesMock = jest.mocked(useTransactionPayQuotes);
  const useIsTransactionPayLoadingMock = jest.mocked(
    useIsTransactionPayLoading,
  );

  beforeEach(() => {
    jest.resetAllMocks();

    useTransactionTotalsMock.mockReturnValue({
      fees: {
        provider: { usd: '1.00' },
        sourceNetwork: { estimate: { usd: '0.20' } },
        targetNetwork: { usd: '0.03' },
      },
    } as TransactionPayTotals);

    useIsTransactionPayLoadingMock.mockReturnValue(false);

    useTransactionPayQuotesMock.mockReturnValue([
      {} as TransactionPayQuote<Json>,
    ]);
  });

  it('renders transaction fee', async () => {
    const { getByText } = render();
    expect(getByText('$1.23')).toBeDefined();
  });

  it('renders network fee row when transaction type is musdConversion', () => {
    const { getByTestId, getByText, queryByTestId, queryByText } = render({
      type: TransactionType.musdConversion,
    });

    expect(getByTestId(ConfirmationRowComponentIDs.NETWORK_FEE)).toBeDefined();
    expect(getByText('$0.23')).toBeDefined();
    expect(queryByText('$1.23')).toBeNull();
    expect(queryByTestId('bridge-fee-row')).toBeNull();
    expect(queryByTestId('metamask-fee-row')).toBeNull();
  });

  it('renders skeleton if musdConversion network fee is loading', () => {
    useIsTransactionPayLoadingMock.mockReturnValue(true);

    const { getByTestId, queryByTestId, queryByText } = render({
      type: TransactionType.musdConversion,
    });

    expect(getByTestId('network-fee-row-skeleton')).toBeDefined();
    expect(queryByTestId(ConfirmationRowComponentIDs.NETWORK_FEE)).toBeNull();
    expect(queryByText('$0.23')).toBeNull();
  });

  it('renders network fee in tooltip', async () => {
    const { getByTestId, getByText } = render();

    await act(async () => {
      fireEvent.press(getByTestId('info-row-tooltip-open-btn'));
    });

    expect(getByText('$0.23')).toBeDefined();
  });

  it('renders bridge fee in tooltip', async () => {
    const { getByTestId, getByText } = render();

    await act(async () => {
      fireEvent.press(getByTestId('info-row-tooltip-open-btn'));
    });

    expect(getByText('$1')).toBeDefined();
  });

  it('renders skeletons if quotes loading', async () => {
    useIsTransactionPayLoadingMock.mockReturnValue(true);

    const { getByTestId } = render();

    expect(getByTestId('bridge-fee-row-skeleton')).toBeDefined();
    expect(getByTestId('metamask-fee-row-skeleton')).toBeDefined();
  });

  it('does not render tooltip if no quotes', async () => {
    useTransactionPayQuotesMock.mockReturnValue([]);
    const { queryByTestId } = render();
    expect(queryByTestId('info-row-tooltip-open-btn')).toBeNull();
  });

  it('does not render metamask fee if no quotes', async () => {
    useTransactionPayQuotesMock.mockReturnValue([]);

    const { getByTestId, queryByTestId } = render();

    expect(getByTestId('bridge-fee-row')).toBeDefined();
    expect(queryByTestId('metamask-fee-row')).toBeNull();
  });
});
