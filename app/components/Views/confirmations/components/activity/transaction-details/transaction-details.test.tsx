import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import {
  TransactionDetails,
  SUMMARY_SECTION_TYPES,
} from './transaction-details';
import { merge } from 'lodash';
import { otherControllersMock } from '../../../__mocks__/controllers/other-controllers-mock';
import { strings } from '../../../../../../../locales/i18n';

jest.mock('../../../hooks/activity/useTransactionDetails');
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

const mockSetOptions = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    setOptions: mockSetOptions,
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
  });

  describe('getTitle', () => {
    it('returns musd_conversion title for musdConversion type', () => {
      useTransactionDetailsMock.mockReturnValue({
        transactionMeta: {
          ...TRANSACTION_META_MOCK,
          type: TransactionType.musdConversion,
        } as unknown as TransactionMeta,
      });

      render();

      expect(mockSetOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          title: strings('transaction_details.title.musd_conversion'),
        }),
      );
    });

    it('returns perps_deposit title for perpsDeposit type', () => {
      useTransactionDetailsMock.mockReturnValue({
        transactionMeta: {
          ...TRANSACTION_META_MOCK,
          type: TransactionType.perpsDeposit,
        } as unknown as TransactionMeta,
      });

      render();

      expect(mockSetOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          title: strings('transaction_details.title.perps_deposit'),
        }),
      );
    });

    it('returns predict_claim title for predictClaim type', () => {
      useTransactionDetailsMock.mockReturnValue({
        transactionMeta: {
          ...TRANSACTION_META_MOCK,
          nestedTransactions: [{ type: TransactionType.predictClaim }],
        } as unknown as TransactionMeta,
      });

      render();

      expect(mockSetOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          title: strings('transaction_details.title.predict_claim'),
        }),
      );
    });

    it('returns predict_deposit title for predictDeposit type', () => {
      useTransactionDetailsMock.mockReturnValue({
        transactionMeta: {
          ...TRANSACTION_META_MOCK,
          nestedTransactions: [{ type: TransactionType.predictDeposit }],
        } as unknown as TransactionMeta,
      });

      render();

      expect(mockSetOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          title: strings('transaction_details.title.predict_deposit'),
        }),
      );
    });

    it('returns predict_withdraw title for predictWithdraw type', () => {
      useTransactionDetailsMock.mockReturnValue({
        transactionMeta: {
          ...TRANSACTION_META_MOCK,
          nestedTransactions: [{ type: TransactionType.predictWithdraw }],
        } as unknown as TransactionMeta,
      });

      render();

      expect(mockSetOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          title: strings('transaction_details.title.predict_withdraw'),
        }),
      );
    });

    it('returns default title for other transaction types', () => {
      render();

      expect(mockSetOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          title: strings('transaction_details.title.default'),
        }),
      );
    });

    it('configures navigation with back arrow on left instead of close button on right', () => {
      render();

      const navOptions = mockSetOptions.mock.calls[0][0];
      expect(navOptions.headerLeft).toBeDefined();
      expect(navOptions.headerRight()).toBeNull();
    });
  });

  describe('SUMMARY_SECTION_TYPES', () => {
    it.each([
      TransactionType.musdConversion,
      TransactionType.perpsDeposit,
      TransactionType.predictDeposit,
    ])('includes %s', (type) => {
      expect(SUMMARY_SECTION_TYPES).toContain(type);
    });

    it('contains exactly 3 transaction types', () => {
      expect(SUMMARY_SECTION_TYPES).toHaveLength(3);
    });
  });
});
