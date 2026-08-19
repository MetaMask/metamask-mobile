import { TransactionMeta } from '@metamask/transaction-controller';
import { OriginalTransactionStatus } from '@metamask/smart-transactions-controller';

import {
  selectShouldUseSmartTransaction,
  selectSmartTransactionsEnabled,
} from '../../../../../selectors/smartTransactionsController';
import { selectSmartTransactionsOptInStatus } from '../../../../../selectors/preferencesController';
import { getSmartTransactionMetricsProperties } from '../../../../../util/smart-transactions';
import { TRANSACTION_EVENTS } from '../../../../Analytics/events/confirmations';
import { TransactionMetricsBuilderRequest } from '../types';
import { EMPTY_METRICS } from '../constants';
import { getStxMetricsProperties } from './stx';

jest.mock('../../../../../selectors/smartTransactionsController');
jest.mock('../../../../../selectors/preferencesController');
jest.mock('../../../../../util/smart-transactions');

const mockSelectShouldUseSmartTransaction = jest.mocked(
  selectShouldUseSmartTransaction,
);
const mockSelectSmartTransactionsEnabled = jest.mocked(
  selectSmartTransactionsEnabled,
);
const mockSelectSmartTransactionsOptInStatus = jest.mocked(
  selectSmartTransactionsOptInStatus,
);
const mockGetSmartTransactionMetricsProperties = jest.mocked(
  getSmartTransactionMetricsProperties,
);

const createMockRequest = (
  chainId: string,
  overrides: Partial<TransactionMetricsBuilderRequest> = {},
): TransactionMetricsBuilderRequest => ({
  eventType: TRANSACTION_EVENTS.TRANSACTION_FINALIZED,
  transactionMeta: { chainId } as TransactionMeta,
  allTransactions: [],
  getUIMetrics: () => EMPTY_METRICS,
  getState: jest.fn() as TransactionMetricsBuilderRequest['getState'],
  initMessenger: {} as never,
  smartTransactionsController: {} as never,
  ...overrides,
});

describe('getStxMetricsProperties', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when smart transaction metrics are skipped', () => {
    it('returns only base STX flags when shouldUseSmartTransaction is false', async () => {
      mockSelectShouldUseSmartTransaction.mockReturnValue(false);
      mockSelectSmartTransactionsOptInStatus.mockReturnValue(true);
      mockSelectSmartTransactionsEnabled.mockReturnValue(true);

      const request = createMockRequest('0x1');

      const result = await getStxMetricsProperties(request);

      expect(result).toEqual({
        properties: {
          is_smart_transactions_user_opt_in: true,
          is_smart_transactions_available: true,
          is_smart_transaction: false,
        },
        sensitiveProperties: {},
      });
      expect(mockGetSmartTransactionMetricsProperties).not.toHaveBeenCalled();
    });

    it('returns only base STX flags when event is not finalized', async () => {
      mockSelectShouldUseSmartTransaction.mockReturnValue(true);
      mockSelectSmartTransactionsOptInStatus.mockReturnValue(false);
      mockSelectSmartTransactionsEnabled.mockReturnValue(false);

      const request = createMockRequest('0x1', {
        eventType: TRANSACTION_EVENTS.TRANSACTION_ADDED,
      });

      const result = await getStxMetricsProperties(request);

      expect(result).toEqual({
        properties: {
          is_smart_transactions_user_opt_in: false,
          is_smart_transactions_available: false,
          is_smart_transaction: true,
        },
        sensitiveProperties: {},
      });
      expect(mockGetSmartTransactionMetricsProperties).not.toHaveBeenCalled();
    });
  });

  describe('when smart transaction metrics are fetched', () => {
    it('returns properties from getSmartTransactionMetricsProperties when STX is used and event is finalized', async () => {
      mockSelectShouldUseSmartTransaction.mockReturnValue(true);
      mockSelectSmartTransactionsOptInStatus.mockReturnValue(true);
      mockSelectSmartTransactionsEnabled.mockReturnValue(true);
      mockGetSmartTransactionMetricsProperties.mockResolvedValue({
        is_smart_transactions_user_opt_in: true,
        is_smart_transactions_available: true,
        is_smart_transaction: true,
        stx_original_transaction_status: OriginalTransactionStatus.VALIDATED,
      });

      const request = createMockRequest('0x1');

      const result = await getStxMetricsProperties(request);

      expect(result).toEqual({
        properties: {
          is_smart_transactions_user_opt_in: true,
          is_smart_transactions_available: true,
          is_smart_transaction: true,
          stx_original_transaction_status: OriginalTransactionStatus.VALIDATED,
        },
        sensitiveProperties: {},
      });
      expect(mockGetSmartTransactionMetricsProperties).toHaveBeenCalledTimes(1);
    });

    it('calls getSmartTransactionMetricsProperties with true as waitForSmartTransaction', async () => {
      mockSelectShouldUseSmartTransaction.mockReturnValue(true);
      mockSelectSmartTransactionsOptInStatus.mockReturnValue(true);
      mockSelectSmartTransactionsEnabled.mockReturnValue(true);
      mockGetSmartTransactionMetricsProperties.mockResolvedValue({
        is_smart_transactions_user_opt_in: true,
        is_smart_transactions_available: true,
        is_smart_transaction: true,
      });

      const request = createMockRequest('0x1');

      await getStxMetricsProperties(request);

      expect(mockGetSmartTransactionMetricsProperties).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        true,
        expect.anything(),
        true,
        true,
        true,
      );
    });
  });

  describe('when an error occurs', () => {
    it('returns EMPTY_METRICS when getSmartTransactionMetricsProperties rejects', async () => {
      mockSelectShouldUseSmartTransaction.mockReturnValue(true);
      mockSelectSmartTransactionsOptInStatus.mockReturnValue(true);
      mockSelectSmartTransactionsEnabled.mockReturnValue(true);
      mockGetSmartTransactionMetricsProperties.mockRejectedValue(
        new Error('STX error'),
      );
      const request = createMockRequest('0x1');

      const result = await getStxMetricsProperties(request);

      expect(result).toEqual(EMPTY_METRICS);
    });

    it('returns EMPTY_METRICS when getState throws', async () => {
      const getState = jest.fn().mockImplementation(() => {
        throw new Error('state error');
      });
      const request = createMockRequest('0x1', { getState });

      const result = await getStxMetricsProperties(request);

      expect(result).toEqual(EMPTY_METRICS);
      expect(mockGetSmartTransactionMetricsProperties).not.toHaveBeenCalled();
    });
  });

  it('calls selectors with correct state and chainId', async () => {
    mockSelectShouldUseSmartTransaction.mockReturnValue(false);
    mockSelectSmartTransactionsOptInStatus.mockReturnValue(false);
    mockSelectSmartTransactionsEnabled.mockReturnValue(false);
    const mockState = { some: 'state' };
    const getState = jest.fn().mockReturnValue(mockState);
    const request = createMockRequest('0x89', { getState });

    await getStxMetricsProperties(request);

    expect(mockSelectSmartTransactionsOptInStatus).toHaveBeenCalledWith(
      mockState,
    );
    expect(mockSelectSmartTransactionsEnabled).toHaveBeenCalledWith(
      mockState,
      '0x89',
    );
    expect(mockSelectShouldUseSmartTransaction).toHaveBeenCalledWith(
      mockState,
      '0x89',
    );
  });
});
