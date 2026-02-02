import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { getMetaMaskPayProperties } from './metamask-pay';
import { TransactionMetrics, TransactionMetricsBuilder } from '../types';
import { Hex } from '@metamask/utils';
import { RootState } from '../../../../../reducers';
import { TransactionPayStrategy } from '@metamask/transaction-pay-controller';
import { merge } from 'lodash';
import { NATIVE_TOKEN_ADDRESS } from '../../../../../components/Views/confirmations/constants/tokens';
import { TRANSACTION_EVENTS } from '../../../../Analytics/events/confirmations';

const BATCH_ID_MOCK = '0x1234' as Hex;

const PAY_CONTROLLER_STATE_MOCK = {
  engine: {
    backgroundState: {
      TransactionPayController: {
        transactionData: {
          'parent-1': {
            quotes: [
              {},
              {
                original: {
                  metrics: { attempts: 3, buffer: 0.123, latency: 1234 },
                  quote: { bridgeId: 'testBridge' },
                },
                request: {
                  targetTokenAddress: '0x123',
                },
                strategy: TransactionPayStrategy.Bridge,
              },
            ],
          },
        },
      },
    },
  },
} as unknown as RootState;

const TOKEN_PAY_CONTROLLER_STATE_MOCK = merge({}, PAY_CONTROLLER_STATE_MOCK, {
  engine: {
    backgroundState: {
      TransactionPayController: {
        transactionData: {
          'parent-1': {
            quotes: [
              {},
              {
                original: {
                  metrics: undefined,
                  providerId: 'across',
                  quote: {
                    metrics: { latency: 2222 },
                  },
                },
                request: {
                  targetTokenAddress: '0x123',
                },
                strategy: TransactionPayStrategy.TokenPay,
              },
            ],
          },
        },
      },
    },
  },
}) as unknown as RootState;

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
      eventType: TRANSACTION_EVENTS.TRANSACTION_FINALIZED,
      transactionMeta: {
        id: 'child-1',
        txParams: { nonce: '0x1' },
      } as TransactionMeta,
      allTransactions: [],
      getUIMetrics: getUIMetricsMock,
      getState: getStateMock,
      initMessenger: {} as never,
      smartTransactionsController: {} as never,
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

    getStateMock.mockReturnValue(PAY_CONTROLLER_STATE_MOCK);

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

  it('adds token pay quote latency for bridge', () => {
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

    getStateMock.mockReturnValue(TOKEN_PAY_CONTROLLER_STATE_MOCK);

    const result = getMetaMaskPayProperties(request);

    expect(result).toStrictEqual({
      properties: expect.objectContaining({
        mm_pay_quotes_latency: 2222,
        mm_pay_strategy: 'across',
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

    getStateMock.mockReturnValue(PAY_CONTROLLER_STATE_MOCK);

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

    getStateMock.mockReturnValue(PAY_CONTROLLER_STATE_MOCK);

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

    getStateMock.mockReturnValue(
      merge({}, PAY_CONTROLLER_STATE_MOCK, {
        engine: {
          backgroundState: {
            TransactionPayController: {
              transactionData: {
                'parent-1': {
                  quotes: [
                    {},
                    {
                      request: {
                        targetTokenAddress: NATIVE_TOKEN_ADDRESS,
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      }) as unknown as RootState,
    );

    const result = getMetaMaskPayProperties(request) as TransactionMetrics;

    expect(result.properties.mm_pay_dust_usd).toBeUndefined();
  });

  it('sets polymarket_account_created as true if predict deposit and matching nested transaction', () => {
    request.transactionMeta.nestedTransactions = [
      { type: TransactionType.predictDeposit },
      { data: '0xa1884d2c1234' },
    ];

    const result = getMetaMaskPayProperties(request);

    expect(result).toStrictEqual({
      properties: {
        polymarket_account_created: true,
      },
      sensitiveProperties: {},
    });
  });

  it('sets polymarket_account_created as false if predict deposit with no matching nested transaction', () => {
    request.transactionMeta.nestedTransactions = [
      { type: TransactionType.predictDeposit },
      { data: '0xa1884d2d' },
    ];

    const result = getMetaMaskPayProperties(request);

    expect(result).toStrictEqual({
      properties: {
        polymarket_account_created: false,
      },
      sensitiveProperties: {},
    });
  });

  it('adds execution latency when available', () => {
    request.transactionMeta.metamaskPay = {
      executionLatencyMs: 400,
    };

    const result = getMetaMaskPayProperties(request);

    expect(result).toStrictEqual({
      properties: expect.objectContaining({
        mm_pay_execution_latency: 400,
      }),
      sensitiveProperties: {},
    });
  });

  it('generates fallback properties from transaction metadata', () => {
    request.transactionMeta.metamaskPay = {
      chainId: '0x3',
      tokenAddress: '0x123',
    };

    getStateMock.mockReturnValue({
      engine: {
        backgroundState: {
          TokensController: {
            allTokens: {
              '0x3': {
                '0x123': [
                  {
                    address: '0x123',
                    symbol: 'USDC',
                    decimals: 18,
                  },
                ],
              },
            },
          },
        },
      },
    } as never);

    const result = getMetaMaskPayProperties(request);

    expect(result).toStrictEqual({
      properties: expect.objectContaining({
        mm_pay: true,
        mm_pay_chain_selected: '0x3',
        mm_pay_token_selected: 'USDC',
      }),
      sensitiveProperties: {},
    });
  });

  it('does not include token symbol in fallback properties if token is not found', () => {
    request.transactionMeta.metamaskPay = {
      chainId: '0x3',
      tokenAddress: '0x123',
    };

    getStateMock.mockReturnValue({
      engine: {
        backgroundState: {
          TokensController: {
            allTokens: {},
          },
        },
      },
    } as never);

    const result = getMetaMaskPayProperties(request);

    expect(result).toStrictEqual({
      properties: expect.objectContaining({
        mm_pay: true,
        mm_pay_chain_selected: '0x3',
        mm_pay_token_selected: undefined,
      }),
      sensitiveProperties: {},
    });
  });
});
