import { TransactionType } from '@metamask/transaction-controller';

import { TRANSACTION_EVENTS } from '../../../../Analytics/events/confirmations';
import { TransactionMetricsBuilderRequest } from '../types';
import { EMPTY_METRICS } from '../constants';
import { getSwapTransactionActiveAbTestProperties } from './swap-transaction-ab-tests';
import { registerTransactionAbTestAttributionForIds } from '../../../../../util/transactions/transaction-active-ab-test-attribution-registry';

const TX_ID = 'test-swap-tx-meta-id';

const createMockRequest = (
  overrides: Partial<TransactionMetricsBuilderRequest> = {},
): TransactionMetricsBuilderRequest => ({
  eventType: TRANSACTION_EVENTS.TRANSACTION_ADDED,
  transactionMeta: {
    id: TX_ID,
    type: TransactionType.swap,
  } as never,
  allTransactions: [],
  getUIMetrics: () => EMPTY_METRICS,
  getState: jest.fn(
    () => ({}),
  ) as unknown as TransactionMetricsBuilderRequest['getState'],
  initMessenger: {} as never,
  smartTransactionsController: {} as never,
  ...overrides,
});

describe('getSwapTransactionActiveAbTestProperties', () => {
  it('returns empty when event is not Transaction Added', () => {
    const request = createMockRequest({
      eventType: TRANSACTION_EVENTS.TRANSACTION_SUBMITTED,
    });

    expect(getSwapTransactionActiveAbTestProperties(request)).toEqual({
      properties: {},
      sensitiveProperties: {},
    });
  });

  it('returns empty when transaction type is not eligible for staged AB tests', () => {
    const request = createMockRequest({
      transactionMeta: { id: TX_ID, type: TransactionType.simpleSend } as never,
    });

    expect(getSwapTransactionActiveAbTestProperties(request)).toEqual({
      properties: {},
      sensitiveProperties: {},
    });
  });

  it('returns empty when no tx-scoped attribution was registered', () => {
    const request = createMockRequest({
      transactionMeta: { id: 'other-id', type: TransactionType.swap } as never,
    });

    expect(getSwapTransactionActiveAbTestProperties(request)).toEqual({
      properties: {},
      sensitiveProperties: {},
    });
  });

  it('returns active_ab_tests for swap Transaction Added', () => {
    const abTests = [
      { key: 'homeTMCU470AbtestTrendingSections', value: 'trendingSections' },
    ];
    registerTransactionAbTestAttributionForIds([TX_ID], abTests);
    const request = createMockRequest();

    expect(getSwapTransactionActiveAbTestProperties(request)).toEqual({
      properties: { active_ab_tests: abTests },
      sensitiveProperties: {},
    });
  });

  it('returns active_ab_tests for perps deposit Transaction Added', () => {
    const abTests = [
      { key: 'homeTMCU470AbtestTrendingSections', value: 'trendingSections' },
    ];
    registerTransactionAbTestAttributionForIds([TX_ID], abTests);
    const request = createMockRequest({
      transactionMeta: {
        id: TX_ID,
        type: TransactionType.perpsDeposit,
      } as never,
    });

    expect(getSwapTransactionActiveAbTestProperties(request)).toEqual({
      properties: { active_ab_tests: abTests },
      sensitiveProperties: {},
    });
  });
});
