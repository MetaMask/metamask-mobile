import React from 'react';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import { merge } from 'lodash';
import { simpleSendTransactionControllerMock } from '../../../../__mocks__/controllers/transaction-controller-mock';
import { transactionApprovalControllerMock } from '../../../../__mocks__/controllers/approval-controller-mock';
import { otherControllersMock } from '../../../../__mocks__/controllers/other-controllers-mock';
import { PerpsDepositFees } from './perps-deposit-fees';
import {
  useIsTransactionPayLoading,
  useTransactionPayQuotes,
  useTransactionPayRequiredTokens,
  useTransactionPaySourceAmounts,
  useTransactionPayTotals,
} from '../../../../hooks/pay/useTransactionPayData';
import {
  TransactionPayQuote,
  TransactionPayRequiredToken,
  TransactionPaySourceAmount,
  TransactionPayTotals,
} from '@metamask/transaction-pay-controller';
import { Json } from '@metamask/utils';

jest.mock('../../../../hooks/pay/useTransactionPayData');
jest.mock('../../../../hooks/metrics/useConfirmationAlertMetrics', () => ({
  useConfirmationAlertMetrics: () => ({
    trackInlineAlertClicked: jest.fn(),
    trackAlertActionClicked: jest.fn(),
    trackAlertRendered: jest.fn(),
  }),
}));

function render() {
  const state = merge(
    {},
    simpleSendTransactionControllerMock,
    transactionApprovalControllerMock,
    otherControllersMock,
  );

  return renderWithProvider(<PerpsDepositFees />, { state });
}

describe('PerpsDepositFees', () => {
  const useTransactionPayQuotesMock = jest.mocked(useTransactionPayQuotes);
  const useIsTransactionPayLoadingMock = jest.mocked(
    useIsTransactionPayLoading,
  );
  const useTransactionPayRequiredTokensMock = jest.mocked(
    useTransactionPayRequiredTokens,
  );
  const useTransactionPaySourceAmountsMock = jest.mocked(
    useTransactionPaySourceAmounts,
  );
  const useTransactionPayTotalsMock = jest.mocked(useTransactionPayTotals);

  beforeEach(() => {
    jest.resetAllMocks();

    useTransactionPayQuotesMock.mockReturnValue([
      {} as TransactionPayQuote<Json>,
    ]);
    useIsTransactionPayLoadingMock.mockReturnValue(false);
    useTransactionPayRequiredTokensMock.mockReturnValue([]);
    useTransactionPaySourceAmountsMock.mockReturnValue([]);
    useTransactionPayTotalsMock.mockReturnValue({
      fees: {
        provider: { usd: '1.00' },
        sourceNetwork: { estimate: { usd: '0.20' } },
        targetNetwork: { usd: '0.03' },
      },
      total: { usd: '123.456' },
    } as TransactionPayTotals);
  });

  it('renders fee rows when result is ready', () => {
    const { getByTestId } = render();

    expect(getByTestId('bridge-fee-row')).toBeOnTheScreen();
    expect(getByTestId('total-row')).toBeOnTheScreen();
  });

  it('renders fee rows when quotes are loading', () => {
    useIsTransactionPayLoadingMock.mockReturnValue(true);

    const { getByTestId } = render();

    // When loading, isResultReady is true, so fee rows container should be shown
    // But BridgeFeeRow itself shows skeleton when loading, so we check for skeleton
    expect(getByTestId('bridge-fee-row-skeleton')).toBeOnTheScreen();
  });

  it('renders fee rows when no quotes and no source amounts', () => {
    useTransactionPayQuotesMock.mockReturnValue([]);
    useIsTransactionPayLoadingMock.mockReturnValue(false);
    useTransactionPaySourceAmountsMock.mockReturnValue([]);

    const { getByTestId } = render();

    // When no source amounts, isResultReady is true (!hasSourceAmount), so fee rows should be shown
    expect(getByTestId('bridge-fee-row')).toBeOnTheScreen();
  });

  it('renders fee rows when quotes exist', () => {
    useTransactionPayQuotesMock.mockReturnValue([
      {} as TransactionPayQuote<Json>,
    ]);
    useIsTransactionPayLoadingMock.mockReturnValue(false);
    useTransactionPaySourceAmountsMock.mockReturnValue([
      {
        targetTokenAddress: '0x123',
        amount: '100',
      } as TransactionPaySourceAmount,
    ]);

    const { getByTestId } = render();

    expect(getByTestId('bridge-fee-row')).toBeOnTheScreen();
  });

  it('renders fee rows when required tokens exist but no matching source amounts', () => {
    useTransactionPayQuotesMock.mockReturnValue([]);
    useIsTransactionPayLoadingMock.mockReturnValue(false);
    useTransactionPayRequiredTokensMock.mockReturnValue([
      {
        address: '0x123',
        skipIfBalance: false,
      } as TransactionPayRequiredToken,
    ]);
    useTransactionPaySourceAmountsMock.mockReturnValue([
      {
        targetTokenAddress: '0x456', // Different address - no match
        amount: '100',
      } as TransactionPaySourceAmount,
    ]);

    const { getByTestId } = render();

    // When hasSourceAmount is false (no match), isResultReady is true, so fee rows should be shown
    // But actually, hasSourceAmount checks if sourceAmounts match requiredTokens
    // Since addresses don't match, hasSourceAmount is false, so !hasSourceAmount is true
    // So isResultReady is true, and fee rows should be shown
    expect(getByTestId('bridge-fee-row')).toBeOnTheScreen();
  });

  it('renders skeletons when required tokens match source amounts', () => {
    useTransactionPayQuotesMock.mockReturnValue([]);
    useIsTransactionPayLoadingMock.mockReturnValue(false);
    useTransactionPayRequiredTokensMock.mockReturnValue([
      {
        address: '0x123',
        skipIfBalance: false,
      } as TransactionPayRequiredToken,
    ]);
    useTransactionPaySourceAmountsMock.mockReturnValue([
      {
        targetTokenAddress: '0x123', // Matching address
        amount: '100',
      } as TransactionPaySourceAmount,
    ]);

    const { queryByTestId } = render();

    // When hasSourceAmount is true (match found), isResultReady is false
    // (because !hasSourceAmount is false), so skeletons should be shown
    expect(queryByTestId('bridge-fee-row')).toBeNull();
  });

  it('renders fee rows when required token has skipIfBalance true', () => {
    useTransactionPayQuotesMock.mockReturnValue([]);
    useIsTransactionPayLoadingMock.mockReturnValue(false);
    useTransactionPayRequiredTokensMock.mockReturnValue([
      {
        address: '0x123',
        skipIfBalance: true, // Should be skipped in hasSourceAmount check
      } as TransactionPayRequiredToken,
    ]);
    useTransactionPaySourceAmountsMock.mockReturnValue([
      {
        targetTokenAddress: '0x123',
        amount: '100',
      } as TransactionPaySourceAmount,
    ]);

    const { getByTestId } = render();

    // When skipIfBalance is true, that token is not considered in hasSourceAmount
    // So hasSourceAmount is false, !hasSourceAmount is true, isResultReady is true
    // So fee rows should be shown
    expect(getByTestId('bridge-fee-row')).toBeOnTheScreen();
  });
});
