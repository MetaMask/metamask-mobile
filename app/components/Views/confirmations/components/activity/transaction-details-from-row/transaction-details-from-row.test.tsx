import React from 'react';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { TransactionDetailsFromRow } from './transaction-details-from-row';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';
import { selectPrimaryMoneyAccount } from '../../../../../../selectors/moneyAccountController';
import useNetworkInfo from '../../../hooks/useNetworkInfo';
import { strings } from '../../../../../../../locales/i18n';

jest.mock('../../../hooks/activity/useTransactionDetails');
jest.mock('../../../../../../selectors/moneyAccountController');
jest.mock('../../../hooks/useNetworkInfo');

const MONEY_ADDRESS_MOCK = '0xMoneyAddress';

function render() {
  return renderWithProvider(<TransactionDetailsFromRow />, {});
}

describe('TransactionDetailsFromRow', () => {
  const useTransactionDetailsMock = jest.mocked(useTransactionDetails);
  const selectPrimaryMoneyAccountMock = jest.mocked(selectPrimaryMoneyAccount);
  const useNetworkInfoMock = jest.mocked(useNetworkInfo);

  beforeEach(() => {
    jest.resetAllMocks();

    selectPrimaryMoneyAccountMock.mockReturnValue({
      address: MONEY_ADDRESS_MOCK,
    } as ReturnType<typeof selectPrimaryMoneyAccount>);

    useNetworkInfoMock.mockReturnValue({
      networkName: 'Arbitrum',
      networkImage: 'https://example.com/arb.png',
    });
  });

  it('renders "From" row with money account label for moneyAccountWithdraw', () => {
    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        chainId: '0xa4b1',
        type: TransactionType.moneyAccountWithdraw,
      } as unknown as TransactionMeta,
    });

    const { getByText } = render();

    expect(getByText(strings('transaction_details.label.from'))).toBeDefined();
    expect(
      getByText(strings('transaction_details.label.money_account')),
    ).toBeDefined();
  });

  it('returns null for non-withdraw transaction types', () => {
    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        chainId: '0x1',
        type: TransactionType.moneyAccountDeposit,
      } as unknown as TransactionMeta,
    });

    const { toJSON } = render();
    expect(toJSON()).toBeNull();
  });

  it('returns null when money account address is undefined', () => {
    selectPrimaryMoneyAccountMock.mockReturnValue(undefined);

    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        chainId: '0xa4b1',
        type: TransactionType.moneyAccountWithdraw,
      } as unknown as TransactionMeta,
    });

    const { toJSON } = render();
    expect(toJSON()).toBeNull();
  });

  it('uses metamaskPay.chainId when available', () => {
    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        chainId: '0x1',
        type: TransactionType.moneyAccountWithdraw,
        metamaskPay: {
          chainId: '0xa4b1',
          tokenAddress: '0x123',
        },
      } as unknown as TransactionMeta,
    });

    const { getByText } = render();
    expect(useNetworkInfoMock).toHaveBeenCalledWith('0xa4b1');
    expect(
      getByText(strings('transaction_details.label.money_account')),
    ).toBeDefined();
  });

  it('falls back to transactionMeta.chainId when metamaskPay.chainId is absent', () => {
    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        chainId: '0x1',
        type: TransactionType.moneyAccountWithdraw,
      } as unknown as TransactionMeta,
    });

    render();
    expect(useNetworkInfoMock).toHaveBeenCalledWith('0x1');
  });
});
