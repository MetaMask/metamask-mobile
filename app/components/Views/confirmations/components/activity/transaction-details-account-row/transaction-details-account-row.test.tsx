import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { TransactionDetailsAccountRow } from './transaction-details-account-row';
import { useAccountNames } from '../../../../../hooks/DisplayName/useAccountNames';
import { Hex } from '@metamask/utils';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';
import { selectPrimaryMoneyAccount } from '../../../../../../selectors/moneyAccountController';
import useNetworkInfo from '../../../hooks/useNetworkInfo';
import { strings } from '../../../../../../../locales/i18n';

jest.mock('../../../../../hooks/DisplayName/useAccountNames');
jest.mock('../../../hooks/activity/useTransactionDetails');
jest.mock('../../../hooks/activity/useIsMoneyAccountContext', () => ({
  useIsMoneyAccountContext: jest.fn().mockReturnValue(false),
}));
jest.mock('../../../../../../selectors/moneyAccountController');
jest.mock('../../../hooks/useNetworkInfo');

const ACCOUNT_NAME_MOCK = 'Test Account 1';
const ADDRESS_MOCK = '0x123' as Hex;
const MONEY_ADDRESS_MOCK = '0xMoneyAddress';

const TRANSACTION_META_MOCK = {
  chainId: '0x123' as Hex,
  txParams: {
    from: ADDRESS_MOCK,
  },
  type: TransactionType.predictWithdraw,
} as TransactionMeta;

function render() {
  return renderWithProvider(<TransactionDetailsAccountRow />, {});
}

