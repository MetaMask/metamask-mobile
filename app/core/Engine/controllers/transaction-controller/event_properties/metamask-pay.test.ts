import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { getMetaMaskPayProperties } from './metamask-pay';
import { TransactionMetricsBuilder } from '../types';
import { Hex } from '@metamask/utils';
import { RootState } from '../../../../../reducers';
import { NATIVE_TOKEN_ADDRESS } from '../../../../../components/Views/confirmations/constants/tokens';

const BATCH_ID_MOCK = '0x1234' as Hex;

describe('Metamask Pay Metrics', () => {
  const getStateMock: jest.MockedFn<
    Parameters<TransactionMetricsBuilder>[0]['getState']
  > = jest.fn();

  const getUIMetricsMock: jest.MockedFn<
    Parameters<TransactionMetricsBuilder>[0]['getUIMetrics']
  > = jest.fn();

  let request: Parameters<TransactionMetricsBuilder>[0];

  beforeEach(() => {
    jest.resetAllMocks();

    request = {
      transactionMeta: {
        id: 'child-1',
        txParams: { nonce: '0x1' },
      } as TransactionMeta,
      allTransactions: [],
      getUIMetrics: getUIMetricsMock,
      getState: getStateMock,
    };
  });

  it('returns nothing if perps_deposit', () => {
    request.transactionMeta.type = TransactionType.perpsDeposit;

    const result = getMetaMaskPayProperties(request);

    expect(result).toStrictEqual({
      properties: {},
      sensitiveProperties: {},
    });
  });

  it('copies properties from parent transaction if bridge', () => {
    getUIMetricsMock.mockReturnValue({
      properties: {
        mm_pay: true,
        mm_pay_use_case: 'test_use_case',
        mm_pay_transaction_step_total: 3,
      },
      sensitiveProperties: {},
    });

    request.allTransactions = [
      {
        id: 'parent-1',
        type: TransactionType.perpsDeposit,
        requiredTransactionIds: ['child-1'],
      } as TransactionMeta,
    ];

    const result = getMetaMaskPayProperties(request);

    expect(result).toStrictEqual({
      properties: expect.objectContaining({
        mm_pay: true,
        mm_pay_use_case: 'test_use_case',
        mm_pay_transaction_step_total: 3,
      }),
      sensitiveProperties: {},
    });
  });

  it('copies properties from parent transaction if swap', () => {
    getUIMetricsMock.mockReturnValue({
      properties: {
        mm_pay: true,
        mm_pay_use_case: 'test_use_case',
        mm_pay_transaction_step_total: 3,
      },
      sensitiveProperties: {},
    });

    request.transactionMeta.batchId = BATCH_ID_MOCK;

    request.allTransactions = [
      {
        id: 'parent-1',
        batchId: BATCH_ID_MOCK,
        txParams: { nonce: '0x2' },
        type: TransactionType.perpsDeposit,
      } as TransactionMeta,
    ];

    const result = getMetaMaskPayProperties(request);

    expect(result).toStrictEqual({
      properties: expect.objectContaining({
        mm_pay: true,
        mm_pay_use_case: 'test_use_case',
        mm_pay_transaction_step_total: 3,
      }),
      sensitiveProperties: {},
    });
  });

  it('adds step property if bridge', () => {
    request.allTransactions = [
      {
        id: 'parent-1',
        type: TransactionType.perpsDeposit,
        requiredTransactionIds: ['child-0', 'child-1'],
      } as TransactionMeta,
    ];

    const result = getMetaMaskPayProperties(request);

    expect(result).toStrictEqual({
      properties: expect.objectContaining({
        mm_pay_transaction_step: 2,
      }),
      sensitiveProperties: {},
    });
  });

  it('adds step property if swap', () => {
    request.transactionMeta.batchId = BATCH_ID_MOCK;

    request.allTransactions = [
      {
        id: 'child-0',
        batchId: BATCH_ID_MOCK,
        txParams: { nonce: '0x0' },
      } as TransactionMeta,
      {
        id: 'parent-1',
        batchId: BATCH_ID_MOCK,
        type: TransactionType.perpsDeposit,
        txParams: { nonce: '0x2' },
      } as TransactionMeta,
      request.transactionMeta,
    ];

    const result = getMetaMaskPayProperties(request);

    expect(result).toStrictEqual({
      properties: expect.objectContaining({
        mm_pay_transaction_step: 2,
      }),
      sensitiveProperties: {},
    });
  });

  it('adds quote properties if bridge', () => {
    request.transactionMeta.type = TransactionType.bridge;

    request.allTransactions = [
      {
        id: 'child-0',
        type: TransactionType.bridge,
      } as TransactionMeta,
      {
        id: 'parent-1',
        type: TransactionType.perpsDeposit,
        requiredTransactionIds: ['child-0', 'child-1'],
      } as TransactionMeta,
      request.transactionMeta,
    ];

    getStateMock.mockReturnValue({
      confirmationMetrics: {
        transactionBridgeQuotesById: {
          'parent-1': [
            {},
            {
              metrics: { attempts: 3, buffer: 0.123, latency: 1234 },
              quote: { bridgeId: 'testBridge' },
              request: {
                targetTokenAddress: '0x123',
              },
            },
          ],
        },
      },
    } as unknown as RootState);

    const result = getMetaMaskPayProperties(request);

    expect(result).toStrictEqual({
      properties: expect.objectContaining({
        mm_pay_bridge_provider: 'testBridge',
        mm_pay_quotes_attempts: 3,
        mm_pay_quotes_buffer_size: 0.123,
        mm_pay_quotes_latency: 1234,
      }),
      sensitiveProperties: {},
    });
  });

  it('adds quote properties if swap', () => {
    request.transactionMeta.batchId = BATCH_ID_MOCK;
    request.transactionMeta.type = TransactionType.swap;

    request.allTransactions = [
      {
        id: 'child-0',
        batchId: BATCH_ID_MOCK,
        type: TransactionType.swap,
        txParams: { nonce: '0x0' },
      } as TransactionMeta,
      {
        id: 'parent-1',
        batchId: BATCH_ID_MOCK,
        type: TransactionType.perpsDeposit,
        txParams: { nonce: '0x2' },
      } as TransactionMeta,
      request.transactionMeta,
    ];

    getStateMock.mockReturnValue({
      confirmationMetrics: {
        transactionBridgeQuotesById: {
          'parent-1': [
            {},
            {
              metrics: { attempts: 3, buffer: 0.123, latency: 1234 },
              quote: { bridgeId: 'testBridge' },
              request: {
                targetTokenAddress: '0x123',
              },
            },
          ],
        },
      },
    } as unknown as RootState);

    const result = getMetaMaskPayProperties(request);

    expect(result).toStrictEqual({
      properties: expect.objectContaining({
        mm_pay_bridge_provider: 'testBridge',
        mm_pay_quotes_attempts: 3,
        mm_pay_quotes_buffer_size: 0.123,
        mm_pay_quotes_latency: 1234,
      }),
      sensitiveProperties: {},
    });
  });

  it('adds dust property', () => {
    request.transactionMeta.type = TransactionType.bridge;

    getUIMetricsMock.mockReturnValue({
      properties: {
        mm_pay_dust_usd: '1.23',
      },
      sensitiveProperties: {},
    });

    request.allTransactions = [
      {
        id: 'child-0',
        type: TransactionType.bridge,
      } as TransactionMeta,
      {
        id: 'parent-1',
        type: TransactionType.perpsDeposit,
        requiredTransactionIds: ['child-0', 'child-1'],
      } as TransactionMeta,
      request.transactionMeta,
    ];

    getStateMock.mockReturnValue({
      confirmationMetrics: {
        transactionBridgeQuotesById: {
          'parent-1': [
            {},
            {
              metrics: { attempts: 3, buffer: 0.123, latency: 1234 },
              quote: { bridgeId: 'testBridge' },
              request: {
                targetTokenAddress: '0x123',
              },
            },
          ],
        },
      },
    } as unknown as RootState);

    const result = getMetaMaskPayProperties(request);

    expect(result).toStrictEqual({
      properties: expect.objectContaining({
        mm_pay_dust_usd: '1.23',
      }),
      sensitiveProperties: {},
    });
  });

  it('does not add dust property if native bridge', () => {
    request.transactionMeta.type = TransactionType.bridge;

    getUIMetricsMock.mockReturnValue({
      properties: {
        mm_pay_dust_usd: '1.23',
      },
      sensitiveProperties: {},
    });

    request.allTransactions = [
      {
        id: 'child-0',
        type: TransactionType.bridge,
      } as TransactionMeta,
      {
        id: 'parent-1',
        type: TransactionType.perpsDeposit,
        requiredTransactionIds: ['child-0', 'child-1'],
      } as TransactionMeta,
      request.transactionMeta,
    ];

    getStateMock.mockReturnValue({
      confirmationMetrics: {
        transactionBridgeQuotesById: {
          'parent-1': [
            {},
            {
              metrics: { attempts: 3, buffer: 0.123, latency: 1234 },
              quote: { bridgeId: 'testBridge' },
              request: {
                targetTokenAddress: NATIVE_TOKEN_ADDRESS,
              },
            },
          ],
        },
      },
    } as unknown as RootState);

    const result = getMetaMaskPayProperties(request);

    expect(result.properties.mm_pay_dust_usd).toBeUndefined();
  });
});
