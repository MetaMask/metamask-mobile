import { TransactionType } from '@metamask/transaction-controller';

import { TRANSACTION_EVENTS } from '../../../../Analytics/events/confirmations';
import { TransactionMetricsBuilderRequest } from '../types';
import { EMPTY_METRICS } from '../constants';
import { getSwapTransactionActiveAbTestProperties } from './swap-transaction-ab-tests';

const createMockRequest = (
  overrides: Partial<TransactionMetricsBuilderRequest> = {},
): TransactionMetricsBuilderRequest => ({
  eventType: TRANSACTION_EVENTS.TRANSACTION_ADDED,
  transactionMeta: { type: TransactionType.swap } as never,
  allTransactions: [],
  getUIMetrics: () => EMPTY_METRICS,
  getState: jest.fn(() => ({
    bridge: {
      transactionActiveAbTests: [
        { key: 'homepageAbtestTrendingSections', value: 'trendingSections' },
      ],
    },
  })) as unknown as TransactionMetricsBuilderRequest['getState'],
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
      transactionMeta: { type: TransactionType.simpleSend } as never,
    });

    expect(getSwapTransactionActiveAbTestProperties(request)).toEqual({
      properties: {},
      sensitiveProperties: {},
    });
  });

  it('returns empty when bridge has no transactionActiveAbTests', () => {
    const request = createMockRequest({
      getState: jest.fn(() => ({ bridge: {} })) as never,
    });

    expect(getSwapTransactionActiveAbTestProperties(request)).toEqual({
      properties: {},
      sensitiveProperties: {},
    });
  });

  it('returns active_ab_tests for swap Transaction Added', () => {
    const abTests = [
      { key: 'homepageAbtestTrendingSections', value: 'trendingSections' },
    ];
    const request = createMockRequest({
      getState: jest.fn(() => ({
        bridge: { transactionActiveAbTests: abTests },
      })) as never,
    });

    expect(getSwapTransactionActiveAbTestProperties(request)).toEqual({
      properties: { active_ab_tests: abTests },
      sensitiveProperties: {},
    });
  });

  it('returns active_ab_tests for perps deposit Transaction Added', () => {
    const abTests = [
      { key: 'homepageAbtestTrendingSections', value: 'trendingSections' },
    ];
    const request = createMockRequest({
      transactionMeta: { type: TransactionType.perpsDeposit } as never,
      getState: jest.fn(() => ({
        bridge: { transactionActiveAbTests: abTests },
      })) as never,
    });

    expect(getSwapTransactionActiveAbTestProperties(request)).toEqual({
      properties: { active_ab_tests: abTests },
      sensitiveProperties: {},
    });
  });
});
