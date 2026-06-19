import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';
import {
  TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import { useIsMoneyAccountContext } from '../../../hooks/activity/useIsMoneyAccountContext';
import {
  TransactionDetails,
  SUMMARY_SECTION_TYPES,
} from './transaction-details';
import { merge } from 'lodash';
import { otherControllersMock } from '../../../__mocks__/controllers/other-controllers-mock';
import { strings } from '../../../../../../../locales/i18n';
import { TransactionDetailsHero } from '../transaction-details-hero';
import { TransactionDetailsStatusRow } from '../transaction-details-status-row';
import { TransactionDetailsDateRow } from '../transaction-details-date-row';

jest.mock('../../../hooks/activity/useTransactionDetails');
jest.mock('../../../hooks/activity/useIsMoneyAccountContext', () => ({
  useIsMoneyAccountContext: jest.fn().mockReturnValue(false),
}));
jest.mock('../transaction-details-hero', () => ({
  TransactionDetailsHero: jest.fn(() => null),
}));
jest.mock('../transaction-details-status-row', () => ({
  TransactionDetailsStatusRow: jest.fn(() => null),
}));
jest.mock('../transaction-details-date-row', () => ({
  TransactionDetailsDateRow: jest.fn(() => null),
}));
jest.mock('../transaction-details-account-row', () => ({
  TransactionDetailsAccountRow: jest.fn(() => null),
}));
jest.mock('../transaction-details-to-row', () => ({
  TransactionDetailsToRow: jest.fn(() => null),
}));
jest.mock('../transaction-details-fiat-order-id-row', () => ({
  TransactionDetailsFiatOrderIdRow: jest.fn(() => null),
}));
jest.mock('../transaction-details-paid-with-row', () => ({
  TransactionDetailsPaidWithRow: jest.fn(() => null),
}));
jest.mock('../transaction-details-network-fee-row', () => ({
  TransactionDetailsNetworkFeeRow: jest.fn(() => null),
}));
jest.mock('../transaction-details-bridge-fee-row', () => ({
  TransactionDetailsBridgeFeeRow: jest.fn(() => null),
}));
jest.mock('../transaction-details-total-row', () => ({
  TransactionDetailsTotalRow: jest.fn(() => null),
}));

const mockTransactionDetailsSummary = jest.fn(() => null);
jest.mock('../transaction-details-summary', () => ({
  TransactionDetailsSummary: () => mockTransactionDetailsSummary(),
}));

const mockTransactionDetailsRetry = jest.fn(() => null);
jest.mock('../transaction-details-retry', () => ({
  TransactionDetailsRetry: () => mockTransactionDetailsRetry(),
}));

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
}));

const CHAIN_ID_MOCK = '0x1';

const TRANSACTION_META_MOCK = {
  chainId: CHAIN_ID_MOCK,
  type: TransactionType.simpleSend,
} as unknown as TransactionMeta;

function render() {
  return renderWithProvider(<TransactionDetails />, {
    state: merge({}, otherControllersMock),
  });
}

