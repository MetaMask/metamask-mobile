import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';
import {
  TransactionMeta,
  TransactionStatus,
  TransactionType,
  CHAIN_IDS,
} from '@metamask/transaction-controller';
import { useIsMoneyAccountContext } from '../../../hooks/activity/useIsMoneyAccountContext';
import {
  TransactionDetails,
  SUMMARY_SECTION_TYPES,
} from './transaction-details';
import { merge } from 'lodash';
import { otherControllersMock } from '../../../__mocks__/controllers/other-controllers-mock';
import { strings } from '../../../../../../../locales/i18n';
import { MUSD_TOKEN_ADDRESS } from '../../../../../UI/Earn/constants/musd';
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

    it('renders money_account_withdraw title for nested moneyAccountWithdraw outside money context', () => {
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

    // The Money details header reuses the activity-list label, which is always
    // plain "Sent" regardless of token/chain (no per-token symbol suffix).
    it('renders Sent title for mUSD-to-mUSD moneyAccountWithdraw in money context', () => {
      useIsMoneyAccountContextMock.mockReturnValue(true);
      useTransactionDetailsMock.mockReturnValue({
        transactionMeta: {
          ...TRANSACTION_META_MOCK,
          type: TransactionType.moneyAccountWithdraw,
          status: TransactionStatus.confirmed,
          metamaskPay: {
            tokenAddress: MUSD_TOKEN_ADDRESS,
            chainId: CHAIN_IDS.MONAD,
            targetFiat: '200.00',
          },
        } as unknown as TransactionMeta,
      });

      const { getByText } = render();

      expect(getByText(strings('money.transaction.sent'))).toBeTruthy();
    });

    it('renders Sent title for cross-chain mUSD moneyAccountWithdraw in money context', () => {
      useIsMoneyAccountContextMock.mockReturnValue(true);
      useTransactionDetailsMock.mockReturnValue({
        transactionMeta: {
          ...TRANSACTION_META_MOCK,
          type: TransactionType.moneyAccountWithdraw,
          status: TransactionStatus.confirmed,
          metamaskPay: {
            tokenAddress: MUSD_TOKEN_ADDRESS,
            chainId: CHAIN_IDS.LINEA_MAINNET,
            targetFiat: '0.10',
          },
        } as unknown as TransactionMeta,
      });

      const { getByText } = render();

      expect(getByText(strings('money.transaction.sent'))).toBeTruthy();
    });

    it('renders Sent title for cross-token moneyAccountWithdraw in money context', () => {
      useIsMoneyAccountContextMock.mockReturnValue(true);
      useTransactionDetailsMock.mockReturnValue({
        transactionMeta: {
          ...TRANSACTION_META_MOCK,
          type: TransactionType.moneyAccountWithdraw,
          status: TransactionStatus.confirmed,
          metamaskPay: {
            tokenAddress: '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
            chainId: CHAIN_ID_MOCK,
            targetFiat: '200.00',
          },
        } as unknown as TransactionMeta,
      });

      const { getByText } = render();

      expect(getByText(strings('money.transaction.sent'))).toBeTruthy();
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

    describe('musdConversion', () => {
      it.each([
        [TransactionStatus.confirmed, 'money.transaction.converted'],
        [TransactionStatus.submitted, 'money.transaction.converting'],
        [TransactionStatus.failed, 'money.transaction.conversion_failed'],
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

    describe('moneyAccountDeposit with fiat orderId', () => {
      it.each([
        [TransactionStatus.confirmed, 'money.transaction.deposited'],
        [TransactionStatus.submitted, 'money.transaction.depositing'],
        [TransactionStatus.failed, 'money.transaction.deposit_failed'],
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

    it('moneyAccountDeposit funded with mUSD returns deposited', () => {
      useTransactionDetailsMock.mockReturnValue({
        transactionMeta: {
          ...TRANSACTION_META_MOCK,
          type: TransactionType.moneyAccountDeposit,
          status: TransactionStatus.confirmed,
          metamaskPay: { tokenAddress: MUSD_TOKEN_ADDRESS },
        } as unknown as TransactionMeta,
      });

      const { getByText } = render();

      expect(getByText(strings('money.transaction.deposited'))).toBeTruthy();
    });

    it('moneyAccountDeposit funded with crypto returns converted', () => {
      useTransactionDetailsMock.mockReturnValue({
        transactionMeta: {
          ...TRANSACTION_META_MOCK,
          type: TransactionType.moneyAccountDeposit,
          status: TransactionStatus.confirmed,
        } as unknown as TransactionMeta,
      });

      const { getByText } = render();

      expect(getByText(strings('money.transaction.converted'))).toBeTruthy();
    });

    // perps/predict deposits funded from the Money account are matched via the
    // mUSD-on-Monad pay token and read as a "Sent" from the Money account.
    describe('perpsDeposit funded from the Money account', () => {
      it.each([
        [TransactionStatus.confirmed, 'money.transaction.sent'],
        [TransactionStatus.submitted, 'money.transaction.sending'],
        [TransactionStatus.failed, 'money.transaction.send_failed'],
      ])('returns %s title for status', (status, titleKey) => {
        useTransactionDetailsMock.mockReturnValue({
          transactionMeta: {
            ...TRANSACTION_META_MOCK,
            type: TransactionType.perpsDeposit,
            status,
            metamaskPay: {
              tokenAddress: MUSD_TOKEN_ADDRESS,
              chainId: CHAIN_IDS.MONAD,
            },
          } as unknown as TransactionMeta,
        });

        const { getByText } = render();

        expect(getByText(strings(titleKey))).toBeTruthy();
      });
    });

    it('predictDeposit funded from the Money account returns sent when confirmed', () => {
      useTransactionDetailsMock.mockReturnValue({
        transactionMeta: {
          ...TRANSACTION_META_MOCK,
          type: TransactionType.batch,
          status: TransactionStatus.confirmed,
          nestedTransactions: [{ type: TransactionType.predictDeposit }],
          metamaskPay: {
            tokenAddress: MUSD_TOKEN_ADDRESS,
            chainId: CHAIN_IDS.MONAD,
          },
        } as unknown as TransactionMeta,
      });

      const { getByText } = render();

      expect(getByText(strings('money.transaction.sent'))).toBeTruthy();
    });

    // perps/predict withdraws landing in the Money account read as "Deposited".
    it('perpsWithdraw into the Money account returns deposited', () => {
      useTransactionDetailsMock.mockReturnValue({
        transactionMeta: {
          ...TRANSACTION_META_MOCK,
          type: TransactionType.batch,
          nestedTransactions: [{ type: TransactionType.perpsWithdraw }],
          metamaskPay: {
            tokenAddress: MUSD_TOKEN_ADDRESS,
            chainId: CHAIN_IDS.MONAD,
            isPostQuote: true,
          },
        } as unknown as TransactionMeta,
      });

      const { getByText } = render();

      expect(getByText(strings('money.transaction.deposited'))).toBeTruthy();
    });

    it('predictWithdraw into the Money account returns deposited', () => {
      useTransactionDetailsMock.mockReturnValue({
        transactionMeta: {
          ...TRANSACTION_META_MOCK,
          type: TransactionType.batch,
          nestedTransactions: [{ type: TransactionType.predictWithdraw }],
          metamaskPay: {
            tokenAddress: MUSD_TOKEN_ADDRESS,
            chainId: CHAIN_IDS.MONAD,
            isPostQuote: true,
          },
        } as unknown as TransactionMeta,
      });

      const { getByText } = render();

      expect(getByText(strings('money.transaction.deposited'))).toBeTruthy();
    });

    describe('moneyAccountWithdraw', () => {
      it.each([
        [TransactionStatus.confirmed, 'money.transaction.sent'],
        [TransactionStatus.submitted, 'money.transaction.sending'],
        [TransactionStatus.failed, 'money.transaction.send_failed'],
      ])('returns %s title for status', (status, titleKey) => {
        useTransactionDetailsMock.mockReturnValue({
          transactionMeta: {
            ...TRANSACTION_META_MOCK,
            type: TransactionType.moneyAccountWithdraw,
            status,
            metamaskPay: {
              tokenAddress: MUSD_TOKEN_ADDRESS,
              chainId: CHAIN_IDS.MONAD,
              targetFiat: '200.00',
            },
          } as unknown as TransactionMeta,
        });

        const { getByText } = render();

        expect(getByText(strings(titleKey))).toBeTruthy();
      });

      it('returns Sent for confirmed cross-token withdraw', () => {
        useTransactionDetailsMock.mockReturnValue({
          transactionMeta: {
            ...TRANSACTION_META_MOCK,
            type: TransactionType.moneyAccountWithdraw,
            status: TransactionStatus.confirmed,
            metamaskPay: {
              tokenAddress: '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
              chainId: CHAIN_ID_MOCK,
              targetFiat: '200.00',
            },
          } as unknown as TransactionMeta,
        });

        const { getByText } = render();

        expect(getByText(strings('money.transaction.sent'))).toBeTruthy();
      });
    });

    it('incoming transfer returns received', () => {
      useTransactionDetailsMock.mockReturnValue({
        transactionMeta: {
          ...TRANSACTION_META_MOCK,
          type: TransactionType.incoming,
          status: TransactionStatus.confirmed,
        } as unknown as TransactionMeta,
      });

      const { getByText } = render();

      expect(getByText(strings('money.transaction.received'))).toBeTruthy();
    });

    describe('simpleSend', () => {
      it.each([
        [TransactionStatus.confirmed, 'money.transaction.sent'],
        [TransactionStatus.submitted, 'money.transaction.sending'],
        [TransactionStatus.failed, 'money.transaction.send_failed'],
      ])('returns %s title for status', (status, titleKey) => {
        useTransactionDetailsMock.mockReturnValue({
          transactionMeta: {
            ...TRANSACTION_META_MOCK,
            type: TransactionType.simpleSend,
            status,
          } as unknown as TransactionMeta,
        });

        const { getByText } = render();

        expect(getByText(strings(titleKey))).toBeTruthy();
      });
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
