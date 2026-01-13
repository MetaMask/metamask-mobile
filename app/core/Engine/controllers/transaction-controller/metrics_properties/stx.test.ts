import { TransactionMeta } from '@metamask/transaction-controller';

import { selectShouldUseSmartTransaction } from '../../../../../selectors/smartTransactionsController';
import { getSmartTransactionMetricsProperties } from '../../../../../util/smart-transactions';
import { TRANSACTION_EVENTS } from '../../../../Analytics/events/confirmations';
import { TransactionMetricsBuilderRequest } from '../types';
import { EMPTY_METRICS } from '../constants';
import { getStxMetricsProperties } from './stx';

jest.mock('../../../../../selectors/smartTransactionsController');
jest.mock('../../../../../util/smart-transactions');

const mockSelectShouldUseSmartTransaction = jest.mocked(
  selectShouldUseSmartTransaction,
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

  it('returns EMPTY_METRICS for non-finalized events', async () => {
    const request = createMockRequest('0x1', {
      eventType: TRANSACTION_EVENTS.TRANSACTION_ADDED,
    });

    const result = await getStxMetricsProperties(request);

    expect(result).toEqual(EMPTY_METRICS);
  });

  it('returns smart transaction metrics when smart transactions are enabled', async () => {
    mockSelectShouldUseSmartTransaction.mockReturnValue(true);
    mockGetSmartTransactionMetricsProperties.mockResolvedValue({
      is_smart_transaction: true,
      smart_transaction_timed_out: false,
      smart_transaction_proxied: true,
    });
    const request = createMockRequest('0x1');

    const result = await getStxMetricsProperties(request);

    expect(result).toEqual({
      properties: {
        is_smart_transaction: true,
        smart_transaction_timed_out: false,
        smart_transaction_proxied: true,
      },
      sensitiveProperties: {},
    });
  });

  it('returns EMPTY_METRICS when smart transactions are disabled', async () => {
    mockSelectShouldUseSmartTransaction.mockReturnValue(false);
    const request = createMockRequest('0x1');

    const result = await getStxMetricsProperties(request);

    expect(result).toEqual(EMPTY_METRICS);
  });

  it('returns EMPTY_METRICS when getSmartTransactionMetricsProperties throws', async () => {
    mockSelectShouldUseSmartTransaction.mockReturnValue(true);
    mockGetSmartTransactionMetricsProperties.mockRejectedValue(
      new Error('STX error'),
    );
    const request = createMockRequest('0x1');

    const result = await getStxMetricsProperties(request);

    expect(result).toEqual(EMPTY_METRICS);
  });

  it('calls selectShouldUseSmartTransaction with correct chainId', async () => {
    mockSelectShouldUseSmartTransaction.mockReturnValue(false);
    const request = createMockRequest('0x89');

    await getStxMetricsProperties(request);

    expect(mockSelectShouldUseSmartTransaction).toHaveBeenCalledWith(
      undefined,
      '0x89',
    );
  });
});