describe('TransactionDetails', () => {
  const useTransactionDetailsMock = jest.mocked(useTransactionDetails);
  const useIsMoneyAccountContextMock = jest.mocked(useIsMoneyAccountContext);

  beforeEach(() => {
    jest.resetAllMocks();

    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: TRANSACTION_META_MOCK,
    });
  });

  it('renders without crashing', () => {
    expect(() => render()).not.toThrow();
  });

  describe('summary section rendering', () => {
    it('does not render summary section for simpleSend transactions', () => {
      render();

      expect(mockTransactionDetailsSummary).toHaveBeenCalledTimes(0);
      expect(mockTransactionDetailsRetry).toHaveBeenCalledTimes(0);
    });

    it('renders summary section exactly once for musdConversion transactions', () => {
      useTransactionDetailsMock.mockReturnValue({
        transactionMeta: {
          ...TRANSACTION_META_MOCK,
          type: TransactionType.musdConversion,
        } as unknown as TransactionMeta,
      });

      render();

      expect(mockTransactionDetailsSummary).toHaveBeenCalledTimes(1);
      expect(mockTransactionDetailsRetry).toHaveBeenCalledTimes(1);
    });

    it('renders summary section exactly once for perpsDeposit transactions', () => {
      useTransactionDetailsMock.mockReturnValue({
        transactionMeta: {
          ...TRANSACTION_META_MOCK,
          type: TransactionType.perpsDeposit,
        } as unknown as TransactionMeta,
      });

      render();

      expect(mockTransactionDetailsSummary).toHaveBeenCalledTimes(1);
      expect(mockTransactionDetailsRetry).toHaveBeenCalledTimes(1);
    });

    it('renders summary section exactly once for musdClaim transactions', () => {
      useTransactionDetailsMock.mockReturnValue({
        transactionMeta: {
          ...TRANSACTION_META_MOCK,
          type: TransactionType.musdClaim,
        } as unknown as TransactionMeta,
      });

      render();

      expect(mockTransactionDetailsSummary).toHaveBeenCalledTimes(1);
      expect(mockTransactionDetailsRetry).toHaveBeenCalledTimes(1);
    });

    it('renders summary section exactly once for predictDeposit nested transactions', () => {
      useTransactionDetailsMock.mockReturnValue({
        transactionMeta: {
          ...TRANSACTION_META_MOCK,
          nestedTransactions: [{ type: TransactionType.predictDeposit }],
        } as unknown as TransactionMeta,
      });

      render();

      expect(mockTransactionDetailsSummary).toHaveBeenCalledTimes(1);
      expect(mockTransactionDetailsRetry).toHaveBeenCalledTimes(1);
    });

    it('renders summary section exactly once for moneyAccountDeposit transactions', () => {
      useTransactionDetailsMock.mockReturnValue({
        transactionMeta: {
          ...TRANSACTION_META_MOCK,
          type: TransactionType.moneyAccountDeposit,
        } as unknown as TransactionMeta,
      });

      render();

      expect(mockTransactionDetailsSummary).toHaveBeenCalledTimes(1);
      expect(mockTransactionDetailsRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('getTitle', () => {
    it.each([
      [
        TransactionType.musdConversion,
        'transaction_details.title.musd_conversion',
      ],
      [TransactionType.perpsDeposit, 'transaction_details.title.perps_deposit'],
      [TransactionType.musdClaim, 'transaction_details.title.musd_claim'],
    ])('renders title for %s type', (type, titleKey) => {
      useTransactionDetailsMock.mockReturnValue({
        transactionMeta: {
          ...TRANSACTION_META_MOCK,
          type,
        } as unknown as TransactionMeta,
      });

      const { getByText } = render();

      expect(getByText(strings(titleKey))).toBeTruthy();
    });

    it.each([
      [TransactionType.predictClaim, 'transaction_details.title.predict_claim'],
      [
        TransactionType.predictDeposit,
        'transaction_details.title.predict_deposit',
      ],
      [
        TransactionType.predictWithdraw,
        'transaction_details.title.predict_withdraw',
      ],
      [
        TransactionType.perpsWithdraw,
        'transaction_details.title.perps_withdraw',
      ],
    ])('renders title for nested %s type', (type, titleKey) => {
      useTransactionDetailsMock.mockReturnValue({
        transactionMeta: {
          ...TRANSACTION_META_MOCK,
          nestedTransactions: [{ type }],
        } as unknown as TransactionMeta,
      });

      const { getByText } = render();

      expect(getByText(strings(titleKey))).toBeTruthy();
    });

    it('renders money_account_deposit title for nested moneyAccountDeposit', () => {
      useTransactionDetailsMock.mockReturnValue({
        transactionMeta: {
          ...TRANSACTION_META_MOCK,
          type: TransactionType.contractInteraction,
          nestedTransactions: [{ type: TransactionType.moneyAccountDeposit }],
        } as unknown as TransactionMeta,
      });

      const { getByText } = render();

      expect(
        getByText(strings('transaction_details.title.money_account_deposit')),
      ).toBeTruthy();
    });

    it('renders money_account_withdraw title for nested moneyAccountWithdraw', () => {
      useTransactionDetailsMock.mockReturnValue({
        transactionMeta: {
          ...TRANSACTION_META_MOCK,
          type: TransactionType.contractInteraction,
          nestedTransactions: [{ type: TransactionType.moneyAccountWithdraw }],
        } as unknown as TransactionMeta,
      });

      const { getByText } = render();

      expect(
        getByText(strings('transaction_details.title.money_account_withdraw')),
      ).toBeTruthy();
    });

    it('renders default title for other transaction types', () => {
      const { getByText } = render();

      expect(
        getByText(strings('transaction_details.title.default')),
      ).toBeTruthy();
    });

    it('renders default title when transaction metadata is missing', () => {
      useTransactionDetailsMock.mockReturnValue({
        transactionMeta: undefined as unknown as TransactionMeta,
      });

      const { getByText } = render();

      expect(
        getByText(strings('transaction_details.title.default')),
      ).toBeTruthy();
    });

    it('does not mount detail rows when transaction metadata is missing', () => {
      useTransactionDetailsMock.mockReturnValue({
        transactionMeta: undefined as unknown as TransactionMeta,
      });

      render();

      expect(jest.mocked(TransactionDetailsHero)).not.toHaveBeenCalled();
      expect(jest.mocked(TransactionDetailsStatusRow)).not.toHaveBeenCalled();
      expect(jest.mocked(TransactionDetailsDateRow)).not.toHaveBeenCalled();
      expect(mockTransactionDetailsSummary).not.toHaveBeenCalled();
      expect(mockTransactionDetailsRetry).not.toHaveBeenCalled();
    });
  });

  describe('header', () => {
    it('calls navigation.goBack when the back button is pressed', () => {
      const { getByTestId } = render();

      fireEvent.press(getByTestId('transaction-details-back-button'));

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('getTitle - money context', () => {
    beforeEach(() => {
      useIsMoneyAccountContextMock.mockReturnValue(true);
    });

    describe('getConversionTitle (musdConversion)', () => {
      it.each([
        [
          TransactionStatus.confirmed,
          'transaction_details.title.converted_to_musd',
        ],
        [
          TransactionStatus.submitted,
          'transaction_details.title.converting_to_musd',
        ],
        [
          TransactionStatus.failed,
          'transaction_details.title.conversion_failed',
        ],
      ])('returns %s title for status', (status, titleKey) => {
        useTransactionDetailsMock.mockReturnValue({
          transactionMeta: {
            ...TRANSACTION_META_MOCK,
            type: TransactionType.musdConversion,
            status,
          } as unknown as TransactionMeta,
        });

        const { getByText } = render();

        expect(getByText(strings(titleKey))).toBeTruthy();
      });
    });

    describe('getFiatDepositTitle (moneyAccountDeposit with fiat orderId)', () => {
      it.each([
        [
          TransactionStatus.confirmed,
          'transaction_details.title.deposited_musd',
        ],
        [
          TransactionStatus.submitted,
          'transaction_details.title.depositing_musd',
        ],
        [TransactionStatus.failed, 'transaction_details.title.deposit_failed'],
      ])('returns %s title for status', (status, titleKey) => {
        useTransactionDetailsMock.mockReturnValue({
          transactionMeta: {
            ...TRANSACTION_META_MOCK,
            type: TransactionType.moneyAccountDeposit,
            status,
            metamaskPay: { fiat: { orderId: 'order-123' } },
          } as unknown as TransactionMeta,
        });

        const { getByText } = render();

        expect(getByText(strings(titleKey))).toBeTruthy();
      });
    });

    it('moneyAccountDeposit without fiat orderId returns converted_to_musd', () => {
      useTransactionDetailsMock.mockReturnValue({
        transactionMeta: {
          ...TRANSACTION_META_MOCK,
          type: TransactionType.moneyAccountDeposit,
          status: TransactionStatus.confirmed,
        } as unknown as TransactionMeta,
      });

      const { getByText } = render();

      expect(
        getByText(strings('transaction_details.title.converted_to_musd')),
      ).toBeTruthy();
    });

    describe('getSendTitle (perpsDeposit)', () => {
      it.each([
        [TransactionStatus.confirmed, 'transaction_details.title.sent'],
        [TransactionStatus.submitted, 'transaction_details.title.sending_musd'],
        [TransactionStatus.failed, 'transaction_details.title.send_failed'],
      ])('returns %s title for status', (status, titleKey) => {
        useTransactionDetailsMock.mockReturnValue({
          transactionMeta: {
            ...TRANSACTION_META_MOCK,
            type: TransactionType.perpsDeposit,
            status,
          } as unknown as TransactionMeta,
        });

        const { getByText } = render();

        expect(getByText(strings(titleKey))).toBeTruthy();
      });
    });

    it('predictDeposit returns sent when confirmed', () => {
      useTransactionDetailsMock.mockReturnValue({
        transactionMeta: {
          ...TRANSACTION_META_MOCK,
          status: TransactionStatus.confirmed,
          nestedTransactions: [{ type: TransactionType.predictDeposit }],
        } as unknown as TransactionMeta,
      });

      const { getByText } = render();

      expect(getByText(strings('transaction_details.title.sent'))).toBeTruthy();
    });

    it('perpsWithdraw returns deposited_musd', () => {
      useTransactionDetailsMock.mockReturnValue({
        transactionMeta: {
          ...TRANSACTION_META_MOCK,
          nestedTransactions: [{ type: TransactionType.perpsWithdraw }],
        } as unknown as TransactionMeta,
      });

      const { getByText } = render();

      expect(
        getByText(strings('transaction_details.title.deposited_musd')),
      ).toBeTruthy();
    });

    it('predictWithdraw returns deposited_musd', () => {
      useTransactionDetailsMock.mockReturnValue({
        transactionMeta: {
          ...TRANSACTION_META_MOCK,
          nestedTransactions: [{ type: TransactionType.predictWithdraw }],
        } as unknown as TransactionMeta,
      });

      const { getByText } = render();

      expect(
        getByText(strings('transaction_details.title.deposited_musd')),
      ).toBeTruthy();
    });
  });

  describe('SUMMARY_SECTION_TYPES', () => {
    it.each([
      TransactionType.musdConversion,
      TransactionType.musdClaim,
      TransactionType.moneyAccountDeposit,
      TransactionType.moneyAccountWithdraw,
      TransactionType.perpsDeposit,
      TransactionType.perpsWithdraw,
      TransactionType.predictDeposit,
      TransactionType.predictWithdraw,
    ])('includes %s', (type) => {
      expect(SUMMARY_SECTION_TYPES).toContain(type);
    });

    it('contains exactly 8 transaction types', () => {
      expect(SUMMARY_SECTION_TYPES).toHaveLength(8);
    });
  });
});