describe('TransactionDetailsAccountRow', () => {
  const useTransactionDetailsMock = jest.mocked(useTransactionDetails);
  const useAccountNamesMock = jest.mocked(useAccountNames);
  const selectPrimaryMoneyAccountMock = jest.mocked(selectPrimaryMoneyAccount);
  const useNetworkInfoMock = jest.mocked(useNetworkInfo);

  beforeEach(() => {
    jest.resetAllMocks();

    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: TRANSACTION_META_MOCK,
    });

    useAccountNamesMock.mockReturnValue([ACCOUNT_NAME_MOCK]);

    selectPrimaryMoneyAccountMock.mockReturnValue({
      address: MONEY_ADDRESS_MOCK,
    } as ReturnType<typeof selectPrimaryMoneyAccount>);

    useNetworkInfoMock.mockReturnValue({
      networkName: 'Arbitrum',
      networkImage: 'https://example.com/arb.png',
      networkNativeCurrency: 'ETH',
    });
  });

  it('renders account name', () => {
    const { getByText } = render();
    expect(getByText(ACCOUNT_NAME_MOCK)).toBeDefined();
  });

  it('renders address if no account name', () => {
    // @ts-expect-error - testing undefined return value
    useAccountNamesMock.mockReturnValue([undefined]);

    const { getByText } = render();
    expect(getByText(ADDRESS_MOCK)).toBeDefined();
  });

  it('renders nothing if transaction type is not in the list', () => {
    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        ...TRANSACTION_META_MOCK,
        type: TransactionType.simpleSend,
      },
    });

    const { toJSON } = render();
    expect(toJSON()).toBeNull();
  });

  it.each([
    TransactionType.perpsWithdraw,
    TransactionType.predictClaim,
    TransactionType.predictWithdraw,
  ])('renders account row for %s', (type) => {
    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: { ...TRANSACTION_META_MOCK, type },
    });

    const { getByText } = render();
    expect(getByText(ACCOUNT_NAME_MOCK)).toBeDefined();
  });

  it.each([
    TransactionType.perpsWithdraw,
    TransactionType.predictClaim,
    TransactionType.predictWithdraw,
  ])('renders badge and avatar for account row %s', (type) => {
    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: { ...TRANSACTION_META_MOCK, type },
    });

    const { UNSAFE_getByProps } = render();
    expect(UNSAFE_getByProps({ accountAddress: ADDRESS_MOCK })).toBeDefined();
  });

  it('renders "From" row with money account label for moneyAccountWithdraw', () => {
    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        chainId: '0xa4b1',
        type: TransactionType.moneyAccountWithdraw,
        txParams: { from: '0xSender' },
      } as unknown as TransactionMeta,
    });

    const { getByText } = render();
    expect(getByText(strings('transaction_details.label.from'))).toBeDefined();
    expect(
      getByText(strings('transaction_details.label.money_account')),
    ).toBeDefined();
  });

  it('returns null for moneyAccountWithdraw when money account address is undefined', () => {
    selectPrimaryMoneyAccountMock.mockReturnValue(undefined);

    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        chainId: '0xa4b1',
        type: TransactionType.moneyAccountWithdraw,
        txParams: { from: '0xSender' },
      } as unknown as TransactionMeta,
    });

    const { toJSON } = render();
    expect(toJSON()).toBeNull();
  });

  it('uses metamaskPay.chainId when available for withdraw', () => {
    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        chainId: '0x1',
        type: TransactionType.moneyAccountWithdraw,
        txParams: { from: '0xSender' },
        metamaskPay: { chainId: '0xa4b1' },
      } as unknown as TransactionMeta,
    });

    const { getByText } = render();
    expect(useNetworkInfoMock).toHaveBeenCalledWith('0xa4b1');
    expect(
      getByText(strings('transaction_details.label.money_account')),
    ).toBeDefined();
  });

  describe('money context inflow/outflow paths', () => {
    const { useIsMoneyAccountContext: useIsMoneyAccountContextMock } =
      jest.requireMock('../../../hooks/activity/useIsMoneyAccountContext');

    afterEach(() => {
      useIsMoneyAccountContextMock.mockReturnValue(false);
    });

    it('renders "From" with "Perps Account 1" for perpsWithdraw in money context', () => {
      useIsMoneyAccountContextMock.mockReturnValue(true);

      useTransactionDetailsMock.mockReturnValue({
        transactionMeta: {
          ...TRANSACTION_META_MOCK,
          type: TransactionType.perpsWithdraw,
        },
      });

      const { getByText } = render();
      expect(
        getByText(strings('transaction_details.label.from')),
      ).toBeDefined();
      expect(
        getByText(strings('transaction_details.label.perps_account')),
      ).toBeDefined();
    });

    it('renders "From" with "Predictions Account 1" for predictWithdraw in money context', () => {
      useIsMoneyAccountContextMock.mockReturnValue(true);

      useTransactionDetailsMock.mockReturnValue({
        transactionMeta: {
          ...TRANSACTION_META_MOCK,
          type: TransactionType.predictWithdraw,
        },
      });

      const { getByText } = render();
      expect(
        getByText(strings('transaction_details.label.from')),
      ).toBeDefined();
      expect(
        getByText(strings('transaction_details.label.predictions_account')),
      ).toBeDefined();
    });

    it('renders "From" with "Money account" for perpsDeposit in money context', () => {
      useIsMoneyAccountContextMock.mockReturnValue(true);

      useTransactionDetailsMock.mockReturnValue({
        transactionMeta: {
          ...TRANSACTION_META_MOCK,
          type: TransactionType.perpsDeposit,
        },
      });

      const { getByText } = render();
      expect(
        getByText(strings('transaction_details.label.from')),
      ).toBeDefined();
      expect(
        getByText(strings('transaction_details.label.money_account')),
      ).toBeDefined();
    });

    it('renders "From" with "Money account" for predictDeposit in money context', () => {
      useIsMoneyAccountContextMock.mockReturnValue(true);

      useTransactionDetailsMock.mockReturnValue({
        transactionMeta: {
          ...TRANSACTION_META_MOCK,
          type: TransactionType.predictDeposit,
        },
      });

      const { getByText } = render();
      expect(
        getByText(strings('transaction_details.label.from')),
      ).toBeDefined();
      expect(
        getByText(strings('transaction_details.label.money_account')),
      ).toBeDefined();
    });
  });
});
