import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';
import { useIsMoneyAccountContext } from '../../../hooks/activity/useIsMoneyAccountContext';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { TransactionDetailsFeeSection } from './transaction-details-fee-section';
import { useFeeCalculations } from '../../../hooks/gas/useFeeCalculations';
import { strings } from '../../../../../../../locales/i18n';

jest.mock('../../../hooks/activity/useTransactionDetails');
jest.mock('../../../hooks/activity/useIsMoneyAccountContext');
jest.mock('../../../hooks/gas/useFeeCalculations');

function render() {
  return renderWithProvider(<TransactionDetailsFeeSection />, {});
}

describe('TransactionDetailsFeeSection', () => {
  const useTransactionDetailsMock = jest.mocked(useTransactionDetails);
  const useIsMoneyAccountContextMock = jest.mocked(useIsMoneyAccountContext);
  const useFeeCalculationsMock = jest.mocked(useFeeCalculations);

  beforeEach(() => {
    jest.resetAllMocks();

    useIsMoneyAccountContextMock.mockReturnValue(false);

    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        metamaskPay: {
          networkFeeFiat: '5.00',
          bridgeFeeFiat: '1.00',
        },
      } as unknown as TransactionMeta,
    });

    useFeeCalculationsMock.mockReturnValue({
      estimatedFeeFiatPrecise: '3.00',
    } as unknown as ReturnType<typeof useFeeCalculations>);
  });

  it('renders single "Transaction fee" row with Paid by MetaMask when sponsored', () => {
    useIsMoneyAccountContextMock.mockReturnValue(true);
    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        type: TransactionType.musdConversion,
        metamaskPay: {
          networkFeeFiat: '0',
          bridgeFeeFiat: '0',
        },
      } as unknown as TransactionMeta,
    });

    const { getByText, getByTestId } = render();

    expect(
      getByText(strings('transaction_details.label.transaction_fees')),
    ).toBeDefined();
    expect(getByText(strings('transactions.paid_by_metamask'))).toBeDefined();
    expect(getByTestId('paid-by-metamask')).toBeDefined();
  });

  it('renders single "Transaction fee" row for moneyAccountDeposit when sponsored', () => {
    useIsMoneyAccountContextMock.mockReturnValue(true);
    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        type: TransactionType.moneyAccountDeposit,
        metamaskPay: {
          networkFeeFiat: '0',
        },
      } as unknown as TransactionMeta,
    });

    const { getByText } = render();

    expect(
      getByText(strings('transaction_details.label.transaction_fees')),
    ).toBeDefined();
    expect(getByText(strings('transactions.paid_by_metamask'))).toBeDefined();
  });

  it('renders both fee rows individually when gas is sponsored but a bridge fee is charged', () => {
    useIsMoneyAccountContextMock.mockReturnValue(true);
    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        type: TransactionType.musdConversion,
        metamaskPay: {
          networkFeeFiat: '0',
          bridgeFeeFiat: '0.89',
        },
      } as unknown as TransactionMeta,
    });

    const { getByText, queryByText } = render();

    expect(
      getByText(strings('transaction_details.label.network_fee')),
    ).toBeDefined();
    expect(
      getByText(strings('transaction_details.label.bridge_fee')),
    ).toBeDefined();
    expect(queryByText(strings('transactions.paid_by_metamask'))).toBeNull();
  });

  it('renders both fee rows when not sponsored', () => {
    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        metamaskPay: {
          networkFeeFiat: '5.00',
          bridgeFeeFiat: '1.00',
        },
      } as unknown as TransactionMeta,
    });

    const { getByText } = render();

    expect(
      getByText(strings('transaction_details.label.network_fee')),
    ).toBeDefined();
    expect(
      getByText(strings('transaction_details.label.bridge_fee')),
    ).toBeDefined();
  });

  it('renders both fee rows when not in money context even with zero fee', () => {
    useIsMoneyAccountContextMock.mockReturnValue(false);
    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        type: TransactionType.musdConversion,
        metamaskPay: {
          networkFeeFiat: '0',
          bridgeFeeFiat: '1.00',
        },
      } as unknown as TransactionMeta,
    });

    const { getByText } = render();

    expect(
      getByText(strings('transaction_details.label.network_fee')),
    ).toBeDefined();
  });

  it('renders both fee rows when network fee is non-zero', () => {
    useIsMoneyAccountContextMock.mockReturnValue(true);
    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        type: TransactionType.musdConversion,
        metamaskPay: {
          networkFeeFiat: '2.50',
          bridgeFeeFiat: '1.00',
        },
      } as unknown as TransactionMeta,
    });

    const { getByText } = render();

    expect(
      getByText(strings('transaction_details.label.network_fee')),
    ).toBeDefined();
    expect(
      getByText(strings('transaction_details.label.bridge_fee')),
    ).toBeDefined();
  });
});
