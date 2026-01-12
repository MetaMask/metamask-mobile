import { TransactionMeta } from '@metamask/transaction-controller';

import { selectIsPna25FlagEnabled } from '../../../../../selectors/featureFlagController/legalNotices';
import { selectIsPna25Acknowledged } from '../../../../../selectors/legalNotices';
import { TRANSACTION_EVENTS } from '../../../../Analytics/events/confirmations';
import { TransactionMetricsBuilderRequest } from '../types';
import { EMPTY_METRICS } from '../constants';
import { getHashMetricsProperties } from './hash';

jest.mock('../../../../../selectors/featureFlagController/legalNotices');
jest.mock('../../../../../selectors/legalNotices');

const mockSelectIsPna25FlagEnabled = jest.mocked(selectIsPna25FlagEnabled);
const mockSelectIsPna25Acknowledged = jest.mocked(selectIsPna25Acknowledged);

const createMockRequest = (
  hash: string,
  overrides: Partial<TransactionMetricsBuilderRequest> = {},
): TransactionMetricsBuilderRequest => ({
  eventType: TRANSACTION_EVENTS.TRANSACTION_FINALIZED,
  transactionMeta: { hash } as TransactionMeta,
  allTransactions: [],
  getUIMetrics: () => EMPTY_METRICS,
  getState: jest.fn() as TransactionMetricsBuilderRequest['getState'],
  initMessenger: {} as never,
  smartTransactionsController: {} as never,
  ...overrides,
});

describe('getHashMetricsProperties', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns EMPTY_METRICS for non-finalized events', () => {
    const request = createMockRequest('0xabc123', {
      eventType: TRANSACTION_EVENTS.TRANSACTION_ADDED,
    });

    const result = getHashMetricsProperties(request);

    expect(result).toEqual(EMPTY_METRICS);
  });

  it('returns transaction_hash when PNA25 flag is enabled and acknowledged', () => {
    mockSelectIsPna25FlagEnabled.mockReturnValue(true);
    mockSelectIsPna25Acknowledged.mockReturnValue(true);
    const request = createMockRequest('0xabc123');

    const result = getHashMetricsProperties(request);

    expect(result).toEqual({
      properties: { transaction_hash: '0xabc123' },
      sensitiveProperties: {},
    });
  });

  it('returns undefined transaction_hash when PNA25 flag is disabled', () => {
    mockSelectIsPna25FlagEnabled.mockReturnValue(false);
    mockSelectIsPna25Acknowledged.mockReturnValue(true);
    const request = createMockRequest('0xabc123');

    const result = getHashMetricsProperties(request);

    expect(result).toEqual({
      properties: { transaction_hash: undefined },
      sensitiveProperties: {},
    });
  });

  it('returns undefined transaction_hash when PNA25 is not acknowledged', () => {
    mockSelectIsPna25FlagEnabled.mockReturnValue(true);
    mockSelectIsPna25Acknowledged.mockReturnValue(false);
    const request = createMockRequest('0xabc123');

    const result = getHashMetricsProperties(request);

    expect(result).toEqual({
      properties: { transaction_hash: undefined },
      sensitiveProperties: {},
    });
  });

  it('returns undefined transaction_hash when both PNA25 conditions are false', () => {
    mockSelectIsPna25FlagEnabled.mockReturnValue(false);
    mockSelectIsPna25Acknowledged.mockReturnValue(false);
    const request = createMockRequest('0xabc123');

    const result = getHashMetricsProperties(request);

    expect(result).toEqual({
      properties: { transaction_hash: undefined },
      sensitiveProperties: {},
    });
  });
});
