import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';
import { useIsMoneyAccountContext } from '../../../hooks/activity/useIsMoneyAccountContext';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { TransactionDetailsNetworkFeeRow } from './transaction-details-network-fee-row';
import { useFeeCalculations } from '../../../hooks/gas/useFeeCalculations';
import { strings } from '../../../../../../../locales/i18n';

jest.mock('../../../hooks/activity/useTransactionDetails');
jest.mock('../../../hooks/activity/useIsMoneyAccountContext');
jest.mock('../../../hooks/gas/useFeeCalculations');
jest.mock('../../token-icon', () => ({
  TokenIcon: () => null,
  TokenIconVariant: { Row: 'row' },
}));

const PAY_FEE_MOCK = '123.45';
const CALCULATED_FEE_MOCK = '234.56';

function render() {
  return renderWithProvider(<TransactionDetailsNetworkFeeRow />, {});
}

describe('TransactionDetailsNetworkFeeRow', () => {
  const useTransactionDetailsMock = jest.mocked(useTransactionDetails);
  const useIsMoneyAccountContextMock = jest.mocked(useIsMoneyAccountContext);
  const useFeeCalculationsMock = jest.mocked(useFeeCalculations);

  beforeEach(() => {
    jest.resetAllMocks();

    useIsMoneyAccountContextMock.mockReturnValue(false);

    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        metamaskPay: {
          networkFeeFiat: PAY_FEE_MOCK,
        },
      } as unknown as TransactionMeta,
    });

    useFeeCalculationsMock.mockReturnValue({
      estimatedFeeFiatPrecise: CALCULATED_FEE_MOCK,
    } as unknown as ReturnType<typeof useFeeCalculations>);
  });

  it('renders network fee from pay metadata', () => {
    const { getByText } = render();
    expect(getByText(`$${PAY_FEE_MOCK}`)).toBeDefined();
  });

  it('renders network fee from calculation', () => {
    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        type: TransactionType.predictWithdraw,
      } as unknown as TransactionMeta,
    });

    const { getByText } = render();
    expect(getByText(`$${CALCULATED_FEE_MOCK}`)).toBeDefined();
  });

  it('renders nothing if no pay metadata and type not supported', () => {
    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        metamaskPay: {},
      } as unknown as TransactionMeta,
    });

    const { toJSON } = render();

    expect(toJSON()).toBeNull();
  });

  it('renders calculated network fee for moneyAccountWithdraw fallback', () => {
    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        type: TransactionType.moneyAccountWithdraw,
      } as unknown as TransactionMeta,
    });

    const { getByText } = render();
    expect(getByText(`$${CALCULATED_FEE_MOCK}`)).toBeDefined();
  });

  it('renders calculated network fee for revoke delegation fallback', () => {
    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        type: TransactionType.revokeDelegation,
      } as unknown as TransactionMeta,
    });

    const { getByText } = render();

    expect(getByText(`$${CALCULATED_FEE_MOCK}`)).toBeDefined();
  });

  it('renders Paid by MetaMask for sponsored fees in money context', () => {
    useIsMoneyAccountContextMock.mockReturnValue(true);
    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        type: TransactionType.musdConversion,
        metamaskPay: {
          networkFeeFiat: '0',
        },
      } as unknown as TransactionMeta,
    });

    const { getByText } = render();

    expect(getByText(strings('transactions.paid_by_metamask'))).toBeDefined();
  });

  it('renders TokenIcon next to fee in money context (non-sponsored)', () => {
    useIsMoneyAccountContextMock.mockReturnValue(true);
    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        type: TransactionType.moneyAccountWithdraw,
        metamaskPay: {
          networkFeeFiat: '5.00',
          chainId: '0x1',
        },
      } as unknown as TransactionMeta,
    });

    const { getByText, queryByTestId } = render();

    expect(getByText('$5')).toBeDefined();
    expect(queryByTestId('paid-by-metamask')).toBeNull();
  });
});
